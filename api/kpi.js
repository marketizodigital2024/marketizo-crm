const crypto = require('crypto');

const table = process.env.SUPABASE_TABLE || 'agency_crm_state';
const rowId = process.env.VERCEL_ENV === 'preview' ? 'marketizo-kpi-preview-v1' : 'marketizo-kpi-v1';
const mainId = process.env.CRM_STATE_ID || 'marketizo-main';
const roles = ['Scenarista', 'Voice Over', 'Editor', 'Social Media Manager', 'Snimatelj', 'Paid Ads'];
const roleQuestions = {
  Scenarista: 'Da li su scenariji jasni, zanimljivi i u skladu sa vaÅ¡im brendom?',
  'Voice Over': 'Kako ocenjujete kvalitet i ton voice-overa?',
  Editor: 'Da li ste zadovoljni kvalitetom montaÅ¾e i isporukom videa?',
  'Social Media Manager': 'Kako ocenjujete komunikaciju, dizajn i organizaciju sadrÅ¾aja?',
  Snimatelj: 'Kako ocenjujete pripremu, komunikaciju i profesionalnost snimatelja?',
  'Paid Ads': 'Kako ocenjujete voÄ‘enje plaÄ‡enih reklama i rezultate kampanja?',
};
const baseQuestions = [
  { id: 'team', target: 'team', text: 'Kako biste ocenili ukupnu saradnju sa naÅ¡im timom?', type: 'rating', required: true },
  { id: 'communication', target: 'team', text: 'Da li je komunikacija bila jasna i pravovremena?', type: 'rating', required: true },
  { id: 'comment', target: 'team', text: 'Å ta moÅ¾emo sledeÄ‡eg meseca da uradimo bolje?', type: 'text', required: false },
  ...roles.map((role) => ({ id: `role-${role.toLowerCase().replace(/[^a-z]+/g, '-')}`, target: role, text: roleQuestions[role], type: 'rating', required: true })),
];
const blank = () => ({ questions: baseQuestions, assignments: [], links: [], invites: [], responses: [] });
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const secret = () => process.env.KPI_ADMIN_PASSWORD || '';
const signKey = () => process.env.KPI_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
function json(res, code, body) { res.status(code).setHeader('Cache-Control', 'no-store').json(body); }
function dbHeaders() { const key = process.env.SUPABASE_SERVICE_ROLE_KEY; return { apikey:key, Authorization:`Bearer ${key}`, 'Content-Type':'application/json' }; }
function dbUrl(id) { return `${process.env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}&select=payload,updated_at`; }
async function read(id) { const response=await fetch(dbUrl(id),{headers:dbHeaders()}); if(!response.ok) throw new Error(`Database read ${response.status}`); return (await response.json())[0] || {payload:id===rowId?blank():{},updated_at:''}; }
async function write(id,payload,oldUpdatedAt) {
  const now=new Date().toISOString();
  const root=`${process.env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}`;
  const response=oldUpdatedAt
    ? await fetch(`${root}?id=eq.${encodeURIComponent(id)}&updated_at=eq.${encodeURIComponent(oldUpdatedAt)}`,{method:'PATCH',headers:{...dbHeaders(),Prefer:'return=representation'},body:JSON.stringify({payload,updated_at:now})})
    : await fetch(`${root}?on_conflict=id`,{method:'POST',headers:{...dbHeaders(),Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify({id,payload,updated_at:now})});
  if(!response.ok) throw new Error(`Database write ${response.status}`);
  if(!(await response.json()).length) throw new Error('CONFLICT');
  return now;
}
function cookie(req) { return String(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('marketizoKpi='))?.slice(13)||''; }
function authenticated(req) {
  const [expiry,mac]=cookie(req).split('.');
  if(!expiry||!mac||Number(expiry)<Date.now()||!signKey()) return false;
  const expected=crypto.createHmac('sha256',signKey()).update(expiry).digest('hex');
  return mac.length===expected.length && crypto.timingSafeEqual(Buffer.from(mac),Buffer.from(expected));
}
function norm(value) { return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/^\s*\d+\s*[.\\]\s*/, '').replace(/\b(enterprise|business|starter|custom)\b.*$/,'').replace(/[^a-z0-9]+/g,' ').trim(); }
function splitPeople(value) { return String(value||'').split(/\s*;\s*/).map(v=>v.trim()).filter(v=>v&&!/^(klijent|eleven labs|-)$/i.test(v)); }
function parseClickup(markdown) {
  const lines=String(markdown||'').split('\n').filter(line=>line.startsWith('| '));
  const header=lines.shift()?.split('|').slice(1,-1).map(x=>x.trim())||[];
  if(!header.includes('Klijent')||!header.includes('Editor')) throw new Error('ClickUp tabela nema oÄekivane kolone.');
  return lines.filter(line=>!/^\|\s*:?-{2,}/.test(line)).map(line=>{
    const values=line.split('|').slice(1,-1).map(x=>x.trim().replace(/<br\s*\/?>/gi,'; ').replace(/\\[.\-]/g,m=>m.slice(1)).replace(/\s+/g,' '));
    return Object.fromEntries(header.map((key,index)=>[key,values[index]||'']));
  }).filter(row=>row.Klijent);
}
async function clickupRoster() {
  const token=process.env.CLICKUP_API_TOKEN;
  const listId=process.env.CLICKUP_CLIENT_LIST_ID;
  if(!token||!listId) return {rows:[],syncedAt:null,live:false,error:'ClickUp token ili lista klijenata nisu podeÅ¡eni. MoÅ¾eÅ¡ ruÄno uneti tim, ali automatska raspodela nije dostupna.'};
  try {
    const rows=[];
    const fieldResponse=await fetch(`https://api.clickup.com/api/v2/list/${encodeURIComponent(listId)}/field`,{headers:{Authorization:token},cache:'no-store'});
    if(!fieldResponse.ok)throw new Error(`ClickUp fields ${fieldResponse.status}`);
    const fieldDefinitions=new Map(((await fieldResponse.json()).fields||[]).map(field=>[field.id,field]));
    const fieldValue=(field)=>{
      if(field?.value==null)return '';
      const definition=fieldDefinitions.get(field.id)||field;
      const options=definition.type_config?.options||field.type_config?.options||[];
      const render=(value)=>{const option=options.find(item=>item.id===value||item.orderindex===value);return option?.name||value?.username||value?.email||value?.name||value;};
      return (Array.isArray(field.value)?field.value:[field.value]).map(render).filter(Boolean).join('; ');
    };
    for(let page=0;page<100;page++){
      const response=await fetch(`https://api.clickup.com/api/v2/list/${encodeURIComponent(listId)}/task?include_closed=true&subtasks=true&page=${page}`,{headers:{Authorization:token},cache:'no-store'});
      if(!response.ok) throw new Error(`ClickUp ${response.status}`);
      const payload=await response.json(),tasks=Array.isArray(payload.tasks)?payload.tasks:[];
      for(const task of tasks){const fields=Object.fromEntries((task.custom_fields||[]).map(field=>[field.name,fieldValue(field)]));rows.push({Klijent:String(task.name||'').trim(),Scenarista:fields.Scenarista||'','Voice Over':fields['Voice Over']||'',Editor:fields.Editor||'','Social Media Manager':fields.SMM||fields['Social Media Manager']||'',Snimatelj:fields.Snimatelj||'','Paid Ads':fields['Paid Ads']||''});}
      if(tasks.length<100)break;
    }
    const relatedIds=[...new Set(rows.flatMap(row=>splitPeople(row.Snimatelj)).filter(value=>/^[a-f0-9-]{24,}$/i.test(value)))];
    const relatedNames=new Map((await Promise.all(relatedIds.map(async id=>{
      let response=await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(id)}`,{headers:{Authorization:token},cache:'no-store'});
      if(!response.ok)response=await fetch(`https://api.clickup.com/api/v2/task/${encodeURIComponent(id)}?custom_task_ids=true&team_id=${encodeURIComponent(process.env.CLICKUP_WORKSPACE_ID||'90151373784')}`,{headers:{Authorization:token},cache:'no-store'});
      if(!response.ok)return [id,id];
      const task=await response.json();
      return [id,String(task.name||id).trim()];
    }))).filter(([,name])=>name));
    for(const row of rows)row.Snimatelj=splitPeople(row.Snimatelj).map(value=>relatedNames.get(value)||value).join('; ');
    return {rows:rows.filter(row=>row.Klijent),syncedAt:new Date().toISOString(),live:true,error:null};
  } catch(error) { return {rows:[],syncedAt:null,live:false,error:`ClickUp nije dostupan (${error.message}). Automatska raspodela trenutno nije dostupna.`}; }
}
function roster(client,employees,overrides,source=[],links=[]) {
  const linkedName=links.find(x=>x.clientId===client.id)?.clickupName;
  const row=linkedName?source.find(x=>x.Klijent===linkedName):source.find(x=>norm(x.Klijent)===norm(client.name));
  if(row) return roles.flatMap(role=>splitPeople(row[role]).map(name=>({role,name,employeeId:employees.find(e=>norm(e.name)===norm(name))?.id||null})));
  const manual=overrides.find(x=>x.clientId===client.id);
  return manual?.roles||[];
}
function validQuestion(q) { return q && typeof q.text==='string' && q.text.trim().length>2 && q.text.length<=300 && ['rating','text','choice'].includes(q.type) && (q.target==='team'||roles.includes(q.target)) && (q.type!=='choice'||Array.isArray(q.options)&&q.options.length>=2&&q.options.length<=15&&q.options.every(x=>typeof x==='string'&&x.trim()&&x.length<=100)); }
function publicInvite(invite) { return { clientName:invite.clientName, month:invite.month, expiresAt:invite.expiresAt, team:invite.team.map(({role,name})=>({role,name})), questions:invite.questions }; }

module.exports=async function handler(req,res) {
  if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY||!secret()) return json(res,503,{error:'KPI nije konfigurisan na serveru.'});
  const action=String(req.query.action||'');
  try {
    if(action==='login' && req.method==='POST') {
      const supplied=String(req.body?.password||'');
      const a=Buffer.from(supplied), b=Buffer.from(secret());
      if(a.length!==b.length||!crypto.timingSafeEqual(a,b)) return json(res,401,{error:'PogreÅ¡na lozinka.'});
      const expiry=String(Date.now()+8*60*60*1000), mac=crypto.createHmac('sha256',signKey()).update(expiry).digest('hex');
      res.setHeader('Set-Cookie',`marketizoKpi=${expiry}.${mac}; HttpOnly; Secure; SameSite=Strict; Path=/api/kpi`);
      return json(res,200,{ok:true});
    }
    if(action==='logout' && req.method==='POST') {
      res.setHeader('Set-Cookie','marketizoKpi=; HttpOnly; Secure; SameSite=Strict; Path=/api/kpi; Max-Age=0');
      return json(res,200,{ok:true});
    }
    if(action==='clickupHealth' && req.method==='GET') {
      const source=await clickupRoster();
      const assignmentCount=source.rows.reduce((total,row)=>total+roles.reduce((sum,role)=>sum+splitPeople(row[role]).length,0),0);
      const assignedClientCount=source.rows.filter(row=>roles.some(role=>splitPeople(row[role]).length)).length;
      const unresolvedAssignmentCount=source.rows.reduce((total,row)=>total+roles.flatMap(role=>splitPeople(row[role])).filter(name=>/^[a-f0-9-]{24,}$/i.test(name)).length,0);
      return json(res,source.live?200:503,{ok:source.live,clientCount:source.rows.length,assignedClientCount,assignmentCount,unresolvedAssignmentCount,syncedAt:source.syncedAt,error:source.error});
    }
    if(action==='form' && req.method==='GET') {
      const token=String(req.query.token||'');
      if(!/^[a-f0-9]{64}$/.test(token)) return json(res,404,{error:'Link nije validan.'});
      const row=await read(rowId), invite=row.payload.invites.find(i=>i.tokenHash===sha(token));
      if(!invite||invite.usedAt||Date.parse(invite.expiresAt)<Date.now()) return json(res,404,{error:'Link je istekao ili je veÄ‡ iskoriÅ¡Ä‡en.'});
      return json(res,200,publicInvite(invite));
    }
    if(action==='submit' && req.method==='POST') {
      const token=String(req.body?.token||'');
      if(!/^[a-f0-9]{64}$/.test(token)) return json(res,404,{error:'Link nije validan.'});
      const row=await read(rowId), data=row.payload, invite=data.invites.find(i=>i.tokenHash===sha(token));
      if(!invite||invite.usedAt||Date.parse(invite.expiresAt)<Date.now()) return json(res,404,{error:'Link je istekao ili je veÄ‡ iskoriÅ¡Ä‡en.'});
      const answers=req.body?.answers||{};
      for(const q of invite.questions) {
        const value=answers[q.id];
        if(q.required && (value===undefined||value===null||value==='')) return json(res,400,{error:`Nedostaje odgovor: ${q.text}`});
        if(value==null||value==='') continue;
        if(q.type==='rating' && ![1,2,3,4,5].includes(Number(value))) return json(res,400,{error:'Ocena mora biti od 1 do 5.'});
        if(q.type==='choice' && !q.options.includes(String(value))) return json(res,400,{error:'Izaberi ponuÄ‘eni odgovor.'});
        if(String(value).length>2000) return json(res,400,{error:'Odgovor je predugaÄak.'});
      }
      const accepted=Object.fromEntries(invite.questions.map(q=>[q.id,answers[q.id]??'']));
      invite.usedAt=new Date().toISOString();
      data.responses.push({id:crypto.randomUUID(),inviteId:invite.id,clientId:invite.clientId,clientName:invite.clientName,month:invite.month,team:invite.team,questions:invite.questions,answers:accepted,submittedAt:invite.usedAt});
      await write(rowId,data,row.updated_at);
      return json(res,200,{ok:true});
    }
    if(!authenticated(req)) return json(res,401,{error:'Prijava je potrebna.'});
    const row=await read(rowId), data=row.payload;
    if(req.method==='GET' && action==='roster') {
      const main=await read(mainId), clients=main.payload.clients||[], employees=main.payload.employees||[];
      const client=clients.find(item=>item.id===String(req.query.clientId||''));
      if(!client) return json(res,404,{error:'Klijent nije pronaÄ‘en.'});
      const source=await clickupRoster();
      const team=roster(client,employees,data.assignments,source.rows,data.links||[]);
      return json(res,200,{team,live:source.live,syncedAt:source.syncedAt,error:source.error});
    }
    if(req.method==='GET' && action==='admin') {
      const main=await read(mainId), clients=main.payload.clients||[], employees=main.payload.employees||[];
      const source=await clickupRoster();
      const unmatched=source.rows.filter(row=>!clients.some(client=>norm(client.name)===norm(row.Klijent))&&!(data.links||[]).some(link=>link.clickupName===row.Klijent)).map(row=>row.Klijent);
      return json(res,200,{clients:clients.map(c=>({id:c.id,name:c.name,status:c.status})),employees:employees.map(e=>({id:e.id,name:e.name})),questions:data.questions.filter(q=>q.target!=='Checking'),assignments:data.assignments.map(item=>({...item,roles:item.roles.filter(role=>role.role!=='Checking')})),links:data.links||[],invites:data.invites.map(({tokenHash,...i})=>i),responses:data.responses,clickup:source,unmatched});
    }
    if(req.method!=='POST') return json(res,405,{error:'Metod nije podrÅ¾an.'});
    const body=req.body||{};
    if(action==='deleteResponse') {
      const responseId=String(body.responseId||'');
      const response=data.responses.find(item=>item.id===responseId);
      if(!response) return json(res,404,{error:'Odgovor nije pronaÄ‘en.'});
      data.responses=data.responses.filter(item=>item.id!==responseId);
      data.invites=data.invites.filter(item=>item.id!==response.inviteId);
    } else if(action==='assignment') {
      const main=await read(mainId), client=(main.payload.clients||[]).find(c=>c.id===body.clientId);
      if(!client) return json(res,400,{error:'Klijent nije pronaÄ‘en.'});
      const employees=main.payload.employees||[];
      if(!Array.isArray(body.roles)||body.roles.length>30||body.roles.some(x=>!roles.includes(x.role)||!x.name||String(x.name).length>100)) return json(res,400,{error:'Neispravna raspodela.'});
      data.assignments=data.assignments.filter(x=>x.clientId!==client.id);
      data.assignments.push({clientId:client.id,roles:body.roles.map(x=>({role:x.role,name:String(x.name).trim(),employeeId:employees.find(e=>e.id===x.employeeId)?.id||null}))});
    } else if(action==='link') {
      const main=await read(mainId), client=(main.payload.clients||[]).find(c=>c.id===body.clientId);
      const source=await clickupRoster();
      if(!client||!source.rows.some(x=>x.Klijent===body.clickupName)) return json(res,400,{error:'Klijent ili ClickUp red nije pronaÄ‘en.'});
      data.links=(data.links||[]).filter(x=>x.clientId!==client.id&&x.clickupName!==body.clickupName);
      data.links.push({clientId:client.id,clickupName:body.clickupName});
    } else if(action==='questions') {
      if(!Array.isArray(body.questions)||body.questions.length<1||body.questions.length>40||body.questions.some(q=>!validQuestion(q))) return json(res,400,{error:'Neispravna pitanja.'});
      data.questions=body.questions.map(q=>({id:String(q.id||crypto.randomUUID()),target:q.target,text:q.text.trim(),type:q.type,required:Boolean(q.required),options:q.type==='choice'?(q.options||[]).map(String).slice(0,15):[]}));
    } else if(action==='invite') {
      const main=await read(mainId), client=(main.payload.clients||[]).find(c=>c.id===body.clientId);
      if(!client||!/^\d{4}-\d{2}$/.test(String(body.month||''))) return json(res,400,{error:'Izaberi klijenta i mesec.'});
      const source=await clickupRoster();
      if(!source.live && !data.assignments.some(x=>x.clientId===client.id)) return json(res,503,{error:'ClickUp sinhronizacija nije aktivna. Podesi token ili ruÄno saÄuvaj tim pre slanja.'});
      const team=roster(client,main.payload.employees||[],data.assignments,source.rows,data.links||[]);
      if(!team.length) return json(res,400,{error:'Za ovog klijenta prvo odredi Älanove tima.'});
      const activeRoles=new Set(team.map(x=>x.role));
      const questions=data.questions.filter(q=>q.target==='team'||activeRoles.has(q.target)).flatMap(q=>{
        if(q.target==='team') return [q];
        const people=team.filter(x=>x.role===q.target);
        return people.map((person,index)=>({...q,id:`${q.id}:${index}`,text:`${q.text} (${person.name})`,targetEmployeeId:person.employeeId,targetName:person.name}));
      });
      const token=crypto.randomBytes(32).toString('hex');
      const invite={id:crypto.randomUUID(),tokenHash:sha(token),clientId:client.id,clientName:client.name,month:body.month,team,questions,createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+45*86400000).toISOString(),usedAt:null};
      data.invites.push(invite);
      await write(rowId,data,row.updated_at);
      return json(res,200,{ok:true,url:`https://${req.headers.host}/feedback.html?token=${token}`});
    } else return json(res,404,{error:'Nepoznata akcija.'});
    await write(rowId,data,row.updated_at);
    return json(res,200,{ok:true});
  } catch(error) { return json(res,error.message==='CONFLICT'?409:500,{error:error.message==='CONFLICT'?'Podaci su se promenili. OsveÅ¾i stranicu.':'KPI servis trenutno nije dostupan.'}); }
};

module.exports._test={norm,roster,validQuestion,publicInvite,parseClickup};
