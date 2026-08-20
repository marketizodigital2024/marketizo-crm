export const config = { maxDuration: 30 };

// Ovde se izdaje pun izvestaj. Bez potvrdjene uplate za bas ovu analizu
// server ne vraca ni prioritete, ni ocene, ni ideje.

const AUDIT_TABLE = process.env.MARKETIZO_AUDIT_TABLE || "marketizo_audits";

const clean = (value, max = 300) => (typeof value === "string" ? value.trim().slice(0, max) : "");

function store() {
  const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return null;
  return { url, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" } };
}

const stripeGet = (path, secret) =>
  fetch("https://api.stripe.com/v1" + path, {
    headers: { Authorization: "Bearer " + secret },
    signal: AbortSignal.timeout(15000),
  });

const isPaid = (session) =>
  Boolean(session) && session.payment_status === "paid" && session.status === "complete";

function amountOk(session) {
  const min = Number(process.env.MARKETIZO_AUDIT_MIN_AMOUNT || 0);
  if (!min) return true;
  return Number(session.amount_total) >= min;
}

// Rezerva kada se klijent vrati bez oznake sesije, na primer preko linka iz mejla
// ili sa drugog uredjaja: uplatu trazimo po oznaci analize.
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

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });

  const db = store();
  if (!db) return response.status(503).json({ paid: false, error: "Čuvanje analize još nije povezano." });

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return response.status(503).json({ paid: false, error: "Provera uplate još nije povezana." });

  const auditId = clean(request.body?.auditId, 100);
  const sessionId = clean(request.body?.sessionId, 300);
  if (!auditId) return response.status(400).json({ paid: false, error: "Nedostaje oznaka analize." });

  let session = null;
  try {
    if (sessionId.startsWith("cs_")) {
      const stripeResponse = await stripeGet("/checkout/sessions/" + encodeURIComponent(sessionId), secret);
      if (stripeResponse.ok) session = await stripeResponse.json().catch(() => null);
    }
    if (!isPaid(session) || session.client_reference_id !== auditId) session = await findByAuditId(auditId, secret);
  } catch (error) {
    console.error("Stripe lookup failed", error?.message);
    return response.status(503).json({ paid: false, retry: true, error: "Trenutno ne možemo da proverimo uplatu. Pokušaj za nekoliko sekundi." });
  }

  if (!isPaid(session) || session.client_reference_id !== auditId) {
    return response.status(402).json({ paid: false, error: "Uplata za ovu analizu nije potvrđena." });
  }
  if (!amountOk(session)) {
    return response.status(402).json({ paid: false, error: "Iznos uplate ne odgovara ovoj analizi." });
  }

  let row = null;
  try {
    const stored = await fetch(
      `${db.url}/rest/v1/${AUDIT_TABLE}?id=eq.${encodeURIComponent(auditId)}&select=audit,evidence,lead`,
      { headers: db.headers, signal: AbortSignal.timeout(12000) }
    );
    if (stored.ok) row = (await stored.json().catch(() => []))[0] || null;
  } catch (error) {
    console.error("Audit store read failed", error?.message);
  }

  if (!row || !row.audit) {
    return response.status(404).json({ paid: true, error: "Analiza nije pronađena. Javi nam se i poslaćemo je ručno." });
  }

  const lead = row.lead || {};
  return response.status(200).json({
    paid: true,
    auditId,
    audit: row.audit,
    evidence: Array.isArray(row.evidence) ? row.evidence : [],
    lead: { name: clean(lead.name, 120), business: clean(lead.business, 120), location: clean(lead.location, 120) },
  });
}
