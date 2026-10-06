function json(response, status, payload) {
  response.status(status).json(payload);
}

function clean(value, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export default async function handler(request, response) {
  if (request.method !== "POST") return json(response, 405, { error: "Method not allowed" });

  const token = process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!token || !locationId) return json(response, 503, { error: "GHL integracija još nije povezana." });

  const lead = request.body || {};
  const name = clean(lead.name, 120);
  const email = clean(lead.email, 200).toLowerCase();
  const phone = clean(lead.phone, 50);
  if (!name || !email || !phone) return json(response, 400, { error: "Nedostaju kontakt podaci." });

  const ghlResponse = await fetch("https://services.leadconnectorhq.com/contacts/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Version: "2021-07-28",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      locationId,
      name,
      email,
      phone,
      companyName: clean(lead.business, 120),
      city: clean(lead.location, 120),
      source: "Marketizo Brand Audit",
      tags: ["marketizo-brand-audit", "audit-lead"],
    }),
  });

  const payload = await ghlResponse.json().catch(() => ({}));
  if (!ghlResponse.ok) return json(response, ghlResponse.status, { error: "Kontakt nije dodat u GHL.", details: payload });
  return json(response, 200, { ok: true, contactId: payload.contact?.id || payload.id || "" });
}
