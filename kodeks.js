'use strict';
(()=>{
 const $=id=>document.getElementById(id),selected=new Set();
 let version=0,people=[],saved='',busy=false,ready=false,sending=false,pendingSave=null,prepared=[],historyOffset=0;
 function node(tag,text,attrs={}){const e=document.createElement(tag);if(text!==null)e.textContent=text;for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);return e;}
 function message(text,error=false){$('codeksMessage').textContent=text;$('codeksMessage').classList.toggle('codeks-error',error);}
 function value(){return JSON.stringify({title:$('codeksTitle').value,text:$('codeksText').value});}
 function dirty(){return value()!==saved;}
 function controls(){
  const editing=busy||$('codeksReview').open||!!pendingSave;
  for(const id of ['codeksTitle','codeksText','codeksSearch','codeksSelectAll'])$(id).disabled=editing;
  $('codeksSave').disabled=busy||$('codeksReview').open||(!dirty()&&version>0);
  $('codeksPrepare').disabled=busy||!!pendingSave||dirty()||version===0||selected.size===0||!ready;
  $('codeksVersion').textContent=version?'Verzija '+version:'Novi nacrt';$('codeksDirty').textContent=pendingSave?'Čuvanje nije potvrđeno · ponovi isti zahtev':dirty()?'Nesačuvane izmene':'Sačuvano';
  $('codeksSelected').textContent=selected.size+' izabrano';
  document.querySelectorAll('[data-person]').forEach(e=>e.disabled=editing||!e.dataset.email);
  $('codeksSend').disabled=sending||!$('codeksConfirm').checked||!prepared.length||prepared.some(p=>!p.alreadySent&&(!p.pdfSha256||!p.reviewed));
  $('codeksBack').disabled=sending;$('codeksConfirm').disabled=sending;
 }
 async function api(params={},body,raw=false){
  let s;try{s=JSON.parse(localStorage.getItem('marketizoAdminSession')||'null');}catch{}
  if(!s?.token||s.expiresAt<=Date.now()){location.assign('/admin-login');throw Error('Prijava je istekla.');}
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),95000);
  try{const r=await fetch('/api/codeks?'+new URLSearchParams(params),{method:body?'POST':'GET',cache:'no-store',signal:abort.signal,headers:{Authorization:'Bearer '+s.token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
   if(raw&&r.ok)return r.blob();const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw Error(d.error||'Radnja nije potvrđena. Pokušaj ponovo.');return d;
  }catch(e){if(e.name==='AbortError')throw Error('Potvrda traje duže. Ponovi istu radnju; već potvrđeno slanje se neće duplirati.');throw e;}finally{clearTimeout(timer);}
 }
 function visiblePeople(){const q=$('codeksSearch').value.trim().toLocaleLowerCase();return people.filter(p=>(p.name+' '+p.email).toLocaleLowerCase().includes(q));}
 function renderPeople(){
  $('codeksPeople').replaceChildren(...visiblePeople().map(p=>{const label=node('label',null,{class:'codeks-check'}),input=node('input',null,{type:'checkbox','data-person':p.id,'data-email':p.email});input.checked=selected.has(p.id);input.disabled=!p.email;const span=node('span',p.name);span.append(node('small',p.email||'Dodaj mejl u dosijeu zaposlenog'));input.addEventListener('change',()=>{if(input.checked)selected.add(p.id);else selected.delete(p.id);controls();});label.append(input,span);return label;}));controls();
 }
 async function history(append=false){
  const d=await api({action:'list',offset:append?historyOffset:0});if(!append)$('codeksHistory').replaceChildren();
  const statuses={pending:'Čeka potpis',processing:'Potpis sačuvan · PDF se priprema',signed:'Potpisano',prepared:'Pripremljeno · nije poslato',expired:'Poziv istekao',voided:'Poništeno'};
  for(const row of d.items){const tr=node('tr',null);tr.append(node('td',row.name),node('td','v'+row.version),node('td',statuses[row.status]||row.status),node('td',row.signedAt?new Date(row.signedAt).toLocaleString('sr-Latn-RS',{dateStyle:'medium',timeStyle:'short'}):'—'));const action=node('td',null);if(row.status==='signed'){const b=node('button','Preuzmi PDF',{type:'button',class:'secondary-button'});b.addEventListener('click',async()=>{b.disabled=true;try{const blob=await api({action:'receipt',id:row.id},null,true),url=URL.createObjectURL(blob),a=node('a',null,{href:url,download:'Marketizo-Kodeks-v'+row.version+'.pdf'});a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}catch(e){message(e.message,true);}finally{b.disabled=false;}});action.append(b);}tr.append(action);$('codeksHistory').append(tr);}
  if(!d.items.length&&!append){const tr=node('tr',null);tr.append(node('td','Još nema poslatih verzija.',{colspan:'5'}));$('codeksHistory').append(tr);}
  historyOffset=(append?historyOffset:0)+40;$('codeksMore').hidden=!d.hasMore;
 }
 $('codeksTitle').addEventListener('input',controls);$('codeksText').addEventListener('input',controls);$('codeksSearch').addEventListener('input',renderPeople);
 $('codeksSelectAll').addEventListener('click',()=>{const rows=visiblePeople().filter(p=>p.email);const all=rows.every(p=>selected.has(p.id));for(const p of rows)if(all)selected.delete(p.id);else selected.add(p.id);renderPeople();});
 $('codeksEditor').addEventListener('submit',async e=>{e.preventDefault();if(busy||!$('codeksEditor').reportValidity())return;pendingSave||={action:'save',revision:version,commandId:crypto.randomUUID(),...JSON.parse(value())};busy=true;controls();try{const d=await api({},pendingSave);version=d.template.revision;saved=value();pendingSave=null;message('Verzija '+version+' je sačuvana. Sada izaberi zaposlene za slanje.');}catch(e){message(e.message,true);}finally{busy=false;controls();}});
 function previews(){
  $('codeksPreviews').replaceChildren(...prepared.map(p=>{const wrapper=node('section',null),details=node('details',null),summary=node('summary',p.person.name+' · '+p.person.email);details.append(summary);
   if(p.error){details.append(node('p',p.error,{class:'codeks-error'}));const retry=node('button','Ponovi pripremu',{type:'button',class:'secondary-button'});retry.addEventListener('click',async()=>{retry.disabled=true;try{Object.assign(p,await api({},{action:'prepare',employeeId:p.person.id,version}),{error:null});}catch(e){p.error=e.message;}previews();});details.append(retry);}
   else if(p.alreadySent)details.append(node('p','Ova verzija je već poslata ovoj osobi. Ponovno slanje se preskače.'));
   else{for(const page of p.pages||[]){const section=node('section',null,{class:'codeks-page'});for(const block of page){section.append(node(block.heading?'h3':'p',block.text||''));}details.append(section);}const label=node('label',null,{class:'codeks-check'}),check=node('input',null,{type:'checkbox'});check.checked=!!p.reviewed;check.addEventListener('change',()=>{p.reviewed=check.checked;controls();});label.append(check,node('span','Pregledao/la sam ovu PDF verziju i primaoca.'));details.append(label);}
   wrapper.append(details);return wrapper;}));controls();
 }
 $('codeksPrepare').addEventListener('click',async()=>{
  if(busy||dirty())return;busy=true;prepared=[];$('codeksConfirm').checked=false;$('codeksSendMessage').textContent='';controls();
  try{for(const person of people.filter(p=>selected.has(p.id))){message('Pripremamo pregled: '+person.name);try{prepared.push({person,...await api({},{action:'prepare',employeeId:person.id,version})});}catch(e){prepared.push({person,error:e.message});}}$('codeksReviewSummary').textContent='Verzija '+version+' · Broj primalaca: '+prepared.length;previews();$('codeksReview').showModal();message('Pregled je pripremljen. Obaveštenja još nisu poslata.');}finally{busy=false;controls();}
 });
 $('codeksConfirm').addEventListener('change',controls);$('codeksBack').addEventListener('click',()=>{$('codeksReview').close();controls();});$('codeksReview').addEventListener('cancel',e=>{if(sending)e.preventDefault();});$('codeksReview').addEventListener('close',controls);
 $('codeksSend').addEventListener('click',async()=>{
  if(sending||$('codeksSend').disabled)return;sending=true;controls();let failed=0;
  for(const p of prepared.filter(p=>!p.alreadySent)){
   $('codeksSendMessage').textContent='Šaljemo: '+p.person.name;
   try{await api({},{action:'send',employeeId:p.person.id,version,pdfSha256:p.pdfSha256,pdfReviewed:p.reviewed,confirmed:true});p.alreadySent=true;p.error=null;}catch(e){failed++;p.error=e.message;}
  }
  sending=false;
  if(failed){$('codeksSendMessage').textContent=`Slanje nije potvrđeno za ${failed} osoba. ${prepared.filter(p=>p.error).map(p=>p.person.name+': '+p.error).join(' ')} Ponovi slanje; potvrđene osobe biće preskočene.`;controls();}
  else{$('codeksReview').close();message('Kodeks je poslat. Izabrani članovi imaju obaveštenje u svom portalu.');controls();}
  try{await history();}catch(e){message(e.message,true);}
 });
 $('codeksRefresh').addEventListener('click',()=>history().catch(e=>message(e.message,true)));$('codeksMore').addEventListener('click',()=>history(true).catch(e=>message(e.message,true)));
 window.addEventListener('beforeunload',e=>{if(dirty()||pendingSave||sending){e.preventDefault();e.returnValue='';}});
 (async()=>{try{const d=await api({action:'bootstrap'});version=d.template.revision;people=d.people;$('codeksTitle').value=d.template.title;$('codeksText').value=d.template.text;saved=value();ready=d.ready&&d.sendingEnabled;
  if(!ready){$('codeksSetup').hidden=false;$('codeksSetup').textContent=!d.ready?'Tekst možeš uređivati i sačuvati. Slanje čeka pripremu baze za kodeks.':'Tekst možeš uređivati i sačuvati. Elektronsko potpisivanje trenutno nije uključeno.';}
  renderPeople();await history();message('Uredi kodeks, sačuvaj verziju i izaberi kome šalješ.');}catch(e){message(e.message,true);}})();
})();
