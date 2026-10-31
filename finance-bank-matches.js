(function () {
  'use strict';
  let session;
  try { session = typeof getAdminSession === 'function' ? getAdminSession() : null; } catch { return; }
  const reports = document.getElementById('reports'), groups = document.getElementById('invoiceStatusGroups');
  if (session?.role !== 'full-admin' || !reports || !groups) return;
  const money = n => Number.isSafeInteger(n) ? new Intl.NumberFormat('de-AT',{style:'currency',currency:'EUR'}).format(n/100) : '—';
  const date = s => /^\d{4}-\d{2}-\d{2}$/.test(s||'') ? s.split('-').reverse().join('.') : '—';
  const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels = {covered:'Uplata u banci potvrđena',partial:'Delimična uplata u banci', 'allocation-review':'Potvrdi za koji račun je uplata','document-review':'Proveri originalni račun','overpayment-review':'Više uplata — proveri raspodelu','not-found':'Nema potvrđene bankarske uplate'};
  const controls = document.createElement('div'); controls.className='bank-matches-controls';
  controls.innerHTML='<div><strong>Bankarske uplate uz račune</strong><p data-bank-message role="status">Učitavanje bankarskih uplata…</p></div><button class="secondary-button" type="button" data-bank-refresh>Osveži bankarske uplate</button><details data-bank-unlinked hidden><summary>Računi koji nisu u prikazanom spisku</summary><div></div></details>';
  const panel=document.createElement('details');panel.className='finance-sync-panel';panel.innerHTML='<summary>Banka i poslati računi <span data-finance-bank-state>Provera u toku…</span><span data-finance-mail-state></span></summary>';panel.append(controls);
  reports.querySelector('.section-head')?.insertAdjacentElement('afterend',panel);
  if (!controls.isConnected) return;
  let data=null, loadedMonth='', inFlight=false, destroyed=false, requestVersion=0, controller=null;
  const month=()=>document.getElementById('invoiceMonthFilter')?.value||'';
  const message=controls.querySelector('[data-bank-message]');
  function paymentHtml(p,kind){return `<div class="bank-payment-proof"><strong>${esc(kind)} · ${money(p.amountCents)} · ${date(p.date)}</strong><br>${esc(p.payer)}<br>${esc(p.purpose||'Bez broja računa u opisu')}<br><small>Bank ID ${esc(p.id)}</small></div>`;}
  function decorate(){
    groups.querySelectorAll('.invoice-bank-match').forEach(e=>e.remove());
    if(!data||data.month!==month())return;
    const cards=[...groups.querySelectorAll('.invoice-compact-row')],linkedIds=new Set();
    for(const card of cards){
      const clientId=card.querySelector('[data-invoice-client]')?.getAttribute('data-invoice-client');
      if(!clientId)continue;
      const rows=data.invoices.filter(x=>x.clientId===clientId); rows.forEach(x=>linkedIds.add(x.invoiceId));
      const box=document.createElement('div');box.className='invoice-bank-match';
      if(!rows.length){box.innerHTML='<small>Originalni račun iz Drive-a još nije povezan sa ovim unosom. Status plaćanja ostaje isti.</small>';(card.querySelector(".invoice-detail-content")||card).append(box);continue;}
      box.innerHTML=rows.map(x=>`<div class="bank-invoice-proof"><div class="bank-match-head"><strong>Drive račun ${String(x.number).padStart(5,'0')}</strong><span class="status ${x.status==='covered'?'ok':'warn'}">${esc(labels[x.status]||'Za proveru')}</span></div><p><b>Ukupan račun ${money(x.grossCents)}</b> · Neto ${money(x.netCents)} + PDV ${money(x.vatCents)}<br>Potvrđene bankarske uplate ${money(x.bankPaidCents)}${x.coveredAt?' · Datum '+date(x.coveredAt):''}</p><details><summary>Uplate i originalni račun</summary><p>${esc(x.filename)}<br><small>Drive proveren ${date(data.registryCheckedAt)} · Izdato ${date(x.issuedAt)}</small></p>${x.issues.map(i=>'<p class="bank-match-warning">'+esc(i)+'</p>').join('')}${x.payments.map(p=>paymentHtml(p,'Broj računa se poklapa')).join('')}${x.candidates.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(p=>paymentHtml(p,'Moguća veza — potvrditi')).join('')}${!x.payments.length&&!x.candidates.length?'<p>Nije pronađena bankarska uplata. Keš, drugi računi, Stripe naplate, avansi i storna zahtevaju zasebnu proveru.</p>':''}</details><p class="bank-card-comparison" data-compare="${esc(x.invoiceId)}"></p></div>`).join('');
      (card.querySelector(".invoice-detail-content")||card).append(box);
      for(const x of rows){
        const line=[...box.querySelectorAll('[data-compare]')].find(e=>e.dataset.compare===x.invoiceId),form=card.querySelector('.invoice-payment-form'),amountInput=form?.querySelector('[name="amount"]');
        const text=card.querySelector('.invoice-compact-amount')?.textContent||'';
        const cardCents=Math.round(Number(text.replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',','.'))*100);
        const net=x.netCents===cardCents&&x.netCents+x.vatCents===x.grossCents,gross=x.grossCents===cardCents;
        line.textContent=net&&!gross?'Iznos u aplikaciji je bez PDV-a; bankarska uplata uključuje PDV.':gross?'Iznos u aplikaciji odgovara ukupnom računu.':'Iznos u aplikaciji se razlikuje od originalnog računa — proveri razliku.';
        if(!x.clientLinkVerified) line.textContent+=' Vezu originalnog računa i ovog klijenta treba potvrditi.';
        const paid=card.querySelector('[data-invoice-field="paymentStatus"]')?.value==='Plaćeno';
        const history=card.querySelector('.invoice-payment-history')?.textContent||'';
        const duplicate=x.payments.some(p=>history.includes('Bank ID '+p.id));
        const target=net?x.netCents:x.grossCents,maximum=Math.round(Number(amountInput?.max||'0')*100);
        // Explicit owner click only prepares the existing form. Its submit is untouched.
        if(rows.length===1&&x.clientLinkVerified&&x.status==='covered'&&!x.issues.length&&(net||gross)&&!paid&&!duplicate&&form&&target<=maximum){
          const button=document.createElement('button');button.type='button';button.className='secondary-button';button.textContent='Popuni podatke za ovu uplatu';
          button.addEventListener('click',()=>{form.querySelector('[name="date"]').value=x.coveredAt;amountInput.value=(target/100).toFixed(2);form.querySelector('[name="note"]').value=('Račun '+x.number+'; Bank ID '+x.payments.map(p=>p.id).join(',')+'; bruto '+money(x.bankPaidCents)).slice(0,160);line.textContent='Proveri iznos i datum, pa klikni „Dodaj uplatu“ da sačuvaš.';form.scrollIntoView({block:'center',behavior:'smooth'});amountInput.focus();});line.after(button);
        } else if(paid)line.textContent+=' U aplikaciji je već označeno plaćeno; nema novog upisa.';
        else if(duplicate)line.textContent+=' Ova bankarska uplata je već evidentirana.';
      }
    }
    const unlinked=data.invoices.filter(x=>!linkedIds.has(x.invoiceId));const detail=controls.querySelector('[data-bank-unlinked]');detail.hidden=!unlinked.length;
    detail.querySelector('summary').textContent=`${unlinked.length} računa nije u prikazanom spisku`;
    detail.querySelector('div').innerHTML=unlinked.map(x=>`<p><strong>${String(x.number).padStart(5,'0')} · ${esc(x.client)}</strong> · ${money(x.grossCents)} · ${esc(labels[x.status])}<br><small>${esc(x.filename)}</small></p>`).join('');
  }
  async function load(force=false){
    if(destroyed||!reports.classList.contains('active'))return;
    const selected=month();if(!/^2026-\d{2}$/.test(selected))return;
    if(inFlight)return;
    if(!force&&data&&loadedMonth===selected){decorate();return;}
    inFlight=true;const version=++requestVersion;controller=new AbortController();
    const timer=setTimeout(()=>controller?.abort(),25000);message.textContent='Proveravam bankarske uplate prema originalnim Drive računima…';
    try{
      const auth=getAdminSession();if(auth?.role!=='full-admin'||!auth.token)throw Error('Potrebna je vlasnička prijava.');
      const response=await fetch('/api/bank-matches?month='+encodeURIComponent(selected),{method:'GET',headers:{Authorization:'Bearer '+auth.token},cache:'no-store',signal:controller.signal});
      const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||'Bankarska provera nije dostupna.');
      if(version!==requestVersion||destroyed||selected!==month())return;
      if(!result.readOnly||result.month!==selected||!Array.isArray(result.invoices))throw Error('Bankarska provera nije potpuna.');
      data=result;loadedMonth=selected;panel.querySelector('[data-finance-bank-state]').textContent='Banka proverena '+new Date(result.fetchedAt).toLocaleTimeString('sr-Latn-RS',{timeZone:'Europe/Vienna',hour:'2-digit',minute:'2-digit'});message.textContent='Banka proverena '+new Date(result.fetchedAt).toLocaleTimeString('sr-Latn-RS',{timeZone:'Europe/Vienna',hour:'2-digit',minute:'2-digit'})+' · Drive računi provereni '+date(result.registryCheckedAt)+'. Poklapanja su proverena prema originalnim računima.';decorate();
    }catch(error){if(version===requestVersion&&!destroyed){data=null;decorate();panel.querySelector('[data-finance-bank-state]').textContent='Banku treba proveriti';message.textContent=error.message||'Bankarska provera trenutno nije dostupna. Postojeći računi nisu menjani.';}}
    finally{clearTimeout(timer);inFlight=false;controller=null;if(!destroyed&&selected!==month())load();}
  }
  controls.querySelector('[data-bank-refresh]').addEventListener('click',()=>load(true));
  document.getElementById('invoiceMonthFilter')?.addEventListener('change',()=>{data=null;decorate();controller?.abort();load(true);});
  new MutationObserver(decorate).observe(groups,{childList:true});
  new MutationObserver(()=>load()).observe(reports,{attributes:true,attributeFilter:['class']});
  const interval=setInterval(()=>{if(document.visibilityState==='visible')load(true);},60000);
  window.addEventListener('storage',e=>{if(e.key==='marketizoAdminSession'){destroyed=true;controller?.abort();clearInterval(interval);data=null;decorate();controls.remove();}});
  load();
})();
