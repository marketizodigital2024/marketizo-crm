'use strict';
(()=>{
 const $=id=>document.getElementById(id);let source=null,busy=false,commandId=null;
 function message(value,error=false){$('message').textContent=value;$('message').classList.toggle('error',error);}
 async function api(body){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),65000);try{
  const r=await fetch('/api/onboarding',{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',signal:controller.signal,...(body?{headers:{'Content-Type':'application/json','X-Sign-Request':'1'},body:JSON.stringify(body)}:{})});
  const data=await r.json();if(!r.ok||!data.ok)throw Error(data.error||'Dokument trenutno nije dostupan.');return data;
 }finally{clearTimeout(timer);}}
 async function render(data){
  const bytes=Uint8Array.from(atob(data.pdfBase64),c=>c.charCodeAt(0)),sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
  if(sha!==data.pdfSha256)throw Error('Dokument nije potvrđen. Osvežite stranicu.');
  const pdfjs=await import('/vendor/pdfjs/pdf.legacy.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc='/vendor/pdfjs/pdf.worker.legacy.min.mjs';
  const task=pdfjs.getDocument({data:bytes,isEvalSupported:false,useSystemFonts:true}),pdf=await task.promise;
  try{
   const host=$('documentPages'),pages=document.createElement('div');pages.className='document-pdf-pages';const width=Math.max(host.clientWidth||760,300),ratio=Math.min(devicePixelRatio||1,2);
   for(let n=1;n<=pdf.numPages;n++){
    const page=await pdf.getPage(n),base=page.getViewport({scale:1}),viewport=page.getViewport({scale:width/base.width*ratio}),canvas=document.createElement('canvas');
    canvas.className='document-pdf-canvas';canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);canvas.style.width=width+'px';canvas.style.height=Math.ceil(viewport.height/ratio)+'px';canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Strana dokumenta '+n+' / '+pdf.numPages);
    await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;pages.append(canvas);page.cleanup();
   }
   const accessible=document.createElement('div');accessible.className='document-reading-text';for(const block of data.content.blocks){const p=document.createElement(block.type==='heading'?'h2':'p');for(const run of block.runs){const el=document.createElement(run.bold?'strong':'span');el.textContent=run.text;p.append(el);}accessible.append(p);}
   host.replaceChildren(pages,accessible);host.setAttribute('aria-busy','false');
  }finally{await task.destroy();}
 }
 $('toggleDocumentView').addEventListener('click',()=>{const host=$('documentPages'),pdf=host.dataset.pdfMode!=='true';host.dataset.pdfMode=String(pdf);$('toggleDocumentView').textContent=pdf?'Prikaži čitljiv tekst':'Prikaži PDF';});
 $('startOnboarding').addEventListener('click',async()=>{
  if(busy||!source)return;busy=true;$('startOnboarding').disabled=true;message('Otvaramo vaš obrazac za podatke…');commandId||=crypto.randomUUID();
  try{const r=await api({action:'start',commandId,templateSha256:source.templateSha256});if(!/^\/sign\?onboarding-details=1#[A-Za-z0-9_-]{43}$/.test(r.url))throw Error('Link nije potvrđen.');location.assign(r.url);}
  catch(e){message(e.message+' Pokušajte ponovo ili osvežite stranicu.',true);busy=false;$('startOnboarding').disabled=false;}
 });
 (async()=>{try{source=await api();$('issuer').textContent=[source.issuer.name,source.issuer.address,source.issuer.email].filter(Boolean).join('\n');$('sharedAgreement').hidden=false;await render(source);$('toggleDocumentView').hidden=false;$('startOnboarding').disabled=false;message('');}catch(e){source=null;$('startOnboarding').disabled=true;message(e.message,true);}})();
})();
