const GHL_API = "https://services.leadconnectorhq.com";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const token = process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;
  const auditTag = process.env.GHL_AUDIT_TAG || "marketizo-brand-audit";
  if (!token || !locationId) return res.status(503).json({ ok: false, error: "CRM integration is not configured" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const name = String(body.name || body.fullName || "").trim();
    const email = String(body.email || "").trim();
    const phone = String(body.phone || "").trim();
    if (!name || (!email && !phone)) return res.status(400).json({ ok: false, error: "Missing contact details" });

    const payload = {
      locationId,
      name,
      email: email || undefined,
      phone: phone || undefined,
      source: "Marketizo Brand Audit",
      tags: [auditTag],
      customFields: [],
    };

    const response = await fetch(GHL_API + "/contacts/upsert", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        Version: "2021-07-28",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(502).json({ ok: false, error: result.message || "GHL rejected the contact" });

    const contactId = result.contact?.id || result.id;
    if (contactId) {
      await fetch(GHL_API + "/contacts/" + contactId + "/tags", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          Version: "2021-07-28",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ tags: [auditTag] }),
      }).catch(() => null);
    }

    return res.status(200).json({ ok: true, contactId: contactId || null });
  } catch (error) {
    return res.status(500).json({ ok: false, error: "CRM request failed" });
  }
};
