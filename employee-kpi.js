(()=>{
 'use strict';
 const $=id=>document.getElementById(id),A=window.MarketizoWorkAnalytics;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fmt=(n,d=1)=>Number(n||0).toLocaleString('sr-Latn-RS',{maximumFractionDigits:d});
 let data=null,roster=null,selected='',rosterSequence=0,loading=false,session=null;
 const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Vienna',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 function getSession(){const keys=new URLSearchParams(location.search).get('portal')==='employee'?['marketizoEmployeeSession']:['marketizoAdminSession','marketizoEmployeeSession'];for(const key of keys){try{const s=JSON.parse(localStorage.getItem(key)||'null');if(s?.token&&Number(s.expiresAt)>Date.now())return s;}catch{}}return null;}
 function pickPeriod(kind){const t=today(),date=new Date(t+'T12:00:00Z');let from,to=t;
  if(kind==='week'){const offset=(date.getUTCDay()+6)%7;date.setUTCDate(date.getUTCDate()-offset);from=date.toISOString().slice(0,10);}
  else if(kind==='previous'){date.setUTCDate(0);to=date.toISOString().slice(0,10);from=to.slice(0,8)+'01';}
  else from=t.slice(0,8)+'01';
  $('ekFrom').value=from;$('ekTo').value=to;document.querySelectorAll('[data-period]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.period===kind)));
 }
 const employees=()=>data.employees.filter(e=>e.active);
 const filters=()=>({from:$('ekFrom').value,to:$('ekTo').value,position:$('ekRole').value,employee:$('ekEmployee').value});
 const result=extra=>A.analyze(data,{...filters(),...extra});
 const outputText=g=>Object.entries(g?.unitTotals||{}).map(([u,v])=>`${fmt(v.quantity,0)} ${A.plural[u]||u}`).join(' · ')||'Količina nije evidentirana';
 const rosterIds=e=>new Set((roster?.rows||[]).filter(c=>Object.values(c.roles).some(ids=>ids.includes(e.id))).map(c=>c.id));
 const listed=()=>employees().filter(e=>(!$('ekRole').value||e.positions.includes($('ekRole').value))&&(!$('ekEmployee').value||e.id===$('ekEmployee').value));
 function metrics(e){const roles=e?.positions||[];let sets=[];
  if(roles.some(r=>/Editor|Lider editora/.test(r)))sets.push(['Edit','Klipovi prihvaćeni do roka; prolaz prve kontrole; minuti dorada zbog potvrđene greške.']);
  if(roles.some(r=>/Social Media Manager/.test(r)))sets.push(['SMM','Objave po planu; obavljena kontrola pre objave; pravovremena komunikacija.']);
  if(roles.some(r=>/Scenario/.test(r)))sets.push(['Scenario','Prihvaćeni scenariji u roku; usklađenost sa briefom; razlozi vraćanja na doradu.']);
  if(roles.some(r=>/Snimatelj/.test(r)))sets.push(['Snimanje','Realizovani termini; upotrebljivost materijala; pravovremen upload.']);
  if(roles.some(r=>/Media Buy|Paid Ads/i.test(r)))sets.push(['Media buying','Kontrolna lista lansiranja; odobreni budžet; provere i reakcije; rezultat prema cilju klijenta.']);
  if(roles.some(r=>/Sales/.test(r)))sets.push(['Sales','Obrada leadova u roku; održani sastanci; konverzija kvalifikovanih sastanaka u prodaju.']);
  if(e?.isLeader)sets.push(['Liderski učinak','Raspodela rada; sprovedene kontrole; rešavanje blokada; ponavljanje problema u timu.']);
  if(!sets.length)sets=[['Učinak','Isporuka prema dogovorenom obimu i roku, kvalitet rada i konkretni potvrđeni propusti.']];
  return sets.map(([title,text])=>`<div class="ek-rule"><strong>${esc(title)}</strong><p>${esc(text)}</p></div>`).join('');
 }
 function detail(){const e=employees().find(e=>e.id===selected);if(!e){$('ekDetail').innerHTML='<h2>Izaberi zaposlenog</h2>';$('ekMetrics').innerHTML='';return;}
  const r=result({employee:e.id,position:''}),cs=(roster?.rows||[]).filter(c=>Object.values(c.roles).some(ids=>ids.includes(e.id)));
  $('ekDetail').innerHTML=`<p class="eyebrow">Dosije učinka</p><h2>${esc(e.name)}</h2><p class="ek-muted">${esc(e.positions.join(' / '))}</p><div class="ek-rule"><strong>${esc(outputText({unitTotals:r.unitTotals}))}</strong><p>${fmt(r.totalMinutes/60)} h evidentiranog rada · ${fmt(r.entries,0)} unosa${e.startDate?' · u timu od '+esc(e.startDate):''}</p></div><div class="ek-rule"><strong>Ocena i potvrđeni propusti: nema obračuna</strong><p>Potrebni su ciljevi, prihvatanje isporuke i provereni događaji. Količina rada nije ocena kvaliteta.</p></div><div class="ek-rule"><strong>Trenutna zaduženja</strong><p>${roster?.live?(cs.map(c=>esc(c.name)).join(' · ')||'Nema pronađenog aktivnog zaduženja u raspodeli.'):'Raspodela nije dostupna.'}</p></div>`;
  $('ekMetricsTitle').textContent='Šta merimo za ovu osobu';$('ekMetrics').innerHTML=metrics(e);
 }
 function renderTeam(){const f=filters();if(!f.from||!f.to||f.from>f.to){$('ekStatus').textContent='Izaberi ispravan period: početak treba da bude pre kraja.';return;}
  const r=result(),es=listed(),groups=new Map(r.groups.map(g=>[g.key,g]));
  const uniqueClients=new Set(r.logs.map(l=>l.clientId).filter(Boolean));
  $('ekStats').innerHTML=[['Zaposleni',es.length,'u izabranom prikazu'],['Evidentirani sati',fmt(r.totalMinutes/60)+' h',fmt(r.entries,0)+' unosa rada'],['Klijenti sa radom',uniqueClients.size,'u izabranom periodu'],['Potvrđeni propusti','—','evidencija još nije uključena']].map(([label,n,note])=>`<div class="ek-stat"><span>${esc(label)}</span><strong>${esc(n)}</strong><small>${esc(note)}</small></div>`).join('');
  if(!es.some(e=>e.id===selected))selected=es[0]?.id||'';
  $('ekRows').innerHTML=es.map(e=>{const g=groups.get(e.id);return `<tr${e.id===selected?' class="selected"':''}><td><button class="ek-name" type="button" data-person="${esc(e.id)}">${esc(e.name)}</button><div class="ek-secondary">${esc(e.positions.join(' / '))}</div></td><td>${esc(g?outputText(g):'Nema unosa u periodu')}</td><td class="ek-number">${fmt((g?.minutes||0)/60)} h</td><td>${roster?.live?rosterIds(e).size:'—'}<div class="ek-secondary">trenutna raspodela</div></td><td><span class="ek-badge">Nema obračuna</span><div class="ek-secondary">Ocena i propusti</div></td></tr>`;}).join('')||'<tr><td colspan="5">Nema zaposlenih u izabranom prikazu.</td></tr>';
  $('ekStatus').textContent=`${data.scope==='all'?'Ceo tim':'Samo tvoj tim'} · ${f.from} – ${f.to} · ${fmt(r.entries,0)} unosa · podaci iz zajedničke baze${r.invalidOutputs?' · potrebna provera '+fmt(r.invalidOutputs,0)+' zapisa količine':''}`;
  detail();renderClient();
 }
 function clientRows(){const known=new Map(data.clients.map(c=>[c.id,{...c}]));for(const l of data.logs)if(l.clientId&&!known.has(l.clientId))known.set(l.clientId,{id:l.clientId,name:l.clientName||'Klijent iz istorije'});return [...known.values()].sort((a,b)=>(a.clickupName||a.name).localeCompare(b.clickupName||b.name,'sr'));}
 function renderClient(){const id=$('ekClient').value,c=clientRows().find(c=>c.id===id);if(!c){$('ekClientDetail').innerHTML='<p class="ek-empty">Nema klijenata u dostupnoj evidenciji.</p>';$('ekPipeline').innerHTML='';$('ekClientRows').innerHTML='';return;}
  const r=result({client:id,employee:$('ekEmployee').value}),rows=(roster?.rows||[]).filter(row=>row.clientId===id),row=rows.length===1?rows[0]:null;
  $('ekClientDetail').innerHTML=`<h2>${esc(c.clickupName||c.name)}</h2><p class="ek-muted">Status u CRM-u: ${esc(c.status||'istorijski zapis')} · ${fmt(r.totalMinutes/60)} h u izabranom periodu</p><p class="ek-footnote">Rokovi, planirani obim i prihvatanje isporuke još nisu povezani. Status „aktivan“ sam po sebi nije potvrda početka isporuke.</p>`;
  const names=new Map(data.employees.map(e=>[e.id,e.name]));
  $('ekPipeline').innerHTML=[['Scenarista','Scenario'],['Snimatelj','Snimanje'],['Editor','Edit'],['Checking','Kontrola'],['Social Media Manager','Objava'],['Paid Ads','Plaćene reklame']].map(([key,label])=>`<div class="ek-stage"><span>${label}</span><strong>${row?(row.roles[key]||[]).map(id=>esc(names.get(id))).join(', ')||(data.scope==='all'?'Nije dodeljeno':'Van tvog tima / nije dodeljeno'):'Raspodela nije jednoznačno povezana'}</strong><span>Rok i kvalitet: bez obračuna</span></div>`).join('');
  const byId=new Map(data.employees.map(e=>[e.id,e]));$('ekClientRows').innerHTML=r.groups.map(g=>`<tr><td>${esc(byId.get(g.key)?.name||g.name)}</td><td>${esc(outputText(g))}</td><td class="ek-number">${fmt(g.minutes/60)} h</td></tr>`).join('')||'<tr><td colspan="3">Nema evidentiranog rada u izabranom periodu.</td></tr>';
 }
 function init(){const es=employees().sort((a,b)=>a.name.localeCompare(b.name,'sr'));
  $('ekScope').textContent=data.scope==='all'?'Miljan i Ivana · ceo tim':data.viewer.name+' · njegov tim';
  $('ekRole').innerHTML='<option value="">Sve pozicije</option>'+[...new Set(es.flatMap(e=>e.positions))].sort().map(r=>`<option>${esc(r)}</option>`).join('');
  $('ekEmployee').innerHTML='<option value="">Svi zaposleni</option>'+es.map(e=>`<option value="${esc(e.id)}">${esc(e.name)}</option>`).join('');
  $('ekIncidentEmployee').innerHTML='<option value="">Izaberi zaposlenog</option>'+es.map(e=>`<option value="${esc(e.id)}">${esc(e.name)}</option>`).join('');
  const cs=clientRows();$('ekClient').innerHTML=cs.map(c=>`<option value="${esc(c.id)}">${esc(c.clickupName||c.name)}</option>`).join('');$('ekIncidentClient').innerHTML='<option value="">Interna aktivnost</option>'+cs.map(c=>`<option value="${esc(c.id)}">${esc(c.clickupName||c.name)}</option>`).join('');
  const leaders=es.filter(e=>e.isLeader);$('ekOrganization').innerHTML=data.scope==='all'?leaders.map(l=>`<div class="ek-rule"><strong>${esc(l.name)}</strong><p>${es.filter(e=>e.leaderId===l.id).map(e=>esc(e.name)).join(' · ')||'Nema direktno dodeljenih zaposlenih.'}</p></div>`).join('')+`<div class="ek-rule"><strong>Bez dodeljenog lidera</strong><p>${es.filter(e=>!e.leaderId&&!e.isLeader).map(e=>esc(e.name)).join(' · ')||'—'}</p></div>`:`<p>${es.map(e=>esc(e.name)).join(' · ')||'Nema direktno dodeljenih zaposlenih.'}</p>`;
  $('ekCreated').value=new Date().toLocaleString('sr-Latn-RS',{timeZone:'Europe/Vienna'});$('ekApp').hidden=false;$('ekDenied').hidden=true;renderTeam();
 }
 async function read(url){const response=await fetch(url,{headers:{Authorization:'Bearer '+session.token},cache:'no-store',signal:AbortSignal.timeout(22000)});const body=await response.json().catch(()=>({}));if(!response.ok||!body.ok){const error=Error(body.error||'Pregled nije dostupan.');error.status=response.status;throw error;}return body;}
 async function load(){if(loading)return;loading=true;$('ekRefresh').disabled=true;const seq=++rosterSequence;session=getSession();
  if(!session){$('ekApp').hidden=true;$('ekDenied').hidden=false;$('ekDeniedMessage').textContent='Prijavi se kao Miljan, Ivana ili lider svojim postojećim nalogom.';$('ekStatus').textContent='Prijava je potrebna.';loading=false;$('ekRefresh').disabled=false;return;}
  try{const loaded=await read('/api/employee-kpi');if(seq!==rosterSequence)return;data=loaded;roster=null;init();$('ekRosterStatus').textContent='Čitam trenutnu raspodelu…';
   read('/api/employee-kpi?view=assignments').then(r=>{if(seq!==rosterSequence)return;roster=r;$('ekRosterStatus').textContent=r.live?`${data.scope==='all'?r.rows.length+' aktivnih klijenata u raspodeli':'Raspodela samo za tvoj tim'} · trenutna zaduženja, bez istorije zamena.`:r.error;renderTeam();}).catch(e=>{if(seq!==rosterSequence)return;$('ekRosterStatus').textContent='Raspodela trenutno nije dostupna. Evidencija rada je prikazana.';if(e.status===401||e.status===403){data=null;roster=null;$('ekApp').hidden=true;$('ekDenied').hidden=false;$('ekDeniedMessage').textContent=e.message;}});
  }catch(e){if(seq!==rosterSequence)return;data=null;roster=null;$('ekApp').hidden=true;$('ekDenied').hidden=false;$('ekDeniedMessage').textContent=e.message;$('ekStatus').textContent='Podaci nisu menjani.';}finally{loading=false;$('ekRefresh').disabled=false;if(seq!==rosterSequence)load();}
 }
 $('ekRefresh').addEventListener('click',load);document.querySelectorAll('[data-period]').forEach(b=>b.addEventListener('click',()=>{pickPeriod(b.dataset.period);if(data)renderTeam();}));
 for(const id of ['ekFrom','ekTo','ekRole','ekEmployee'])$(id).addEventListener('change',()=>{if(data)renderTeam();});
 $('ekRows').addEventListener('click',e=>{const b=e.target.closest('[data-person]');if(b){selected=b.dataset.person;renderTeam();}});$('ekClient').addEventListener('change',()=>{if(data)renderClient();});
 document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(t=>{const on=t===b;t.setAttribute('aria-selected',String(on));$('ek'+t.dataset.tab).hidden=!on;});}));
 $('ekForm').addEventListener('submit',e=>{e.preventDefault();if(!data)return;const f=e.target,p=employees().find(p=>p.id===$('ekIncidentEmployee').value);if(!p)return;const now=new Date().toLocaleString('sr-Latn-RS',{timeZone:'Europe/Vienna'});$('ekCreated').value=now;$('ekDraft').hidden=false;$('ekDraft').innerHTML=`<strong>Nacrt — nije sačuvan</strong><p>${esc(p.name)} · događaj ${esc(f.elements.eventDate.value)} · težina ${esc(f.elements.severity.value)}/5</p><p>${esc(f.elements.actual.value)}</p><p class="ek-muted">Za proveru · ${esc(f.elements.cause.value)} · pripremljeno ${esc(now)}. U zbir ulazi tek kada bude potvrđeno i čuvanje uključeno.</p>`;});
 window.addEventListener('storage',e=>{if(['marketizoAdminSession','marketizoEmployeeSession'].includes(e.key)||e.key===null){data=null;roster=null;rosterSequence++;$('ekApp').hidden=true;$('ekDraft').textContent='';load();}});
 window.addEventListener('pagehide',()=>{data=null;roster=null;});window.addEventListener('pageshow',e=>{if(e.persisted){$('ekApp').hidden=true;load();}});
 pickPeriod('month');load();
})();
