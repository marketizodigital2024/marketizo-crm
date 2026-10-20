'use strict';
(() => {
 const $ = id => document.getElementById(id);
 let state = null, challengeId = '', busy = false, viewed = false, activeStroke = null, strokes = [], pending = null;
 const canvas = $('signatureCanvas'), pen = canvas.getContext('2d');
 function message(text, error = false) { $('message').textContent = text; $('message').classList.toggle('error', error); }
 function setBusy(value) { busy = value; document.querySelectorAll('button,input').forEach(el => el.disabled = value); }
 async function api(action, body) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 65000);
  try {
   const r = await fetch('/api/sign-public' + (!body ? '?action=' + encodeURIComponent(action) : ''), { method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', signal: controller.signal, headers: body ? { 'Content-Type': 'application/json', 'X-Sign-Request': '1' } : {}, ...(body ? { body: JSON.stringify({ action, ...body }) } : {}) });
   const data = await r.json().catch(() => ({})); if (!r.ok || !data.ok) throw Error(data.error || 'Zahtev nije potvrđen.'); return data;
  } catch (e) { if (e.name === 'AbortError') throw Error('Potvrda traje predugo. Ponovite istu radnju; potpis se neće duplirati.'); throw e; }
  finally { clearTimeout(timer); }
 }
 async function refresh() {
  state = await api('view'); $('title').textContent = state.title;
  $('issuer').textContent = 'Pošiljalac: ' + (state.issuer?.name || 'Marketizo') + (state.issuer?.address ? ' · ' + state.issuer.address : '');
  $('maskedEmail').textContent = 'Kod šaljemo isključivo na ' + state.email;
  $('verification').hidden = state.verified; $('agreement').hidden = !state.verified;
  $('signerName').value = state.name || ''; $('pdfHash').textContent = 'SHA-256: ' + (state.pdfSha256 || ''); $('consentText').textContent = state.consentText;
  $('signatureSection').hidden = state.accepted;
  $('acceptedSection').hidden = !state.accepted;
  $('completionMessage').textContent = state.status === 'signed' ? 'Svi obavezni potpisi su zabeleženi i dokazni paket je sačuvan.' : 'Čekamo ostale obavezne potpise ili završetak pripreme dokaznog paketa.';
  $('receiptLinks').hidden = state.status !== 'signed';
  if (state.privacyUrl) { try { const u = new URL(state.privacyUrl); if (u.protocol === 'https:') { $('privacyLink').href = u.href; $('privacyLink').hidden = false; } } catch {} }
 }
 $('requestOtp').addEventListener('click', async () => {
  if (busy) return; setBusy(true); message('Priprema koda…');
  try { const r = await api('otp_issue', {}); challengeId = r.challengeId; $('otpForm').hidden = false; message('Kod je pripremljen za slanje. Proverite prijemno sanduče i neželjenu poštu.'); }
  catch (e) { message(e.message, true); } finally { setBusy(false); }
 });
 $('otpForm').addEventListener('submit', async e => {
  e.preventDefault(); if (busy || !challengeId) return; setBusy(true);
  try { await api('otp_verify', { challengeId, code: $('otpCode').value.trim() }); $('otpCode').value = ''; await refresh(); message('E-mail je potvrđen. Otvorite i pregledajte ugovor pre potpisivanja.'); }
  catch (err) { message(err.message, true); } finally { setBusy(false); }
 });
 $('openPdf').addEventListener('click', () => { window.open('/api/sign-public?action=pdf', '_blank', 'noopener,noreferrer'); viewed = true; });
 function draw() {
  pen.clearRect(0, 0, canvas.width, canvas.height); pen.lineWidth = 2; pen.strokeStyle = '#20314b'; pen.lineCap = 'round'; pen.lineJoin = 'round';
  for (const stroke of strokes) { if (!stroke.length) continue; pen.beginPath(); pen.moveTo(stroke[0][0] * canvas.width, stroke[0][1] * canvas.height); for (const [x, y] of stroke.slice(1)) pen.lineTo(x * canvas.width, y * canvas.height); pen.stroke(); }
 }
 function point(e) { const r = canvas.getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))].map(n => Math.round(n * 10000) / 10000); }
 canvas.addEventListener('pointerdown', e => { if (busy || strokes.length >= 50 || strokes.flat().length >= 1900) return; canvas.setPointerCapture(e.pointerId); activeStroke = [point(e)]; strokes.push(activeStroke); });
 canvas.addEventListener('pointermove', e => { if (!activeStroke || strokes.reduce((n, x) => n + x.length, 0) >= 2000) return; activeStroke.push(point(e)); draw(); });
 ['pointerup', 'pointercancel'].forEach(event => canvas.addEventListener(event, () => { activeStroke = null; }));
 $('clearSignature').addEventListener('click', () => { strokes = []; activeStroke = null; draw(); });
 $('acceptDocument').addEventListener('click', async () => {
  if (busy) return;
  if (!viewed || !$('acceptTerms').checked || !$('acceptAuthority').checked || !$('signerName').value.trim()) return message('Otvorite PDF, upišite ime i potvrdite obe izjave pre potpisa.', true);
  const payload = { pdfSha256: state.pdfSha256, signature: { name: $('signerName').value.trim(), strokes }, accepted: true, authority: true };
  const fingerprint = JSON.stringify(payload); if (!pending || pending.fingerprint !== fingerprint) pending = { fingerprint, commandId: crypto.randomUUID() };
  setBusy(true); message('Čekamo potvrdu prihvatanja…');
  try { await api('accept', { ...payload, commandId: pending.commandId }); pending = null; await refresh(); message('Vaše prihvatanje je potvrđeno u evidenciji.'); }
  catch (e) { message(e.message, true); } finally { setBusy(false); }
 });
 $('declineDocument').addEventListener('click', async () => {
  if (busy || !confirm('Odbiti ovaj ugovor? Prihvatanje neće biti zabeleženo.')) return; setBusy(true);
  try { await api('decline', { reason: '' }); $('agreement').hidden = true; message('Ugovor je odbijen. Za novi dogovor obratite se pošiljaocu.'); }
  catch (e) { message(e.message, true); } finally { setBusy(false); }
 });
 $('refreshStatus').addEventListener('click', async () => { try { await refresh(); } catch (e) { message(e.message, true); } });
 async function init() {
  const token = location.hash.slice(1); history.replaceState(null, '', location.pathname);
  setBusy(true);
  try { if (token) await api('exchange', { token }); await refresh(); message(''); }
  catch (e) { $('title').textContent = 'Pristup dokumentu'; message(e.message, true); }
  finally { setBusy(false); }
 }
 init();
})();
