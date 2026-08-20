const GHL_AUDIT_WEBHOOK = "https://services.leadconnectorhq.com/hooks/J9svmFaKnsH9r8T04I0D/webhook-trigger/dce8189c-7b35-444d-bea6-e2b38641512c";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const name = String(body.name || body.fullName || "").trim();
    const email = String(body.email || "").trim();
    const phone = String(body.phone || "").trim();
    if (!name || (!email && !phone)) return res.status(400).json({ ok: false, error: "Missing contact details" });
    const payload = { ...body, name, email, phone, source: "Marketizo Brand Audit", tags: ["marketizo-brand-audit"], audit_tag: "marketizo-brand-audit" };
    const response = await fetch(GHL_AUDIT_WEBHOOK, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      console.error("GHL webhook rejected the lead", (await response.text()).slice(0, 300));
      return res.status(502).json({ ok: false, error: "CRM trenutno nije dostupan." });
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false, error: "CRM request failed" });
  }
};
