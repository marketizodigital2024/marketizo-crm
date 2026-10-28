'use strict';
(() => {
 const $=id=>document.getElementById(id);
 const fieldLabels={name:'Ime i prezime',company:'Naziv firme',address:'Adresa',taxId:'Poreski broj / PIB',registrationId:'Registracioni broj firme',personalId:'JMBG / identifikacioni broj',country:'Zemlja (AT, DE, RS…)'};
 let config=null,state=null,busy=false;
 function fingerprint(value){if(Array.isArray(value))return '['+value.map(fingerprint).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+fingerprint(value[k])).join(',')+'}';return JSON.stringify(value);}
 function node(tag,text,attrs={}){const e=document.createElement(tag);if(text!==null)e.textContent=text;for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);return e;}
 function message(value,error=false){$('quickMessage').textContent=value;$('quickMessage').classList.toggle('error',error);}
 function controls(value){busy=value;document.querySelectorAll('#quickSend button,#quickSend input,#quickSend select,#quickSend textarea').forEach(e=>e.disabled=value);$('quickChooseNext').disabled=value||!state?.templateId;$('quickSendEmail').disabled=value||!$('quickConfirm').checked||state?.sendPending?.delivery==='link';$('quickCreateLink').disabled=value||!$('quickConfirm').checked||state?.sendPending?.delivery==='email';$('quickReviewBack').disabled=value||!!state?.sendPending;if(state?.sendPending)for(const id of ['quickReviewer','quickReference','quickConfirm'])$(id).disabled=true;}
 async function api(params,body){
  let session;try{session=JSON.parse(localStorage.getItem('marketizoAdminSession')||'null');}catch{}
  if(!session?.token||session.expiresAt<=Date.now()){location.assign('/admin-login');throw Error('Prijavi se ponovo.');}
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),90000);
  try{
   const response=await fetch('/api/sign-admin?'+new URLSearchParams(params),{method:body?'POST':'GET',cache:'no-store',signal:abort.signal,headers:{Authorization:'Bearer '+session.token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
   const data=await response.json().catch(()=>({}));if(!response.ok||!data.ok){const e=Error(data.error||'Radnja još nije potvrđena. Pokušaj ponovo.');e.status=response.status;throw e;}return data;
  }catch(e){if(e.name==='AbortError')throw Error('Potvrda traje duže. Podaci su zadržani; ponovi istu radnju.');throw e;}finally{clearTimeout(timer);}
 }
 function phase(step){state.step=step;for(const [id,n]of [['quickChoose',1],['quickRecipient',2],['quickReview',3],['quickSuccess',4]])$(id).hidden=n!==step;$('quickProgress').textContent=step===4?'Slanje je pripremljeno':`${step} / 3 · ${['','Izbor ugovora','Primalac','Pregled i slanje'][step]}`;message('');controls(false);$('quickSend').scrollIntoView({block:'start',behavior:'smooth'});}
 function show(){config.onOpen();$('quickSend').hidden=false;$('quickSuccessLinks').replaceChildren();$('quickConfirm').checked=false;$('quickReference').value='';$('quickReviewer').value=config.sender?.name||'';}
 function engagement(template){return template.contractDetails?.engagement||(/\b(?:part[ -]?time|20\s*(?:sati|h))\b/i.test(template.title)?'part_time':/\bfull[ -]?time\b/i.test(template.title)?'full_time':'unspecified');}
 function engagementLabel(template){return ({full_time:'Full-time',part_time:'Part-time',unspecified:'Još nije razvrstano'})[engagement(template)];}
 function templates(){
  const lang=$('quickLanguage').value,variant=state.audience==='client'?'':$('quickEngagement').value;$('quickEngagementLabel').hidden=state.audience==='client';
  const items=config.templates.filter(t=>t.category===(state.audience==='client'?'clients':'employees')&&(state.audience==='client'||(t.contractDetails?.audience==='contractor'?'contractor':'employee')===state.audience)&&(!variant||engagement(t)===variant)&&(/(?:—|-)\s*DE\s*$/i.test(t.title)?'de':'sr')===lang);
  if(!items.some(t=>t.id===state.templateId))state.templateId='';
  $('quickTemplates').replaceChildren(...items.map(t=>{const b=node('button',null,{type:'button',class:'quick-template','aria-pressed':String(t.id===state.templateId)});b.append(node('strong',t.title),node('span',t.category==='clients'?'Ugovor za klijenta':(state.audience==='contractor'?'Ugovor za saradnika':'Ugovor za zaposlenog')+' · '+engagementLabel(t)));b.addEventListener('click',()=>{state.templateId=t.id;templates();});return b;}));
  $('quickNoTemplates').textContent=variant?'Nema šablona za izabranu varijantu. Izaberi drugu varijantu ili sačuvaj poseban šablon.':'Nema šablona na izabranom jeziku. Promeni jezik ili dodaj šablon u biblioteci.';$('quickNoTemplates').hidden=items.length>0;controls(false);
 }
 function identity(values={}){
  $('quickIdentityFields').replaceChildren(...Object.entries(fieldLabels).map(([key,label])=>{const wrap=node('label',label),input=node('input',null,{id:'quickField-'+key,type:'text','data-quick-field':key,maxlength:String(({name:160,company:180,address:300,capacity:120,country:2})[key]||80)});input.value=values[key]||'';input.placeholder=({name:'Npr. Marko Marković',company:'Npr. Marko Marković PR Studio Primer',address:'Npr. Ulica primera 12, 11000 Beograd',taxId:'Npr. 123456789',registrationId:'Npr. 12345678',personalId:'JMBG / identifikacioni broj',country:'Npr. RS'})[key]||'';if(key==='country')input.pattern='[A-Za-z]{2}';wrap.append(input);return wrap;}));
 }
 function recipientStep(){
  const source=state.source,recipient=source.recipients?.[0]||{};
  $('quickChosenTemplate').textContent=source.title;$('quickEmail').value=recipient.email||'';
  const audience=source.contractDetails?.audience;
  $('quickPartyType').value=recipient.partyType||(audience==='employee'?'employee':audience==='contractor'?'business':state.audience==='client'?'business':'individual');
  const contractor=audience==='contractor';
  $('quickContractorTerms').hidden=!contractor;
  $('quickMonthlyFee').required=contractor;$('quickBonus').required=contractor;
  $('quickMonthlyFee').value=source.contractDetails?.compensation?.monthlyFee||'';
  $('quickBonus').value=source.contractDetails?.compensation?.bonus||'';
  identity(recipient);$('quickPrefill').open=false;$('quickPlace').value=source.contractDetails?.place||'';$('quickStartDate').value=source.contractDetails?.startDate||'';$('quickStartLabel').hidden=audience!=='client';
  state.contacts=config.people.filter(p=>p.kind===(state.audience==='client'?'client':'employee'));
  $('quickContact').replaceChildren(node('option','Ručni unos mejla',{value:''}),...state.contacts.map((p,i)=>node('option',p.name+(p.email?' · '+p.email:''),{value:String(i)})));
  $('quickRecipientBack').hidden=!!state.resumed;phase(2);
 }
 function data(){
  const recipient={...(state.source.recipients?.[0]||{}),role:'counterparty',email:$('quickEmail').value.trim().toLowerCase(),partyType:$('quickPartyType').value};
  document.querySelectorAll('[data-quick-field]').forEach(e=>recipient[e.dataset.quickField]=e.value.trim());recipient.country=recipient.country.toUpperCase();
  return {...structuredClone(state.source),recipientCompletion:true,recipients:[recipient],contractDetails:{...state.source.contractDetails,place:$('quickPlace').value.trim(),startDate:$('quickStartDate').value,...(state.source.contractDetails?.audience==='contractor'?{compensation:{monthlyFee:$('quickMonthlyFee').value.trim(),bonus:$('quickBonus').value.trim()}}:{})}};
 }
 async function archivePrepared(){
  if(!state.record||state.sendPending)return;
  const d=state.record;
  if(d.revision&&['draft','ready'].includes(d.status))await api({},{action:'archive',id:d.id,kind:'document',revision:d.revision,commandId:state.archiveCommand||=crypto.randomUUID()});
  state.record=null;state.archiveCommand=null;state.savePending=null;state.pdfPending=null;state.frozenFingerprint=null;state.preparedSha='';
 }
 function renderPreview(preview){
  if(!Array.isArray(preview.pages)||!preview.pages.length||!preview.pages.some(p=>p.some(b=>b.text)))throw Error('Pregled nije učitan. Pokušaj ponovo.');
  $('quickPreview').replaceChildren(...preview.pages.map((blocks,i)=>{const section=node('section',null,{class:'quick-preview-page'});section.append(node('p',`Strana ${i+1} / ${preview.pages.length}`,{class:'quick-page-number'}));for(const b of blocks){const p=node(b.heading?'h3':'p',null);if(Array.isArray(b.columns)&&b.columns.length===2){p.className='party-row';p.append(...b.columns.map(text=>node('span',text)));}else p.textContent=b.text;section.append(p);}return section;}));
  if(preview.issuer){const issuer=node('p',[preview.issuer.name,preview.issuer.address,preview.issuer.email].filter(Boolean).join(' · '),{class:'quick-preview-issuer'});$('quickPreview').prepend(issuer);}
  $('quickPreview').scrollTop=0;
 }
 async function review(existing=false){
  if(busy)return;
  if(!existing&&!$('quickRecipient').reportValidity())return;
  controls(true);message('Pripremamo ceo ugovor za pregled…');
  try{
   const draft=existing?state.record.data:data();
   if(draft.signatureMethod!=='ses')throw Error('Ovaj ugovor traži poseban način potpisa. Otvori ga kroz napredno uređivanje.');
   const stamp=fingerprint(draft);
   if(state.record?.status==='ready'&&state.frozenFingerprint!==stamp)await archivePrepared();
   if(!state.record)state.record={id:crypto.randomUUID(),revision:0,status:'draft',data:draft};
   if(state.record.status==='draft'){
    if(!state.savePending||state.savePending.fingerprint!==stamp)state.savePending={fingerprint:stamp,commandId:crypto.randomUUID()};
    const saved=await api({},{action:'save',kind:'document',id:state.record.id,revision:state.record.revision,data:draft,commandId:state.savePending.commandId});
    state.record={...state.record,revision:saved.revision,data:draft};state.savePending=null;
   }
   state.pdfPending||={commandId:crypto.randomUUID()};
   const prepared=await api({},{action:'preparePdf',id:state.record.id,revision:state.record.revision,commandId:state.pdfPending.commandId});
   state.record=prepared.document;state.preparedSha=prepared.pdfSha256;state.frozenFingerprint=stamp;state.pdfPending=null;
   const preview=await api({action:'preparedPreview',id:state.record.id});
   if(preview.pdfSha256!==state.preparedSha)throw Error('Pregled ne odgovara poslednjem ugovoru. Pokušaj ponovo.');
   renderPreview(preview);$('quickDeliverySummary').textContent=state.record.title+' → '+state.record.data.recipients[0].email;
   $('quickConfirm').checked=false;$('quickReviewDetails').open=!$('quickReviewer').value;phase(3);
  }catch(e){if(state.record?.revision){try{const latest=await api({action:'get',id:state.record.id});state.record=latest.document;if(state.record.status==='ready')state.frozenFingerprint=fingerprint(state.record.data);}catch{}}message(e.message,true);}finally{controls(false);}
 }
 async function send(delivery){
  if(busy||!state?.preparedSha)return;
  if(!$('quickSendForm').reportValidity())return;
  const ref=$('quickReference').value.trim();
  if($('quickReviewer').value.trim().length<3||(ref&&ref.length<5)){$('quickReviewDetails').open=true;message('Upiši ime osobe koja šalje ugovor i najmanje pet znakova ako dodaješ referencu provere.',true);return;}
  const body={action:'send',...(delivery==='link'?{delivery}:{}),id:state.record.id,revision:state.record.revision,review:{decision:$('quickConfirm').checked?'ses_allowed':'unknown',reviewedBy:$('quickReviewer').value.trim(),reference:ref||'Izričita potvrda pošiljaoca pri pregledu ovog konkretnog ugovora i primaoca: proveren je i dozvoljen ovaj način jednostavnog elektronskog potpisivanja.',pdfSha256:state.preparedSha,pdfReviewed:$('quickConfirm').checked}};
  if(!state.sendPending)state.sendPending={body,commandId:crypto.randomUUID(),delivery};
  // A timeout retries the exact same command, recipient, delivery and reviewed PDF.
  controls(true);message('Čekamo potvrdu slanja…');
  try{
   const result=await api({},{...state.sendPending.body,commandId:state.sendPending.commandId});
   state.sent=true;
   const linkMode=state.sendPending.delivery==='link';
   $('quickSuccessTitle').textContent=linkMode?'Link za potpis je spreman.':'Ugovor je predat na slanje.';
   $('quickSuccessText').textContent=linkMode?'Kopiraj ovaj link i podeli ga samo sa primaocem. Pozivni mejl nije poslat.':`Primalac: ${state.record.data.recipients[0].email}. Dopuniće podatke koji nedostaju, pregledati ugovor i potpisati. Završni PDF dobija mejlom kada svi potpišu.`;
   $('quickSuccessLinks').replaceChildren(...(result.links||[]).map(link=>{const label=node('label',link.email),input=node('input',null,{readonly:'',type:'text'});input.value=link.url;label.append(input);return label;}));
   phase(4);
  }catch(e){if(e.status>=400&&e.status<500&&e.status!==409)state.sendPending=null;message(e.message+(state.sendPending?' Podaci su zadržani. Ponovi slanje da proverimo isti zahtev.':''),true);}finally{controls(false);}
 }
 async function exit(){
  if(busy)return;
  controls(true);
  try{if(!state?.sent&&!state?.resumed&&!state?.sendPending)await archivePrepared();$('quickSend').hidden=true;state=null;config.onExit();}catch(e){message(e.message,true);}finally{controls(false);}
 }
 async function start(audience){if(busy||!config)return;state={audience,templateId:'',step:1};show();$('quickEmail').value='';$('quickLanguage').value='sr';$('quickEngagement').value='';templates();phase(1);}
 async function resume(doc){
  if(busy||!config)return;
  state={audience:doc.data.contractDetails?.audience==='contractor'?'contractor':doc.data.category==='clients'?'client':'employee',source:structuredClone(doc.data),record:structuredClone(doc),resumed:true,templateId:'',frozenFingerprint:fingerprint(doc.data)};show();recipientStep();
  if(doc.status==='ready'){
   controls(true);
   try{await api({action:'requestStatus',id:doc.id});state.sent=true;$('quickSuccessTitle').textContent='Ugovor je već predat na potpisivanje.';$('quickSuccessText').textContent='Vrati se na listu ugovora da proveriš njegov status.';phase(4);return;}
   catch(e){if(e.status!==404){message(e.message,true);return;}}finally{controls(false);}
   await review(true);
  }
 }
 $('quickLanguage').addEventListener('change',templates);$('quickEngagement').addEventListener('change',templates);
 $('quickChooseNext').addEventListener('click',async()=>{if(busy||!state.templateId)return;controls(true);message('Učitavamo izabrani ugovor…');try{const r=await api({action:'get',kind:'template',id:state.templateId});if(state.audience!=='client'&&(r.document.data.contractDetails?.audience==='contractor'?'contractor':'employee')!==state.audience)throw Error('Izaberi šablon za odgovarajuću vrstu angažovanja.');state.source={...r.document.data,contractDetails:{...r.document.data.contractDetails,...(state.audience!=='client'&&engagement(r.document.data)!=='unspecified'?{engagement:engagement(r.document.data)}:{})},dossier:null,parentDocumentId:null,recipients:structuredClone(state.recipientDraft||[]),recipientCompletion:true};recipientStep();}catch(e){message(e.message,true);}finally{controls(false);}});
 $('quickContact').addEventListener('change',()=>{const p=state.contacts[Number($('quickContact').value)];if($('quickContact').value===''||!p)return;$('quickEmail').value=p.email||'';identity(p.kind==='client'?{company:p.company||p.name}:{name:p.name});$('quickPrefill').open=true;});
 $('quickRecipient').addEventListener('submit',e=>{e.preventDefault();review();});
 $('quickRecipientBack').addEventListener('click',()=>{state.recipientDraft=data().recipients;phase(1);});
 $('quickReviewBack').addEventListener('click',async()=>{if(busy||state.sendPending)return;controls(true);try{await archivePrepared();state.resumed=false;phase(2);}catch(e){message(e.message,true);}finally{controls(false);}});
 $('quickConfirm').addEventListener('change',()=>controls(false));
 $('quickSendForm').addEventListener('submit',e=>{e.preventDefault();send('email');});
 $('quickCreateLink').addEventListener('click',()=>send('link'));
 $('quickCancel').addEventListener('click',exit);$('quickDone').addEventListener('click',exit);
 $('quickEditText').addEventListener('click',()=>{if(busy)return;const doc={...(state.record||{id:crypto.randomUUID(),revision:0,status:'draft',archived_at:null}),data:data()};$('quickSend').hidden=true;state=null;config.onEdit(doc);});
 window.addEventListener('beforeunload',e=>{if(busy||(state&&!state.sent&&$('quickEmail').value.trim())){e.preventDefault();e.returnValue='';}});
 window.MarketizoQuickSign={init(options){config=options;document.querySelectorAll('[data-quick-audience]').forEach(button=>{button.disabled=!options.sendingEnabled;button.addEventListener('click',()=>start(button.dataset.quickAudience));});},setTemplates(items){if(config)config.templates=items;},resume};
})();
