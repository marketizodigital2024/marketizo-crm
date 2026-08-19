export const config = { maxDuration: 30 };

const clean = (value, max = 500) => typeof value === "string" ? value.trim().slice(0, max) : "";

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return response.status(503).json({ error: "Provera uplate još nije povezana." });

  const sessionId = clean(request.body?.sessionId, 300);
  const auditId = clean(request.body?.auditId, 100);
  if (!sessionId || !auditId || !sessionId.startsWith("cs_")) return response.status(400).json({ error: "Nedostaje validna potvrda uplate." });

  const stripeResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(15000),
  });
  const session = await stripeResponse.json().catch(() => ({}));
  if (!stripeResponse.ok) return response.status(402).json({ error: "Stripe nije potvrdio uplatu." });

  const paid = session.payment_status === "paid" && session.status === "complete";
  const correctAudit = !session.client_reference_id || session.client_reference_id === auditId;
  const correctAmount = Number(session.amount_total) === 100 && String(session.currency || "").toLowerCase() === "eur";
  if (!paid || !correctAudit || !correctAmount) return response.status(402).json({ paid: false, error: "Uplata za ovaj audit nije potvrđena." });

  const lead = request.body?.lead || {};
  const ghlToken = process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;
  if (ghlToken && locationId && clean(lead.email, 200)) {
    await fetch("https://services.leadconnectorhq.com/contacts/upsert", {
      method: "POST",
      headers: { Authorization: `Bearer ${ghlToken}`, Version: "2021-07-28", "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        locationId,
        name: clean(lead.name, 120),
        email: clean(lead.email, 200).toLowerCase(),
        phone: clean(lead.phone, 50),
        companyName: clean(lead.business, 120),
        city: clean(lead.location, 120),
        source: "Marketizo Brand Audit",
        tags: ["marketizo-brand-audit", "audit-lead", "audit-paid"],
      }),
      signal: AbortSignal.timeout(12000),
    }).catch(() => null);
  }

  return response.status(200).json({ paid: true, auditId, customerEmail: session.customer_details?.email || "" });
}
