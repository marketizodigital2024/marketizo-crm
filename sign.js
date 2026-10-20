import { getDocument, GlobalWorkerOptions } from './vendor/pdfjs/pdf.min.mjs';
GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
'use strict';
(() => {
 const $ = id => document.getElementById(id);
 let state = null, renderedSha = '', busy = false, viewed = false, activeStroke = null, strokes = [], pending = null;
 const canvas = $('signatureCanvas'), pen = canvas.getContext('2d');
 function message(text, error = false) { $('message').textContent = text; $('message').classList.toggle('error', error); }
 function setBusy(value) { busy = value; document.querySelectorAll('button,input').forEach(el => el.disabled = value); $('acceptDocument').disabled = value || !viewed; }
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
  $('agreement').hidden = !state.verified;
  $('signerName').value = state.name || ''; $('pdfHash').textContent = 'SHA-256: ' + (state.pdfSha256 || ''); $('consentText').textContent = state.consentText;
  $('signatureSection').hidden = state.accepted;
  $('acceptedSection').hidden = !state.accepted;
  $('completionMessage').textContent = state.status === 'signed' ? 'Dokument je potpisan. Potpisani PDF šaljemo na vašu e-mail adresu; možete ga preuzeti i ovde.' : 'Vaš potpis je sačuvan. Čekamo ostale potpisnike ili pripremu PDF-a, koji zatim šaljemo na vašu e-mail adresu.';
  $('receiptLinks').hidden = state.status !== 'signed';
  await showDocument();
  if (state.privacyUrl) { try { const u = new URL(state.privacyUrl); if (u.protocol === 'https:') { $('privacyLink').href = u.href; $('privacyLink').hidden = false; } } catch {} }
 }
 async function showDocument() {
  if (!state.verified || renderedSha === state.pdfSha256) return;
  viewed = false;
  const holder = $('documentPages'); holder.setAttribute('aria-busy', 'true'); holder.replaceChildren();
  const response = await fetch('/api/sign-public?action=pdf', { credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) throw Error('Dokument nije učitan. Ponovo otvorite link iz mejla.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
  if (digest !== state.pdfSha256) throw Error('Verzija dokumenta nije potvrđena. Osvežite stranicu.');
  const loadingTask = getDocument({ data: bytes, isEvalSupported: false, useWasm: false, stopAtErrors: true });
  try {
   const pdf = await loadingTask.promise;
   for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i), base = page.getViewport({ scale: 1 });
    const width = Math.min(holder.clientWidth || 720, 900), ratio = Math.min(devicePixelRatio || 1, 1.5);
    const viewport = page.getViewport({ scale: width / base.width * ratio });
    const sheet = document.createElement('canvas'); sheet.className = 'document-page';
    sheet.width = Math.ceil(viewport.width); sheet.height = Math.ceil(viewport.height);
    sheet.style.aspectRatio = base.width + ' / ' + base.height; holder.append(sheet);
    await page.render({ canvasContext: sheet.getContext('2d'), viewport }).promise;
    const text = await page.getTextContent(); sheet.setAttribute('role', 'img');
    sheet.setAttribute('aria-label', 'Strana ' + i + ': ' + text.items.map(item => item.str || '').join(' '));
   }
  } finally { await loadingTask.destroy(); }
  renderedSha = state.pdfSha256; viewed = true; holder.setAttribute('aria-busy', 'false');
 }
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
  if (!viewed || !$('acceptTerms').checked || !$('signerName').value.trim()) return message('Sačekajte prikaz dokumenta, upišite ime i potvrdite saglasnost pre potpisa.', true);
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
