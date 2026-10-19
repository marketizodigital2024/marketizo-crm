(function(){
 'use strict';
 if(typeof getAdminSession!=='function'||getAdminSession()?.role!=='full-admin')return;
 const controls=document.querySelector('.bank-matches-controls'),groups=document.getElementById('invoiceStatusGroups'),filter=document.getElementById('invoiceMonthFilter');if(!controls||!groups||!filter)return;
 const note=document.createElement('p');note.setAttribute('role','status');note.textContent='Učitavam proveru Drive originala i poslatih mejlova…';controls.append(note);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const labels={'sent-confirmed':'Slanje potvrđeno mejlom','recipient-review':'Potvrdi primaoca računa','client-review':'Potvrdi vezu sa klijentom','not-found':'Nema potvrđenog dokaza slanja','document-review':'Proveri originalni dokument'};
 let data=null,loading=false;
 function render(){
  groups.querySelectorAll('.invoice-source-proof').forEach(e=>e.remove());if(!data?.connected||data.month!==filter.value)return;
  for(const card of groups.querySelectorAll('.invoice-compact-row')){
   const clientId=card.querySelector('[data-invoice-client]')?.getAttribute('data-invoice-client'),rows=data.invoices.filter(x=>x.clientId===clientId);if(!rows.length)continue;
   const box=document.createElement('div');box.className='invoice-source-proof';box.style.cssText='margin-top:8px;padding:12px;border:1px solid #ddd;border-radius:10px';
   box.innerHTML=rows.map(x=>`<details><summary><strong>Račun ${String(x.number).padStart(5,'0')} · ${esc(labels[x.email.status])}</strong></summary><p>${x.fileId?`<a href="https://drive.google.com/file/d/${encodeURIComponent(x.fileId)}/view" target="_blank" rel="noopener noreferrer">Otvori originalni Drive račun</a>`:esc(x.filename)}</p>${x.issues.map(i=>'<p>'+esc(i)+'</p>').join('')}${x.email.proof?`<p>Poslato ${esc(new Date(x.email.proof.sentAt).toLocaleString('sr-Latn-RS',{timeZone:'Europe/Vienna'}))} · ${esc(x.email.proof.account)} → ${esc(x.email.proof.to.join(', '))}<br><a href="${esc(x.email.proof.url)}" target="_blank" rel="noopener noreferrer">Otvori poslatu poruku</a></p>`:''}${x.email.status==='not-found'?'<p>Status nije automatski promenjen u „Nije poslat“. Poruka može biti na drugom nalogu ili bez originalnog priloga.</p>':''}<div data-recipient-for="${x.number}"></div></details>`).join('');card.append(box);
   for(const x of rows.filter(x=>x.email.status==='recipient-review'&&!x.issues.length)){
    const area=box.querySelector(`[data-recipient-for="${x.number}"]`);
    for(const candidate of x.email.candidates)for(const recipient of candidate.to){
     if(/@(?:marketizo\.com|marketizo\.local)$/i.test(recipient))continue;
     const link=document.createElement('a');link.href=candidate.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Proveri poslatu poruku';area.append(link);
     const button=document.createElement('button');button.type='button';button.className='secondary-button';button.textContent='Potvrdi '+recipient+' kao primaoca za ovog klijenta';
     button.addEventListener('click',async()=>{button.disabled=true;try{const r=await fetch('/api/finance-sources',{method:'POST',headers:{Authorization:'Bearer '+getAdminSession().token,'Content-Type':'application/json'},body:JSON.stringify({clientId:x.clientId,invoiceNumber:x.number,messageId:candidate.id,account:candidate.account,recipient})});const d=await r.json();if(!r.ok||!d.ok)throw Error(d.error);note.textContent='Primalac je potvrđen. Osveži stranicu da vidiš sačuvan status slanja.';await load();}catch(e){note.textContent=e.message||'Potvrda nije sačuvana.';}finally{button.disabled=false;}});area.append(button);
    }
   }
  }
 }
 async function load(){if(loading||!document.getElementById('reports')?.classList.contains('active'))return;loading=true;const month=filter.value;try{const r=await fetch('/api/finance-sources?month='+encodeURIComponent(month),{headers:{Authorization:'Bearer '+getAdminSession().token},cache:'no-store'});const d=await r.json();if(!r.ok||!d.ok)throw Error(d.error);if(month!==filter.value)return;data={...d,month};note.textContent=d.connected?'Drive i mejl dokazi: '+d.invoices.filter(x=>x.email.status==='sent-confirmed').length+' potvrđenih slanja. '+(d.parseErrors.length?d.parseErrors.length+' dokumenata zahteva proveru.':''):'Google veza još čeka odobrenje naloga. Postojeći statusi nisu menjani.';render();}catch(e){note.textContent=e.message||'Provera izvora nije dostupna.';}finally{loading=false;}}
 new MutationObserver(render).observe(groups,{childList:true});new MutationObserver(load).observe(document.getElementById('reports'),{attributes:true,attributeFilter:['class']});filter.addEventListener('change',load);setInterval(()=>{if(document.visibilityState==='visible')load();},60000);load();
})();
