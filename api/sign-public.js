'use strict';
const crypto = require('node:crypto');
const { withRequestBudget } = require('../lib/database-request.js');
const { SignError } = require('../lib/sign-content.js');
const { validateFields } = require('../lib/sign-personalization.js');
const { createWorkflow, hash, mac, context, origin, validateSignature, canonical, CONSENT, evidenceKey } = require('../lib/sign-workflow.js');
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const TOKEN = /^[a-zA-Z0-9_-]{43}$/;
const COOKIE = '__Host-marketizo_sign';
const CODEKS_CONSENT = 'Pročitao/la sam prikazanu verziju Kodeksa ponašanja Marketizo tima i potvrđujem da sam upoznat/a sa njenim pravilima i da ću ih primenjivati u okviru svog angažovanja. Želim da ovu potvrdu potpišem jednostavnim elektronskim potpisom. Upisano ime i priloženi crtež, ako postoji, predstavljaju moj potpis.';
const CONSENT_DE = 'Ich habe die angezeigte PDF-Fassung des Vertrags gelesen und akzeptiere ihre Bestimmungen. Ich möchte diesen Vertrag mit einer einfachen elektronischen Signatur unterzeichnen. Der eingetragene Name und eine gegebenenfalls beigefügte Zeichnung stellen meine Unterschrift dar. Ich bestätige, dass ich für mich selbst unterzeichne oder zur Vertretung der angegebenen Vertragspartei berechtigt bin.';
function sessionDigest(req) { const m = String(req.headers?.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(COOKIE + '=')); const token = m?.slice(COOKIE.length + 1) || ''; if (!TOKEN.test(token)) throw new SignError(401, 'Ponovo otvori link iz poziva.'); return hash(token); }
function json(res, status, data) { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(data)); }
async function bodyOf(req) {
 if (!String(req.headers?.['content-type'] || '').startsWith('application/json')) throw new SignError(415, 'Potreban je JSON zahtev.');
 let raw;
 if (req.body !== undefined) raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
 else { const chunks = []; let size = 0; for await (const chunk of req) { size += Buffer.byteLength(chunk); if (size > 150000) throw new SignError(413, 'Zahtev je prevelik.'); chunks.push(Buffer.from(chunk)); } raw = Buffer.concat(chunks).toString('utf8'); }
 if (Buffer.byteLength(raw) > 150000) throw new SignError(413, 'Zahtev je prevelik.');
 try { const data = JSON.parse(raw); if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error(); return data; } catch { throw new SignError(400, 'Zahtev nije ispravan.'); }
}
function pdf(res, data) { const bytes = Buffer.from(data.pdfBase64 || '', 'base64'); if (hash(bytes) !== data.pdfSha256 || bytes.length > 1500000) throw new SignError(503, 'PDF nije potvrđen.'); res.statusCode = 200; res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', 'inline; filename="Marketizo-ugovor.pdf"'); res.setHeader('X-Document-SHA256', data.pdfSha256); res.end(bytes); }
function createHandler(deps = {}) {
 return async (req, res) => {
  if (require('../lib/environment.js').blockProductionFeatureInPreview(res, typeof process === 'undefined' ? {} : process.env)) return;
  res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
   if (!['GET', 'POST'].includes(req.method)) { res.setHeader('Allow', 'GET, POST'); return json(res, 405, { ok: false, error: 'Metod nije podržan.' }); }
   if (req.method === 'POST' && (req.headers.origin !== (deps.origin || origin()) || req.headers['x-sign-request'] !== '1')) throw new SignError(403, 'Zahtev nije dozvoljen sa ove adrese.');
   const params = new URL(req.url, 'https://app.marketizo.com').searchParams;
   if (req.method === 'GET' && params.get('action') === 'key') { const key = evidenceKey(); return json(res, 200, { ok: true, publicKey: key.publicKey, fingerprint: key.fingerprint, algorithm: 'Ed25519', qualified: false }); }
   const config = deps.config || require('./state.js').helpers.supabaseConfig();
   if (!config.configured) throw new SignError(503, 'Sign servis trenutno nije dostupan.');
   const flow = (deps.createWorkflow || createWorkflow)({ ...config, organization: process.env.CRM_STATE_ID || 'marketizo-main' });
   const ctx = context(req); await flow.rpc('rate', { key: mac('rate', ctx.ip) });
   async function preview(digest, receipt = false, initial = false) {
    const source = await flow.rpc(initial ? 'onboarding_preview' : receipt ? 'receipt' : 'pdf', { sessionDigest: digest });
    const bytes = Buffer.from(source.pdfBase64 || '', 'base64');
    if (bytes.length > 1500000 || hash(bytes) !== source.pdfSha256) throw new SignError(503, 'PDF nije potvrđen.');
    const result = await flow.helper({ action: 'preview', pdfBase64: bytes.toString('base64'), pdfSha256: source.pdfSha256 });
    if (result.pdfSha256 !== source.pdfSha256) throw new SignError(503, 'PDF nije potvrđen.');
    return { ...result, pdfBase64: bytes.toString('base64'), consentText: result.purpose === 'codeks' ? CODEKS_CONSENT : result.language === 'de' ? CONSENT_DE : CONSENT };
   }
   if (req.method === 'GET') {
    const action = params.get('action') || 'view', digest = sessionDigest(req);
    if (action === 'view') {
     let data = await flow.rpc('link_view', { sessionDigest: digest });
     if (data.completion?.allComplete && !data.completion.ready) {
      await flow.completePdf(digest);
      data = await flow.rpc('link_view', { sessionDigest: digest });
     }
     const identity = data.verified ? await flow.rpc('otp_target', { sessionDigest: digest }) : {};
     return json(res, 200, { ...data, signerEmail: identity.email, consentText: CONSENT, privacyUrl: data.issuer?.privacyNotice?.url || process.env.SIGN_PRIVACY_URL || null });
    }
    if (action === 'pdf' || action === 'receipt') {
     const view = await flow.rpc('link_view', { sessionDigest: digest });
     if (!view.accepted || view.status !== 'signed') throw new SignError(403, 'Preuzimanje PDF-a je dostupno nakon završenog potpisivanja.');
     return pdf(res, await flow.rpc('receipt', { sessionDigest: digest }));
    }
    if (action === 'initial_preview') return json(res, 200, { ok: true, ...await preview(digest, false, true) });
    if (action === 'preview' || action === 'receipt_preview') return json(res, 200, { ok: true, ...await preview(digest, action === 'receipt_preview') });
    if (action === 'evidence') { res.setHeader('Content-Disposition', 'attachment; filename="Marketizo-evidencija.json"'); return json(res, 200, await flow.rpc('evidence', { sessionDigest: digest })); }
    throw new SignError(400, 'Nepoznata radnja.');
   }
   const body = await bodyOf(req);
   if (body.action === 'exchange') {
    if (!TOKEN.test(body.token || '')) throw new SignError(401, 'Link nije važeći.');
    const token = crypto.randomBytes(32).toString('base64url');
    await flow.rpc('link_exchange', { invitationDigest: hash(body.token), sessionDigest: hash(token), context: ctx });
    res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; Max-Age=1800; Secure; HttpOnly; SameSite=Strict`);
    return json(res, 200, { ok: true });
   }
   const digest = sessionDigest(req);
   if (body.action === 'complete_details') {
    const fields=validateFields(body.fields);
    const result=await flow.rpc('completion_submit',{sessionDigest:digest,fields});
    return json(res,200,result);
   }
   if (body.action === 'accept') {
    if (!UUID.test(body.commandId || '') || !/^[a-f0-9]{64}$/.test(body.pdfSha256 || '') || body.accepted !== true || body.authority !== true) throw new SignError(400, 'Potvrdi dokument, nameru i ovlašćenje.');
    const documentPreview = await preview(digest);
    const signature = validateSignature(body.signature), payload = { commandId: body.commandId, pdfSha256: body.pdfSha256, signature, ...(body.receiptEmail!==undefined?{receiptEmail:typeof body.receiptEmail==='string'?body.receiptEmail.trim().toLowerCase():null}:{}), accepted: true, authority: true, consentText: documentPreview.consentText };
    const r = await flow.rpc('link_accept', { ...payload, sessionDigest: digest, payloadSha256: hash(canonical(payload)) });
    await flow.drain(3).catch(() => {}); return json(res, 200, r);
   }
   throw new SignError(400, 'Nepoznata radnja.');
  } catch (e) { return json(res, e instanceof SignError ? e.status : 503, { ok: false, error: e instanceof SignError ? e.message : 'Sign servis trenutno nije dostupan. Pokušaj ponovo.' }); }
 };
}
module.exports = (req, res) => withRequestBudget(() => createHandler()(req, res), 90000);
module.exports.createHandler = createHandler;
