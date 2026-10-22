'use strict';
const crypto = require('node:crypto');
const { isIP } = require('node:net');
const { SignError, validateDraft, assertReady } = require('./sign-content.js');
const { request } = require('./database-request.js');
const { personalizeDocument } = require('./sign-personalization.js');
const PRIVACY_VERSION = '2026-10-20.1';
const CONSENT = 'Pročitao/la sam prikazanu PDF verziju ugovora i prihvatam njene odredbe. Želim da ovaj ugovor potpišem jednostavnim elektronskim potpisom. Upisano ime i priloženi crtež, ako postoji, predstavljaju moj potpis. Potvrđujem da potpisujem za sebe ili imam ovlašćenje za zastupanje navedene ugovorne strane.';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function canonical(value) { if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']'; if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}'; return JSON.stringify(value); }
function secret(name) { const key = process.env[name] || ''; if (key.length < 32) throw new SignError(503, 'Marketizo Sign bezbednosni ključevi nisu podešeni.'); return key; }
function mac(domain, value) { return crypto.createHmac('sha256', secret('SIGN_INTERNAL_SECRET')).update(domain + ':' + value).digest('hex'); }
function evidenceKey() { const seed = crypto.createHash('sha256').update(secret('SIGN_EVIDENCE_SECRET')).digest(); const privateKey = crypto.createPrivateKey({ key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed]), format: 'der', type: 'pkcs8' }); const publicKey = crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'pem' }); return { privateKey, publicKey, fingerprint: hash(publicKey) }; }
function seal(payload) { const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(mac('outbox-key', 'v1'), 'hex'), iv); const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]); return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64'); }
function unseal(value) { const buf = Buffer.from(value, 'base64'); const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(mac('outbox-key', 'v1'), 'hex'), buf.subarray(0, 12)); decipher.setAuthTag(buf.subarray(12, 28)); return JSON.parse(Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8')); }
function origin() { const url = new URL(process.env.SIGN_APP_ORIGIN || 'https://app.marketizo.com'); if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password) throw new SignError(503, 'Podesi bezbednu adresu Marketizo Sign aplikacije.'); return url.origin; }
function testScope() { try { const s = JSON.parse(process.env.SIGN_TEST_DELIVERY || 'null'); return s && /^[a-f0-9-]{36}$/i.test(s.documentId || '') && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(s.email || '') && Number.isFinite(Date.parse(s.expiresAt)) && Date.parse(s.expiresAt) > Date.now() ? s : null; } catch { return null; } }
function isApprovedTest(doc) { const s = testScope(), r = doc?.data?.recipients; return !!s && doc.id === s.documentId && Array.isArray(r) && r.length === 1 && r[0].email?.trim().toLowerCase() === s.email.toLowerCase() && /^TEST\b/.test(doc.data.title || '') && /NEOBAVEZUJUĆE/.test(doc.data.title || ''); }
function readiness() {
 const keys = ['SIGN_INTERNAL_SECRET', 'SIGN_EVIDENCE_SECRET'];
 const missing = keys.filter(k => (process.env[k] || '').length < 32).concat(['SIGN_SMTP_HOST', 'SIGN_SMTP_USER', 'SIGN_SMTP_PASSWORD', 'SIGN_LEGAL_ENTITY', 'SIGN_LEGAL_ADDRESS', 'SIGN_PRIVACY_URL'].filter(k => !process.env[k]));
 try { const url = new URL(process.env.SIGN_PRIVACY_URL); if (url.protocol !== 'https:' || url.username || url.password) missing.push('SIGN_PRIVACY_URL'); } catch { if (!missing.includes('SIGN_PRIVACY_URL')) missing.push('SIGN_PRIVACY_URL'); }
 return { testDocumentId: missing.length === 0 ? testScope()?.documentId || null : null, provider: 'marketizo', connected: missing.length === 0, sendingEnabled: missing.length === 0 && process.env.SIGN_SES_ENABLED === 'true', phase: 'ses', message: missing.length ? 'Naš potpis je pripremljen. Slanje čeka podešavanje poslovnog e-maila i serverskih ključeva.' : process.env.SIGN_SES_ENABLED === 'true' ? 'Jednostavan elektronski potpis: e-mail link, PDF i evidencija. Slanje zahteva proverenu formu ugovora.' : 'Podešavanja su spremna. Slanje čeka završnu proveru i uključivanje.' };
}
function validateSignature(input) {
 if (!input || typeof input.name !== 'string' || !input.name.trim() || input.name.length > 160) throw new SignError(400, 'Upiši ime i prezime potpisnika.');
 const strokes = input.strokes || [];
 if (!Array.isArray(strokes) || strokes.length > 50) throw new SignError(400, 'Proveri crtež potpisa.');
 let count = 0;
 for (const stroke of strokes) { if (!Array.isArray(stroke)) throw new SignError(400, 'Proveri crtež potpisa.'); for (const p of stroke) { count++; if (!Array.isArray(p) || p.length !== 2 || p.some(n => typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 1)) throw new SignError(400, 'Proveri crtež potpisa.'); } }
 if (count > 2000) throw new SignError(400, 'Crtež potpisa je prevelik.');
 return { name: input.name.normalize('NFC').trim(), strokes };
}
function context(req) { const ip = String(req.headers?.['x-vercel-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim(); return { ip: isIP(ip) ? ip : 'unavailable', userAgent: String(req.headers?.['user-agent'] || '').slice(0, 400) }; }
function createWorkflow(config, deps = {}) {
 const fetchImpl = deps.fetch || fetch, org = config.organization;
 const appOrigin = () => deps.origin || origin();
 const headers = { apikey: config.key, Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json' };
 async function db(path, options = {}) { const r = await request(fetchImpl, `${config.url}/rest/v1/${path}`, { ...options, headers }, 15000); if (!r.ok) throw new SignError(503, 'Sign evidencija trenutno nije dostupna.'); return r.json(); }
 async function rpc(action, data) { const r = await db('rpc/marketizo_sign_flow', { method: 'POST', body: JSON.stringify({ p_organization: org, p_action: action, p_data: data }) }); if (!r.ok) throw new SignError(r.status || 400, r.error || 'Radnja nije potvrđena.'); return r; }
 async function helper(payload) {
  if (deps.helper) return deps.helper(payload);
  const body = JSON.stringify(payload), timestamp = String(Math.floor(Date.now() / 1000));
  const signature = crypto.createHmac('sha256', secret('SIGN_INTERNAL_SECRET')).update(timestamp + '.' + body).digest('hex');
  const r = await request(fetchImpl, appOrigin() + '/api/sign-helper', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Sign-Time': timestamp, 'X-Sign-MAC': signature, ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET ? { 'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET } : {}) }, body }, 40000);
  const result = await r.json().catch(() => ({}));
  if (!r.ok || !result.ok) throw new SignError(503, 'PDF ili e-mail obrada trenutno nije dostupna.');
  return result;
 }
 function verifyPdf(result, expectedPrefix) {
  const bytes = Buffer.from(result.base64 || '', 'base64');
  if (bytes.length > 1500000 || !bytes.subarray(0, 5).equals(Buffer.from('%PDF-')) || hash(bytes) !== result.sha256 || (expectedPrefix && !bytes.subarray(0, expectedPrefix.length).equals(expectedPrefix))) throw new SignError(503, 'PDF nije potvrđen proverom sadržaja.');
  return bytes;
 }
 async function manualLinks(requestId) {
  const rows = await db('marketizo_sign_outbox?request_id=eq.' + encodeURIComponent(requestId) + '&kind=eq.invitation&select=sealed_payload');
  return rows.map(row => unseal(row.sealed_payload)).filter(mail => mail.delivery === 'link' && mail.link).map(mail => ({ name: mail.name, email: mail.to, url: mail.link }));
 }
 async function finalize(requestId) {
  const data = await rpc('finalize_data', { requestId });
  const key = evidenceKey();
  const manifest = { version: 'ses-2', requestId, documentId: data.documentId, title: data.title, originalSha256: data.originalSha256, originalByteLength: Buffer.from(data.originalBase64, 'base64').length, issuer: data.issuer, formReview: data.review, ...(data.personalization ? {personalization:data.personalization} : {}), signers: data.signers, events: data.events, applicationKey: { publicKey: key.publicKey, fingerprint: key.fingerprint, algorithm: 'Ed25519' }, signatureType: 'simple-electronic-signature', timestampType: 'server-clock', limitations: 'Access via a recipient-scoped email link is not identity verification. Each signer authentication method is recorded separately. This is not a qualified signature or qualified timestamp; the application key is not a qualified certificate.' };
  const manifestSha256 = hash(canonical(manifest)), receiptSeal = crypto.sign(null, Buffer.from(manifestSha256, 'hex'), key.privateKey).toString('base64');
  const pdf = await helper({ action: 'finalize', originalBase64: data.originalBase64, originalSha256: data.originalSha256, evidence: manifest, manifestSha256 }); verifyPdf(pdf, Buffer.from(data.originalBase64, 'base64'));
  const result = await rpc('finalize', { requestId, pdfBase64: pdf.base64, pdfSha256: pdf.sha256, manifest, manifestSha256, seal: receiptSeal });
  const messages = data.signers.map(signer => ({ partyId: signer.id, to: signer.email, sealedMail: seal({
   id: 'receipt-' + requestId + '-' + signer.id, to: signer.email,
   subject: 'Marketizo Sign: potpisani dokument',
   text: `Poštovani/a ${signer.name},\n\nPotpisivanje dokumenta „${data.title}” je završeno. Potpisani PDF je u prilogu ove poruke.\n\nMarketizo Digital\noffice@marketizo.com`
  }) }));
  await rpc('queue_receipts', { requestId, messages });
  return result;
 }
 async function drain(max = 3) {
  let done = 0;
  for (let i = 0; i < max; i++) {
   const lease = crypto.randomUUID(), { job } = await rpc('claim', { lease }); if (!job) break;
   let success = false;
   try { if (job.kind === 'finalize') await finalize(job.request_id); else {
    const mail = unseal(job.sealed_payload);
    if (job.kind === 'signed_pdf') {
     const receipt = await rpc('receipt_mail_data', { requestId: job.request_id, partyId: job.party_id });
     if (receipt.to !== mail.to) throw Error('Receipt recipient mismatch');
     verifyPdf({ base64: receipt.pdfBase64, sha256: receipt.pdfSha256 });
     mail.attachment = { base64: receipt.pdfBase64, sha256: receipt.pdfSha256 };
    }
    if (!(job.kind === 'invitation' && mail.delivery === 'link')) { const response = await helper({ action: 'mail', ...mail }); if (response.accepted !== true) throw Error('SMTP not confirmed'); }
   } success = true; done++; }
   catch { /* The durable job retains encrypted content and retries. No private error text is logged. */ }
   await rpc('ack', { jobId: job.id, lease, success });
  }
  return { done };
 }
 return {
  rpc, helper, drain, finalize,
  async completePdf(sessionDigest) {
   const input=await rpc('completion_render_data',{sessionDigest});
   if(input.ready || input.waiting) return input;
   const document=personalizeDocument(validateDraft(input.document));
   const pdf=await helper({action:'render',document,issuer:input.issuer});verifyPdf(pdf);
   return rpc('completion_pdf_store',{sessionDigest,inputSha256:input.inputSha256,document,pdfBase64:pdf.base64,pdfSha256:pdf.sha256,renderer:pdf.renderer});
  },
  maintenance: () => db('rpc/marketizo_sign_maintenance', { method: 'POST', body: JSON.stringify({ p_organization: org }) }),
  async preparePdf(actor, doc) {
   if (doc.status !== 'ready') throw new SignError(409, 'Prvo zaključaj verziju.');
   const versions = await db(`marketizo_sign_versions?organization_id=eq.${encodeURIComponent(org)}&document_id=eq.${doc.id}&select=id&order=document_revision.desc&limit=1`);
   if (!versions.length) throw new SignError(409, 'Zaključana verzija nije pronađena.');
   const cached = await db(`marketizo_sign_prepared_pdfs?version_id=eq.${versions[0].id}&select=original_pdf,sha256`);
   if (cached.length) { const base64 = Buffer.from(cached[0].original_pdf.replace(/^\\x/, ''), 'hex').toString('base64'); verifyPdf({ base64, sha256: cached[0].sha256 }); return { ok: true, pdfBase64: base64, pdfSha256: cached[0].sha256 }; }
   const draft=validateDraft(doc.data);
   const pdf = await helper({ action: 'render', document: draft.recipientCompletion ? personalizeDocument(draft) : draft, issuer: { name: process.env.SIGN_LEGAL_ENTITY || 'Marketizo', address: process.env.SIGN_LEGAL_ADDRESS || '', email: 'office@marketizo.com' } }); verifyPdf(pdf);
   return rpc('pdf_store', { actor, documentId: doc.id, revision: doc.revision, pdfBase64: pdf.base64, pdfSha256: pdf.sha256, renderer: pdf.renderer });
  },
  async prepare(actor, body, doc) {
   if (!readiness().sendingEnabled && !(readiness().connected && isApprovedTest(doc))) throw new SignError(503, 'Slanje još nije uključeno. Podesi poslovni e-mail, identitet firme i serverske ključeve.');
   const draft = validateDraft(doc.data); assertReady(draft);
   if (draft.signatureMethod !== 'ses') throw new SignError(409, 'Ovaj ugovor zahteva kvalifikovani ili drugi poseban postupak potpisa.');
   const review = { decision: body.review?.decision, reviewedBy: String(body.review?.reviewedBy || '').trim().slice(0, 160), reference: String(body.review?.reference || '').trim().slice(0, 2000), pdfSha256: String(body.review?.pdfSha256 || ''), pdfReviewed: body.review?.pdfReviewed === true };
   if (review.decision !== 'ses_allowed' || review.reviewedBy.length < 3 || review.reference.length < 5) throw new SignError(400, 'Navedi dokumentovanu osnovu i odgovornu osobu za proveru forme ugovora.');
   if (body.delivery !== undefined && !['email', 'link'].includes(body.delivery)) throw new SignError(400, 'Izaberi e-mail ili link.');
   const delivery = body.delivery === 'link' ? 'link' : 'email';
   const requestSha256 = hash(canonical({ documentId: doc.id, revision: body.revision, review, ...(delivery === 'link' ? { delivery } : {}) }));
   const previous = await db(`marketizo_sign_requests?organization_id=eq.${encodeURIComponent(org)}&command_id=eq.${encodeURIComponent(body.commandId)}&select=id,request_sha256`);
   if (previous.length) { if (previous[0].request_sha256 !== requestSha256) throw new SignError(409, 'Isti pokušaj je upotrebljen za drugu izmenu.'); return { ok: true, requestId: previous[0].id, duplicate: true, ...(delivery === 'link' ? { links: await manualLinks(previous[0].id) } : {}) }; }
   const id = crypto.randomUUID();
   const links = [];
   const parties = draft.recipients.map(recipient => {
    const token = crypto.randomBytes(32).toString('base64url'), partyId = crypto.randomUUID();
    const link = appOrigin() + '/sign#' + token; links.push({ name: recipient.name || recipient.email, email: recipient.email, url: link });
    return { id: partyId, recipient, tokenSha256: hash(token), sealedMail: seal({ id: partyId, to: recipient.email, ...(delivery === 'link' ? { delivery, link, name: recipient.name || recipient.email } : {}), subject: 'Marketizo Sign: dokument za potpis', text: `Poštovani/a ${recipient.name || ''},\n\nMarketizo vam šalje dokument „${draft.title}” za pregled i potpisivanje.\n\n${appOrigin()}/sign#${token}\n\nAko nedostaju podaci za ugovor, prvo ih dopunite. Zatim pregledajte ceo popunjen ugovor i potpišite, bez dodatnog koda. Važi sedam dana i namenjen je samo vama. Ne prosleđujte ga. Potpis se beleži tek kada sami potvrdite potpisivanje. Nakon završetka, potpisani PDF dobijate na ovu e-mail adresu.\n\nPošiljalac: ${process.env.SIGN_LEGAL_ENTITY}\n${process.env.SIGN_LEGAL_ADDRESS}\nZa pitanja: office@marketizo.com\nZaštita podataka: ${process.env.SIGN_PRIVACY_URL}` }) };
   });
   const result = await rpc('prepare', { actor, id, documentId: doc.id, revision: body.revision, commandId: body.commandId, requestSha256, review, issuer: { name: process.env.SIGN_LEGAL_ENTITY, address: process.env.SIGN_LEGAL_ADDRESS, email: 'office@marketizo.com', privacyNotice: { version: PRIVACY_VERSION, url: process.env.SIGN_PRIVACY_URL } }, parties });
   return { ...result, ...(delivery === 'link' ? { links } : {}) };
  },
  async issueOtp(sessionDigest) {
   const { email } = await rpc('otp_target', { sessionDigest });
   const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0'), challengeId = crypto.randomUUID();
   const otpDigest = mac('otp', sessionDigest + ':' + challengeId + ':' + code);
   const result = await rpc('otp_issue', { sessionDigest, challengeId, otpDigest, sealedMail: seal({ id: challengeId, to: email, subject: 'Marketizo Sign: vaš kod za pristup', text: `Vaš Marketizo Sign kod je: ${code}\n\nVaži 10 minuta. Ne delite ga. Ovaj kod potvrđuje pristup e-mail adresi, a sam po sebi ne potpisuje ugovor. Ako niste tražili pristup, ignorišite ovu poruku.\n\noffice@marketizo.com` }) });
   return { ok: result.ok, challengeId };
  },
  verifyOtp(sessionDigest, challengeId, code) { return rpc('otp_verify', { sessionDigest, challengeId, otpDigest: mac('otp', sessionDigest + ':' + challengeId + ':' + code) }); },
  async adminArtifact(documentId, kind) {
   const rows = await db(`marketizo_sign_requests?organization_id=eq.${encodeURIComponent(org)}&document_id=eq.${encodeURIComponent(documentId)}&select=id,original_pdf,original_sha256,status,legal_review,expires_at`);
   if (!rows.length) throw new SignError(404, 'Za dokument još nema zahteva za potpis.');
   if (kind === 'status') return { ok: true, request: { id: rows[0].id, status: rows[0].status, review: rows[0].legal_review, expiresAt: rows[0].expires_at } };
   if (kind === 'original') return { bytes: Buffer.from(rows[0].original_pdf.replace(/^\\x/, ''), 'hex'), sha256: rows[0].original_sha256 };
   const final = await db(`marketizo_sign_receipts?request_id=eq.${rows[0].id}&select=final_pdf,final_sha256,manifest,manifest_sha256,seal`);
   if (!final.length) throw new SignError(409, 'Dokazni paket još nije završen.');
   if (kind === 'evidence') return { ok: true, manifest: final[0].manifest, manifestSha256: final[0].manifest_sha256, seal: final[0].seal, finalSha256: final[0].final_sha256 };
   return { bytes: Buffer.from(final[0].final_pdf.replace(/^\\x/, ''), 'hex'), sha256: final[0].final_sha256 };
  }
 };
}
module.exports = { createWorkflow, readiness, hash, canonical, context, seal, unseal, mac, origin, validateSignature, CONSENT, evidenceKey, PRIVACY_VERSION };
