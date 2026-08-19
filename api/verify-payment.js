export const config = { maxDuration: 30 };

const clean = (value, max = 500) => (typeof value === "string" ? value.trim().slice(0, max) : "");

const stripeGet = (path, secret) =>
  fetch("https://api.stripe.com/v1" + path, {
    headers: { Authorization: "Bearer " + secret },
    signal: AbortSignal.timeout(15000),
  });

const isPaid = (session) =>
  Boolean(session) && session.payment_status === "paid" && session.status === "complete";

// Minimalni iznos se čita iz Vercel-a (u centima), da promena cene ne obori proveru.
// MARKETIZO_AUDIT_MIN_AMOUNT=100 znači "najmanje 1 €". Ako nije podešeno, iznos se ne proverava.
function amountOk(session) {
  const min = Number(process.env.MARKETIZO_AUDIT_MIN_AMOUNT || 0);
  if (!min) return true;
  return Number(session.amount_total) >= min;
}

// Rezerva: ako se klijent vratio bez potvrde u linku, tražimo njegovu uplatu
// među poslednjim uplatama sa istog Stripe Payment Link-a.
async function findByAuditId(auditId, secret) {
  const paymentLink = process.env.MARKETIZO_STRIPE_PAYMENT_LINK_ID;
  if (!auditId || !paymentLink) return null;
  const response = await stripeGet(
    "/checkout/sessions?limit=100&payment_link=" + encodeURIComponent(paymentLink),
    secret
  );
  if (!response.ok) return null;
  const payload = await response.json().catch(() => ({}));
  if (!Array.isArray(payload.data)) return null;
  return payload.data.find((item) => item.client_reference_id === auditId && isPaid(item)) || null;
}

async function tagPaidLeadInGhl(lead) {
  const token = process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;
  const email = clean(lead?.email, 200).toLowerCase();
  if (!token || !locationId || !email) return;

  await fetch("https://services.leadconnectorhq.com/contacts/upsert", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      Version: "2021-07-28",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      locationId,
      email,
      name: clean(lead.name, 120),
      phone: clean(lead.phone, 50),
      companyName: clean(lead.business, 120),
      city: clean(lead.location, 120),
      source: "Marketizo Brand Audit",
      tags: ["marketizo-brand-audit", "audit-lead", "audit-paid"],
    }),
    signal: AbortSignal.timeout(12000),
  }).catch(() => null);
}

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return response.status(503).json({ paid: false, error: "Provera uplate još nije povezana." });

  const sessionId = clean(request.body?.sessionId, 300);
  const auditId = clean(request.body?.auditId, 100);
  if (!auditId) return response.status(400).json({ paid: false, error: "Nedostaje oznaka analize." });

  let session = null;

  if (sessionId.startsWith("cs_")) {
    const stripeResponse = await stripeGet("/checkout/sessions/" + encodeURIComponent(sessionId), secret);
    if (stripeResponse.ok) session = await stripeResponse.json().catch(() => null);
  }

  if (!isPaid(session)) session = await findByAuditId(auditId, secret);

  if (!isPaid(session)) {
    return response.status(402).json({ paid: false, error: "Uplata za ovaj audit nije potvrđena." });
  }

  // Uplata mora da pripada baš ovoj analizi.
  if (session.client_reference_id && session.client_reference_id !== auditId) {
    return response.status(409).json({ paid: false, error: "Uplata pripada drugoj analizi." });
  }

  if (!amountOk(session)) {
    return response.status(402).json({ paid: false, error: "Iznos uplate ne odgovara ovom auditu." });
  }

  await tagPaidLeadInGhl(request.body?.lead || {});

  return response.status(200).json({
    paid: true,
    auditId,
    amount: typeof session.amount_total === "number" ? session.amount_total / 100 : null,
    currency: String(session.currency || "eur").toUpperCase(),
    customerEmail: session.customer_details?.email || "",
  });
}
