const $=id=>document.getElementById(id);
const roleNames=['Scenarista','Voice Over','Editor','Checking','Social Media Manager','Snimatelj','Paid Ads'];
let data=null,clickup=null;
function node(tag,text,attributes={}) { const n=document.createElement(tag); if(text!=null)n.textContent=text; for(const [k,v] of Object.entries(attributes))n.setAttribute(k,v); return n; }
function option(value,label){return node('option',label,{value});}
function message(text){$('message').textContent=text;}
function norm(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/^\s*\d+\s*[.\\]\s*/,'').replace(/\b(enterprise|business|starter|custom)\b.*$/,'').replace(/[^a-z0-9]+/g,' ').trim();}
function people(value){return String(value||'').split(/\s*;\s*/).map(x=>x.trim()).filter(x=>x&&!/^(klijent|eleven labs|-)$/i.test(x));}
function roster(clientId){
  const override=data.assignments.find(x=>x.clientId===clientId); if(override)return override.roles;
  const client=data.clients.find(x=>x.id===clientId), linked=data.links.find(x=>x.clientId===clientId)?.clickupName;
  const match=linked?clickup.rows.find(x=>x.Klijent===linked):clickup.rows.find(x=>norm(x.Klijent)===norm(client?.name));
  return roleNames.flatMap(role=>people(match?.[role]).map(name=>({role,name,employeeId:data.employees.find(e=>norm(e.name)===norm(name))?.id||null})));
}
async function api(action,body){const response=await fetch(`/api/kpi?action=${action}`,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,credentials:'same-origin',cache:'no-store'});const result=await response.json();if(!response.ok)throw new Error(result.error||'Greška pri čuvanju.');return result;}
async function load(){try{data=await api('admin');clickup=data.clickup;$('login').hidden=true;$('dashboard').hidden=false;render();message('');}catch(error){$('dashboard').hidden=true;$('login').hidden=false;message(error.message);}}
function render(){
  $('clickupStatus').textContent=clickup.live?`ClickUp raspodela učitana uživo: ${new Date(clickup.syncedAt).toLocaleString('sr-Latn-RS')}`:clickup.error;
  renderUnmatched();
  const prior=$('client').value;$('client').replaceChildren(option('','Izaberi klijenta'),...data.clients.sort((a,b)=>a.name.localeCompare(b.name)).map(c=>option(c.id,c.name)));$('client').value=prior||'';
  const selectedClient=$('filterClient').value,selectedEmployee=$('filterEmployee').value,selectedRole=$('filterRole').value;
  $('filterClient').replaceChildren(option('','Svi klijenti'),...data.clients.map(c=>option(c.id,c.name)));
  $('filterEmployee').replaceChildren(option('','Svi zaposleni'),...data.employees.map(e=>option(e.id,e.name)));
  $('filterRole').replaceChildren(option('','Sve uloge'),...roleNames.map(r=>option(r,r)));
  $('filterClient').value=selectedClient;$('filterEmployee').value=selectedEmployee;$('filterRole').value=selectedRole;
  renderRoster();renderQuestions();renderResults();
}
function renderUnmatched(){const root=$('unmatched');root.replaceChildren();if(!data.unmatched.length)return;root.append(node('h3','Novi ili nepovezani klijenti iz ClickUp-a'),node('p','Ako klijent već postoji u CRM-u pod drugim imenom, poveži ga. Ako ne postoji, prvo ga dodaj u CRM.'));
  for(const name of data.unmatched){const row=node('div',null,{class:'row'});row.append(node('strong',name));const select=node('select');select.append(option('','Izaberi CRM klijenta'),...data.clients.map(c=>option(c.id,c.name)));const button=node('button','Poveži',{type:'button'});button.onclick=async()=>{try{await api('link',{clickupName:name,clientId:select.value});await load();message('ClickUp klijent je povezan sa CRM-om.');}catch(error){message(error.message);}};row.append(select,button);root.append(row);}}
function renderRoster(){const id=$('client').value, container=$('roster');container.replaceChildren();if(!id){container.textContent='Izaberi klijenta da vidiš tim iz ClickUp raspodele.';return;}const entries=roster(id);if(!entries.length){container.textContent='Tim nije pronađen. Dodaj ga ručno pre pravljenja linka.';return;}for(const entry of entries)container.append(node('div',`${entry.role}: ${entry.name}${entry.employeeId?'':' · nije povezan sa zapisom zaposlenog'}`));}
function roleRow(entry={role:'Editor',name:'',employeeId:null}){const row=node('div',null,{class:'row'});const role=node('select');roleNames.forEach(x=>role.append(option(x,x)));role.value=entry.role;role.setAttribute('aria-label','Uloga');const name=node('input',null,{placeholder:'Ime ako osoba nije u CRM-u','aria-label':'Ime i prezime'});name.value=entry.name;const employee=node('select');employee.setAttribute('aria-label','Zaposleni iz CRM-a');employee.append(option('','Izaberi zaposlenog ili upiši ime'));data.employees.forEach(e=>employee.append(option(e.id,e.name)));employee.value=entry.employeeId||'';employee.onchange=()=>{if(employee.value)name.value=data.employees.find(e=>e.id===employee.value)?.name||'';};name.oninput=()=>{if(employee.value&&name.value.trim()!==data.employees.find(e=>e.id===employee.value)?.name)employee.value='';};const remove=node('button','Ukloni',{type:'button'});remove.onclick=()=>row.remove();row.append(role,name,employee,remove);return row;}
function renderRoleEditor(){$('roleRows').replaceChildren(...roster($('client').value).map(roleRow));$('rosterEditor').hidden=false;}
function questionRow(q={id:crypto.randomUUID(),target:'team',type:'rating',text:'',required:true,options:[]}){const row=node('div',null,{class:'row question-row'});row.dataset.id=q.id;const text=node('input',null,{placeholder:'Tekst pitanja'});text.value=q.text;const target=node('select');target.append(option('team','Ceo tim'),...roleNames.map(r=>option(r,r)));target.value=q.target;const type=node('select');[['rating','Ocena 1–5'],['choice','Jedan izbor'],['text','Tekst']].forEach(([v,t])=>type.append(option(v,t)));type.value=q.type;const options=node('input',null,{placeholder:'Opcije odvojene zarezom'});options.value=(q.options||[]).join(', ');const required=node('label');required.append(node('input',null,{type:'checkbox'}),node('span','Obavezno'));required.querySelector('input').checked=q.required;const remove=node('button','Ukloni',{type:'button'});remove.onclick=()=>row.remove();row.append(text,target,type,options,required,remove);return row;}
function renderQuestions(){$('questions').replaceChildren(...data.questions.map(questionRow));}
function readQuestions(){return [...$('questions').children].map(row=>{const [text,target,type,options,required]=row.children;return{id:row.dataset.id,text:text.value.trim(),target:target.value,type:type.value,options:options.value.split(',').map(x=>x.trim()).filter(Boolean),required:required.querySelector('input').checked};});}
function renderResults(){
  if(!data)return;
  const fc=$('filterClient').value,fe=$('filterEmployee').value,fr=$('filterRole').value,fm=$('filterMonth').value;
  const rows=data.responses.filter(r=>(!fc||r.clientId===fc)&&(!fm||r.month===fm)&&(!fe||r.team.some(x=>x.employeeId===fe))&&(!fr||r.team.some(x=>x.role===fr)));
  const average=values=>values.length?(values.reduce((sum,value)=>sum+value,0)/values.length).toFixed(1):'—';
  const countText=(count,one,many)=>`${count} ${count===1?one:many}`;
  const score=(response,question)=>{const value=Number(response.answers[question.id]);return question.type==='rating'&&value>=1&&value<=5?value:null;};
  const matches=(question,person)=>question.target===person.role&&(question.targetEmployeeId?question.targetEmployeeId===person.employeeId:question.targetName===person.name);
  const employees=new Map(),teams=new Map(),individualScores=[],allTeamScores=[];
  for(const response of rows){
    const visiblePeople=response.team.filter(person=>(!fe||person.employeeId===fe)&&(!fr||person.role===fr));
    const teamRatings=response.questions.filter(q=>q.target==='team').map(q=>score(response,q)).filter(n=>n!==null);
    allTeamScores.push(...teamRatings);
    let team=teams.get(response.clientId);
    if(!team){team={name:response.clientName,responses:0,scores:[],people:new Map()};teams.set(response.clientId,team);}
    team.responses++;team.scores.push(...teamRatings);
    for(const person of visiblePeople){
      const personKey=person.employeeId||`name:${norm(person.name)}`;
      let employee=employees.get(personKey);
      if(!employee){employee={name:person.name,linked:!!person.employeeId,scores:[],roles:new Map(),clients:new Map(),responses:new Set()};employees.set(personKey,employee);}
      employee.responses.add(response.id);
      const ratings=response.questions.filter(q=>matches(q,person)).map(q=>score(response,q)).filter(n=>n!==null);
      employee.scores.push(...ratings);individualScores.push(...ratings);
      if(!employee.roles.has(person.role))employee.roles.set(person.role,[]);
      employee.roles.get(person.role).push(...ratings);
      if(!employee.clients.has(response.clientId))employee.clients.set(response.clientId,{name:response.clientName,scores:[],teamScores:[]});
      const client=employee.clients.get(response.clientId);client.scores.push(...ratings);client.teamScores.push(...teamRatings);
      const teamPersonKey=`${personKey}:${person.role}`;
      if(!team.people.has(teamPersonKey))team.people.set(teamPersonKey,{name:person.name,role:person.role,scores:[]});
      team.people.get(teamPersonKey).scores.push(...ratings);
    }
  }
  const metric=(label,value,detail)=>{const item=node('div',null,{class:'kpi-metric'});item.append(node('span',label),node('strong',value),node('small',detail));return item;};
  $('summary').replaceChildren(metric('Odgovora',String(rows.length),'U izabranom periodu'),metric('Ocenjenih osoba',String([...employees.values()].filter(x=>x.scores.length).length),'Sa ličnom ocenom'),metric('Ocena zaposlenih',`${average(individualScores)} / 5`,countText(individualScores.length,'pojedinačna ocena','pojedinačnih ocena')),metric('Ocena timova',`${average(allTeamScores)} / 5`,countText(teams.size,'klijent','klijenata')));
  const employeeRoot=$('employeeDashboard');employeeRoot.replaceChildren();
  const employeeItems=[...employees.values()].sort((a,b)=>a.name.localeCompare(b.name,'sr'));
  if(!employeeItems.length)employeeRoot.append(node('p','Nema ocenjenih zaposlenih za izabrane filtere.',{class:'empty-state'}));
  for(const employee of employeeItems){
    const card=node('article',null,{class:'kpi-person'});
    const head=node('div',null,{class:'kpi-card-head'});const title=node('div');title.append(node('strong',employee.name),node('small',employee.linked?'Povezan sa zaposlenim u CRM-u':'Ime nije povezano sa zaposlenim u CRM-u'));head.append(title,node('b',`${average(employee.scores)} / 5`,{class:'score-badge'}));card.append(head);
    card.append(node('p',`${countText(employee.responses.size,'odgovor','odgovora')} · ${countText(employee.clients.size,'klijent','klijenata')} · ${countText(employee.scores.length,'lična ocena','ličnih ocena')}`,{class:'kpi-subline'}));
    const roles=node('div',null,{class:'kpi-tags'});for(const [role,values] of employee.roles)roles.append(node('span',`${role}: ${average(values)} / 5`));card.append(roles);
    const clients=node('div',null,{class:'kpi-breakdown'});for(const client of [...employee.clients.values()].sort((a,b)=>a.name.localeCompare(b.name,'sr')))clients.append(node('div',`${client.name}: lično ${average(client.scores)} / 5 · tim ${average(client.teamScores)} / 5`));card.append(clients);employeeRoot.append(card);
  }
  const teamRoot=$('teamDashboard');teamRoot.replaceChildren();
  const teamItems=[...teams.values()].sort((a,b)=>a.name.localeCompare(b.name,'sr'));
  if(!teamItems.length)teamRoot.append(node('p','Nema ocena timova za izabrane filtere.',{class:'empty-state'}));
  for(const team of teamItems){
    const card=node('article',null,{class:'kpi-person'}),head=node('div',null,{class:'kpi-card-head'});head.append(node('strong',team.name),node('b',`${average(team.scores)} / 5`,{class:'score-badge'}));card.append(head,node('p',`${countText(team.responses,'odgovor','odgovora')} · ocena celog tima`,{class:'kpi-subline'}));
    const people=node('div',null,{class:'kpi-breakdown'});for(const person of [...team.people.values()].sort((a,b)=>a.name.localeCompare(b.name,'sr')))people.append(node('div',`${person.name} · ${person.role}: ${average(person.scores)} / 5`));card.append(people);teamRoot.append(card);
  }
  $('results').replaceChildren(...[...rows].sort((a,b)=>b.submittedAt.localeCompare(a.submittedAt)).map(r=>{const item=node('div',null,{class:'result'});item.append(node('strong',`${r.clientName} · ${r.month}`),node('div',`Tim: ${r.team.map(x=>`${x.name} (${x.role})`).join(', ')}`));for(const q of r.questions){if(fr&&q.target!=='team'&&q.target!==fr)continue;if(fe&&q.target!=='team'&&q.targetEmployeeId!==fe)continue;const value=r.answers[q.id];if(value!==''&&value!=null)item.append(node('div',`${q.text} — ${value}`));}item.append(node('small',new Date(r.submittedAt).toLocaleString('sr-Latn-RS')));return item;}));
}
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();try{await api('login',{password:$('password').value});$('password').value='';await load();}catch(error){message(error.message);}});
$('refresh').onclick=load;
$('client').onchange=()=>{renderRoster();$('rosterEditor').hidden=true;$('linkBox').hidden=true;};
$('editRoster').onclick=()=>{if(!$('client').value)return message('Izaberi klijenta.');renderRoleEditor();};
$('addRole').onclick=()=>$('roleRows').append(roleRow());
$('saveRoster').onclick=async()=>{const rows=[...$('roleRows').children];if(!rows.length)return message('Dodaj bar jednu osobu u tim.');const roles=rows.map(row=>{const employeeId=row.children[2].value||null;const employee=data.employees.find(e=>e.id===employeeId);return{role:row.children[0].value,name:employee?.name||row.children[1].value.trim(),employeeId};});const incomplete=roles.findIndex(x=>!x.name);if(incomplete!==-1){message('Za svaki red izaberi zaposlenog iz CRM-a ili upiši ime i prezime.');rows[incomplete].children[2].focus();return;}try{await api('assignment',{clientId:$('client').value,roles});await load();$('rosterEditor').hidden=true;message(`Tim je sačuvan (${roles.length} osoba).`);}catch(error){message(error.message);}};
$('addQuestion').onclick=()=>$('questions').append(questionRow());
$('saveQuestions').onclick=async()=>{try{await api('questions',{questions:readQuestions()});await load();message('Pitanja su sačuvana.');}catch(error){message(error.message);}};
$('invite').onclick=async()=>{try{const result=await api('invite',{clientId:$('client').value,month:$('month').value});$('link').value=result.url;$('linkBox').hidden=false;await load();$('linkBox').hidden=false;message('Link je napravljen. Proveri ga i pošalji klijentu.');}catch(error){message(error.message);}};
$('copy').onclick=async()=>{await navigator.clipboard.writeText($('link').value);message('Link je kopiran.');};
['filterClient','filterEmployee','filterRole','filterMonth'].forEach(id=>$(id).onchange=renderResults);
$('month').value=new Date().toISOString().slice(0,7);
load();
