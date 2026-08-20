export const config = { maxDuration: 20 };

// Isti GHL webhook koji koristi api/lead.js. Ovde saljemo i sadrzaj analize,
// da se u GoHighLevel-u moze poslati mejl sa stvarnim nalazima, a ne samo obavestenje.
const GHL_AUDIT_WEBHOOK =
  "https://services.leadconnectorhq.com/hooks/J9svmFaKnsH9r8T04I0D/webhook-trigger/dce8189c-7b35-444d-bea6-e2b38641512c";

const clean = (value, max = 500) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");

const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

function normalizeCards(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((card) => ({ label: clean(card?.label, 60), title: clean(card?.title, 220), body: clean(card?.body, 900) }))
    .filter((card) => card.title && card.body)
    .slice(0, 6);
}

function emailHtml({ firstName, score, headline, offerRead, cards, reportUrl }) {
  const items = cards
    .map(
      (card) => `
        <tr><td style="padding:0 0 22px">
          <div style="font:700 11px/1.4 Arial,sans-serif;letter-spacing:.12em;color:#ff7900">${esc(card.label || "NALAZ")}</div>
          <div style="font:700 17px/1.4 Arial,sans-serif;color:#111;margin:6px 0 8px">${esc(card.title)}</div>
          <div style="font:400 15px/1.65 Arial,sans-serif;color:#444">${esc(card.body)}</div>
        </td></tr>`
    )
    .join("");

  return `<!doctype html><html lang="sr"><body style="margin:0;background:#f4f4f5;padding:28px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fff;border-radius:18px;overflow:hidden;border:1px solid #e6e6e6">
    <tr><td style="background:#111;padding:22px 28px">
      <div style="font:900 15px/1.2 Arial,sans-serif;letter-spacing:.09em;color:#fff"><span style="color:#ff7900">M</span>ARKETIZO <span style="color:#ff7900">&bull;</span> BRAND AUDIT</div>
    </td></tr>
    <tr><td style="padding:30px 28px 6px">
      <div style="font:400 16px/1.6 Arial,sans-serif;color:#111">Zdravo ${esc(firstName)},</div>
      <div style="font:400 16px/1.65 Arial,sans-serif;color:#444;margin-top:10px">pregledali smo tvoj profil i analiza je spremna. Evo kako je ispalo.</div>
    </td></tr>
    <tr><td style="padding:22px 28px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f4;border:1px solid #eee;border-radius:14px">
        <tr><td style="padding:20px 22px">
          <div style="font:700 11px/1.4 Arial,sans-serif;letter-spacing:.12em;color:#8a8a8a">OCENA PROFILA</div>
          <div style="font:900 40px/1 Arial,sans-serif;color:#111;margin:8px 0 12px">${esc(score)}<span style="font-size:18px;color:#8a8a8a">/100</span></div>
          <div style="font:700 18px/1.4 Arial,sans-serif;color:#111">${esc(headline)}</div>
          ${offerRead ? `<div style="font:400 14px/1.6 Arial,sans-serif;color:#666;margin-top:8px">Ponuda kako je vidimo sa profila: ${esc(offerRead)}</div>` : ""}
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:26px 28px 0">
      <div style="font:700 13px/1.4 Arial,sans-serif;letter-spacing:.1em;color:#8a8a8a;margin-bottom:16px">ŠTA SMO KONKRETNO VIDELI</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}</table>
    </td></tr>
    <tr><td style="padding:6px 28px 30px">
      <a href="${esc(reportUrl)}" style="display:inline-block;background:#ff7900;color:#111;text-decoration:none;font:700 16px/1 Arial,sans-serif;padding:16px 22px;border-radius:12px">Otvori celu analizu &rarr;</a>
      <div style="font:400 13px/1.6 Arial,sans-serif;color:#8a8a8a;margin-top:12px">Analizu otvori u istom pregledaču u kom si je pokrenuo, da se rezultat učita.</div>
    </td></tr>
    <tr><td style="background:#faf7f4;padding:20px 28px;font:400 13px/1.65 Arial,sans-serif;color:#777">
      Imaš pitanje o nalazima? Odgovori na ovaj mejl ili nam piši na WhatsApp: +43 681 811 44 747.<br>Marketizo &bull; Beč
    </td></tr>
  </table></td></tr></table></body></html>`;
}

async function sendViaResend({ apiKey, from, to, replyTo, subject, html }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], reply_to: replyTo || undefined, subject, html }),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(clean(await response.text(), 240) || "Slanje mejla nije uspelo.");
  return true;
}

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });

  const body = request.body || {};
  const lead = body.lead || {};
  const summary = body.summary || {};

  const name = clean(lead.name, 120);
  const email = clean(lead.email, 200).toLowerCase();
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return response.status(400).json({ error: "Nedostaju podaci o klijentu." });

  const firstName = name.split(" ")[0] || name;
  const score = Number.isFinite(Number(summary.score)) ? Math.round(Number(summary.score)) : "";
  const headline = clean(summary.headline, 220);
  const offerRead = clean(summary.offerRead, 160);
  const cards = normalizeCards(summary.cards);
  // Adresa se nikada ne uzima iz zahteva, da se mejlom ne bi mogao poslati tudji link.
  const reportUrl = `${(process.env.MARKETIZO_AUDIT_ORIGIN || "https://audit.marketizo.com").replace(/\/$/, "")}/audit?dashboard=1`;

  const result = { crm: false, emailed: false };

  // 1) CRM uvek dobija sve, pa se mejl moze poslati i iz GoHighLevel automatizacije.
  try {
    const crmResponse = await fetch(GHL_AUDIT_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        phone: clean(lead.phone, 50),
        business: clean(lead.business, 120),
        location: clean(lead.location, 120),
        source: "Marketizo Brand Audit",
        tags: ["marketizo-brand-audit", "audit-lead", "audit-analysis-ready"],
        audit_tag: "marketizo-brand-audit",
        audit_id: clean(body.auditId, 100),
        audit_score: score,
        audit_headline: headline,
        audit_offer: offerRead,
        audit_link: reportUrl,
        audit_finding_1: cards[0] ? `${cards[0].title} ${cards[0].body}` : "",
        audit_finding_2: cards[1] ? `${cards[1].title} ${cards[1].body}` : "",
        audit_finding_3: cards[2] ? `${cards[2].title} ${cards[2].body}` : "",
      }),
      signal: AbortSignal.timeout(10000),
    });
    result.crm = crmResponse.ok;
  } catch {
    result.crm = false;
  }

  // 2) Ako je povezan servis za slanje mejla, saljemo ga odmah i sami.
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MARKETIZO_EMAIL_FROM;
  if (apiKey && from) {
    try {
      await sendViaResend({
        apiKey,
        from,
        to: email,
        replyTo: process.env.MARKETIZO_EMAIL_REPLY_TO || "",
        subject: `${firstName}, tvoja Marketizo analiza je spremna${score ? ` (${score}/100)` : ""}`,
        html: emailHtml({ firstName, score, headline, offerRead, cards, reportUrl }),
      });
      result.emailed = true;
    } catch (error) {
      console.error("Report email failed", error?.message);
      result.emailError = "Slanje mejla nije uspelo.";
    }
  }

  return response.status(200).json({ ok: true, ...result });
}
