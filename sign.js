import { getDocument, GlobalWorkerOptions } from './vendor/pdfjs/pdf.legacy.min.mjs';
GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs/pdf.worker.legacy.min.mjs', import.meta.url).href;
'use strict';
(() => {
 const $ = id => document.getElementById(id);
 let state = null, renderedSha = '', busy = false, viewed = false, activeStroke = null, strokes = [], pending = null;
 const canvas = $('signatureCanvas');
 let pdfTask = null, pageObserver = null, pages = [], currentPage = 1, pdfZoom = 1, readingSize = 18, mode = matchMedia('(max-width: 640px)').matches ? 'reading' : 'pdf', signaturePage = 1, renderQueue = Promise.resolve(), renderClock = 0, renderGeneration = 0;
 function message(text, error = false) { $('message').textContent = text; $('message').classList.toggle('error', error); }
 function setBusy(value) { busy = value; document.querySelectorAll('button,input').forEach(el => el.disabled = value); $('acceptDocument').disabled = value || !viewed; updateReader(); }
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
  $('signatureSection').hidden = state.accepted; $('signatureActions').hidden = state.accepted;
  $('acceptedSection').hidden = !state.accepted;
  $('completionMessage').textContent = state.status === 'signed' ? 'Dokument je potpisan. Potpisani PDF šaljemo na vašu e-mail adresu; možete ga preuzeti i ovde.' : 'Vaš potpis je sačuvan. Čekamo ostale potpisnike ili pripremu PDF-a, koji zatim šaljemo na vašu e-mail adresu.';
  $('receiptLinks').hidden = state.status !== 'signed';
  await showDocument();
  if (state.privacyUrl) { try { const u = new URL(state.privacyUrl); if (u.protocol === 'https:') { $('privacyLink').href = u.href; $('privacyLink').hidden = false; } } catch {} }
 }
 function updateReader() {
  $('previousPage').disabled = busy || currentPage <= 1; $('nextPage').disabled = busy || currentPage >= pages.length;
  $('pageCounter').textContent = currentPage + ' / ' + Math.max(1, pages.length);
  $('zoomValue').textContent = mode === 'reading' ? readingSize + ' px' : Math.round(pdfZoom * 100) + '%';
  $('readingMode').setAttribute('aria-pressed', String(mode === 'reading')); $('paperMode').setAttribute('aria-pressed', String(mode === 'pdf'));
  $('startSigning').hidden = !!state?.accepted;
  pages.forEach((p, i) => p.button.setAttribute('aria-current', i+1 === currentPage ? 'page' : 'false'));
 }
 function setMode(value) {
  mode = value; $('documentPages').hidden = mode !== 'pdf'; $('documentText').hidden = mode !== 'reading';
  $('documentViewport').classList.toggle('reading', mode === 'reading');
  $('documentText').style.fontSize = readingSize + 'px'; $('documentPages').style.width = (pdfZoom * 100) + '%';
  updateReader(); goToPage(currentPage, false);
 }
 function goToPage(number, smooth = true) {
  if (!pages.length) return; currentPage = Math.max(1, Math.min(pages.length, number));
  const p = pages[currentPage-1], target = mode === 'reading' ? p.article : p.paper, vp = $('documentViewport');
  vp.scrollTo({ top: target.offsetTop - (mode === 'reading' ? $('documentText').offsetTop : $('documentPages').offsetTop), left: 0, behavior: smooth ? 'smooth' : 'auto' });
  if (mode === 'pdf') scheduleRender(p); updateReader();
 }
 async function renderPage(p) {
  if (p.rendered) { p.lastRender=++renderClock; return; } if(p.rendering || !pdfTask)return; p.rendering=true;
  try {
   const width = Math.max(600, Math.min(1000, p.paper.clientWidth || 760));
   const viewport = p.page.getViewport({ scale: width / p.base.width * Math.min(devicePixelRatio || 1, 1.5) });
   p.sheet.width = Math.ceil(viewport.width); p.sheet.height = Math.ceil(viewport.height);
   await p.page.render({ canvasContext: p.sheet.getContext('2d'), viewport }).promise;
   p.rendered = true; p.lastRender = ++renderClock;
   const cached = pages.filter(x => x.rendered).sort((a,b) => b.lastRender-a.lastRender);
   for (const old of cached.slice(3)) { const rect=old.paper.getBoundingClientRect(),vp=$('documentViewport').getBoundingClientRect(),visible=mode==='pdf' && rect.bottom>vp.top && rect.top<vp.bottom; if(old!==p && !old.rendering && !visible){old.sheet.width=1;old.sheet.height=1;old.rendered=false;} }
  } finally { p.rendering = false; }
 }
 function scheduleRender(p) { const generation=renderGeneration; renderQueue=renderQueue.then(()=>generation===renderGeneration ? renderPage(p) : undefined).catch(()=>{if(generation===renderGeneration)message('Prikaz strane nije uspeo. Pokušajte osvežavanje ili izaberite Čitanje.',true);}); }
 function readablePage(items, article) {
  const lines = [];
  for (const item of items) {
   if (!item.str?.trim()) continue;
   const y = Math.round(item.transform[5]), x = item.transform[4], size = Math.abs(item.height || item.transform[3] || 10);
   let line = lines.find(row => Math.abs(row.y-y) <= 2);
   if (!line) { line = { y, size, items: [] }; lines.push(line); }
   line.size = Math.max(line.size, size); line.items.push({x, text:item.str});
  }
  lines.sort((a,b)=>b.y-a.y); let paragraph=null, previous=null;
  for (const line of lines) {
   const text = line.items.sort((a,b)=>a.x-b.x).map(i=>i.text).join(' '), heading = line.size >= 12;
   if (heading || !previous || previous.size >= 12 || previous.y-line.y > Math.max(19, line.size*1.9)) {
    paragraph = document.createElement(heading ? 'h3' : 'p'); article.append(paragraph); paragraph.textContent = text;
   } else paragraph.textContent += ' ' + text;
   previous = line;
  }
 }
 async function showDocument() {
  const stamp = state.pdfSha256 + ':' + state.status;
  if (!state.verified || renderedSha === stamp) return;
  viewed = false; renderGeneration++; pageObserver?.disconnect(); if (pdfTask) { await pdfTask.destroy(); pdfTask=null; }
  const holder = $('documentPages');
  if (holder.contains($('signatureSection'))) $('agreement').insertBefore($('signatureSection'), $('signatureActions'));
  $('signatureSection').classList.remove('on-paper'); $('signatureSection').removeAttribute('style');
  holder.setAttribute('aria-busy','true'); holder.replaceChildren(); $('documentText').replaceChildren(); $('pageNavigator').replaceChildren(); pages=[]; currentPage=1; renderQueue=Promise.resolve();
  const response = await fetch('/api/sign-public?action=' + (state.status === 'signed' ? 'receipt' : 'pdf'), { credentials:'same-origin', cache:'no-store' });
  if (!response.ok) throw Error('Dokument nije učitan. Ponovo otvorite link iz mejla.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  if (digest !== (state.status === 'signed' ? response.headers.get('X-Document-SHA256') : state.pdfSha256)) throw Error('Verzija dokumenta nije potvrđena. Osvežite stranicu.');
  pdfTask = getDocument({ data:bytes, isEvalSupported:false, useWasm:false, stopAtErrors:true });
  const pdf = await pdfTask.promise, metadata = await pdf.getMetadata(); let layout=null;
  try { layout=JSON.parse(metadata.info?.Custom?.get?.('MarketizoLayout') || metadata.info?.Custom?.MarketizoLayout || 'null'); } catch {}
  let signatureSlot=null;
  if (layout?.version===1) { const matches=layout.blocks.flatMap(b=>b.slots.filter(s=>s.email && (state.signerEmail ? s.email.toLowerCase()===state.signerEmail.toLowerCase() : s.name===state.name)).map(s=>({...s,page:b.page}))); if(matches.length===1)signatureSlot=matches[0]; }
  signaturePage=signatureSlot?.page || pdf.numPages;
  for(let i=1;i<=pdf.numPages;i++) {
   const page=await pdf.getPage(i),base=page.getViewport({scale:1}),text=await page.getTextContent();
   const paper=document.createElement('div'); paper.className='document-sheet'; paper.dataset.page=String(i);
   const sheet=document.createElement('canvas');sheet.className='document-page';sheet.width=1;sheet.height=1;sheet.style.aspectRatio=base.width+' / '+base.height;sheet.setAttribute('role','img');sheet.setAttribute('aria-label','Strana '+i+': '+text.items.map(item=>item.str||'').join(' '));paper.append(sheet);holder.append(paper);
   const article=document.createElement('article');article.className='reading-page';article.dataset.page=String(i);
   const label=document.createElement('p');label.className='reading-page-label';label.textContent='Strana '+i+' / '+pdf.numPages;article.append(label);readablePage(text.items,article);$('documentText').append(article);
   const button=document.createElement('button');button.type='button';button.className='page-nav-button';button.textContent=String(i);button.setAttribute('aria-label','Strana '+i);button.addEventListener('click',()=>goToPage(i));const thumbnail=document.createElement('canvas');thumbnail.width=64;thumbnail.height=Math.round(64*base.height/base.width);thumbnail.setAttribute('aria-hidden','true');button.prepend(thumbnail);$('pageNavigator').append(button);
   if(matchMedia('(min-width:641px)').matches)await page.render({canvasContext:thumbnail.getContext('2d'),viewport:page.getViewport({scale:64/base.width})}).promise;
   const data={page,base,paper,sheet,article,button,rendered:false,rendering:false,lastRender:0};pages.push(data);
   if(signatureSlot?.page===i && !state.accepted) {
    const section=$('signatureSection');section.classList.add('on-paper');section.style.left=(signatureSlot.x/base.width*100)+'%';section.style.top=((base.height-signatureSlot.y-signatureSlot.height)/base.height*100)+'%';section.style.width=(signatureSlot.width/base.width*100)+'%';section.style.aspectRatio=signatureSlot.width+' / '+signatureSlot.height;paper.append(section);
   }
  }
  setMode(mode); await renderPage(pages[0]);
  pageObserver=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting && mode==='pdf'){const p=pages[Number(entry.target.dataset.page)-1];scheduleRender(p);}}},{root:$('documentViewport'),rootMargin:'160px'});pages.forEach(p=>pageObserver.observe(p.paper));
  renderedSha=stamp;viewed=true;holder.setAttribute('aria-busy','false');updateReader();
 }
 $('readingMode').addEventListener('click',()=>setMode('reading'));$('paperMode').addEventListener('click',()=>setMode('pdf'));
 $('previousPage').addEventListener('click',()=>goToPage(currentPage-1));$('nextPage').addEventListener('click',()=>goToPage(currentPage+1));
 function changeZoom(step) { if(mode==='reading')readingSize=Math.max(16,Math.min(28,readingSize+step*2));else { pdfZoom=Math.max(.75,Math.min(3,pdfZoom+step*.25)); if(pages[currentPage-1])pages[currentPage-1].rendered=false; }setMode(mode); }
 $('zoomIn').addEventListener('click',()=>changeZoom(1));$('zoomOut').addEventListener('click',()=>changeZoom(-1));$('fitWidth').addEventListener('click',()=>{pdfZoom=1;readingSize=18;setMode(mode);});
 $('documentViewport').addEventListener('scroll',()=>{const nodes=pages.map(p=>mode==='reading'?p.article:p.paper),vp=$('documentViewport').getBoundingClientRect();let best=0;for(let i=0;i<nodes.length;i++){if(nodes[i].getBoundingClientRect().top<=vp.top+vp.height*.35)best=i;}currentPage=best+1;updateReader();},{passive:true});
 $('startSigning').addEventListener('click',()=>{setMode('pdf');goToPage(signaturePage,false);draw();$('signatureDialog').showModal();});
 window.addEventListener('pagehide',event=>{if(!event.persisted){pageObserver?.disconnect();pdfTask?.destroy();}});
 function draw() {
  for (const target of [canvas, $('largeSignatureCanvas')]) {
   const pen = target.getContext('2d'); pen.clearRect(0, 0, target.width, target.height); pen.lineWidth = 2; pen.strokeStyle = '#20314b'; pen.lineCap = 'round'; pen.lineJoin = 'round';
   for (const stroke of strokes) { if (!stroke.length) continue; pen.beginPath(); pen.moveTo(stroke[0][0] * target.width, stroke[0][1] * target.height); for (const [x, y] of stroke.slice(1)) pen.lineTo(x * target.width, y * target.height); pen.stroke(); }
  }
 }
 function point(e) { const r = e.currentTarget.getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))].map(n => Math.round(n * 10000) / 10000); }
 for (const target of [canvas, $('largeSignatureCanvas')]) {
  target.addEventListener('pointerdown', e => { if (busy || strokes.length >= 50 || strokes.flat().length >= 1900) return; target.setPointerCapture(e.pointerId); activeStroke = [point(e)]; strokes.push(activeStroke); });
  target.addEventListener('pointermove', e => { if (!activeStroke || strokes.reduce((n, x) => n + x.length, 0) >= 2000) return; activeStroke.push(point(e)); draw(); });
  ['pointerup', 'pointercancel'].forEach(event => target.addEventListener(event, () => { activeStroke = null; }));
 }
 for (const id of ['clearSignature', 'clearLargeSignature']) $(id).addEventListener('click', () => { strokes = []; activeStroke = null; draw(); });
 $('enlargeSignature').addEventListener('click', () => { draw(); $('signatureDialog').showModal(); });
 $('closeSignatureDialog').addEventListener('click', () => { activeStroke = null; $('signatureDialog').close(); draw(); });
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
  catch (e) { message(e instanceof TypeError ? 'Pregled dokumenta nije uspeo. Osvežite stranicu i ponovo otvorite link iz mejla.' : e.message, true); }
  finally { setBusy(false); }
 }
 init();
})();
