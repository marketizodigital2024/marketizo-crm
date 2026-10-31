const db = require('../lib/database-request.js');
const model = require('../lib/questionnaire-model.js');
const defaults = require('../lib/questionnaire-templates.json');
const TABLE = 'marketizo_questionnaires';
const stateTable = process.env.SUPABASE_TABLE || 'agency_crm_state';
const mainId = (process.env.VERCEL_ENV === 'preview' ? 'marketizo-smm-preview-v1' : process.env.CRM_STATE_ID || 'marketizo-main');
const namespace = () => process.env.VERCEL_ENV === 'preview' ? 'preview' : 'production';
const secret = () => require('../lib/environment.js').sessionSecret(process.env.EMPLOYEE_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY,process.env);
function fail(status, message) { const e = new Error(message); e.status = status; throw e; }
function json(res, status, body) { res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.status(status).json(body); }
function headers(prefer) { const key = process.env.SUPABASE_SERVICE_ROLE_KEY; return { apikey:key, Authorization:`Bearer ${key}`, 'Content-Type':'application/json', ...(prefer ? { Prefer:prefer } : {}) }; }
async function request(path, options = {}) {
  const r = await db.request(fetch, `${process.env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${path}`, { ...options, headers:headers(options.prefer) });
  if (!r.ok) fail(503, 'Upitnici trenutno nisu dostupni. Pokušajte ponovo.');
  return r.status === 204 ? [] : r.json();
}
const nsQuery = () => `namespace=eq.${namespace()}`;
async function read(id) { return (await request(`${TABLE}?${nsQuery()}&id=eq.${encodeURIComponent(id)}&select=id,payload,updated_at`))[0]; }
async function insert(id, payload) {
  const rows = await request(`${TABLE}?on_conflict=namespace,id`, { method:'POST', prefer:'resolution=ignore-duplicates,return=representation', body:JSON.stringify({ namespace:namespace(), id, payload, updated_at:new Date().toISOString() }) });
  return rows[0] || null;
}
async function update(row, payload) {
  const updated_at = new Date(Math.max(Date.now(), Date.parse(row.updated_at) + 1)).toISOString();
  const rows = await request(`${TABLE}?${nsQuery()}&id=eq.${encodeURIComponent(row.id)}&updated_at=eq.${encodeURIComponent(row.updated_at)}`, { method:'PATCH', prefer:'return=representation', body:JSON.stringify({ payload, updated_at }) });
  if (!rows.length) fail(409, 'Podaci su izmenjeni na drugom uređaju. Osvežite pregled pre ponovnog čuvanja.');
  return rows[0];
}
async function actor(req) {
  const session = model.verifySession(req.headers.authorization, secret());
  if (!session) fail(401, 'Prijava u Marketizo aplikaciju je obavezna.');
  const rows = await request(`${stateTable}?id=eq.${encodeURIComponent(mainId)}&select=employees:payload->employees,clients:payload->clients`);
  const employee = rows[0]?.employees?.find(e => e.id === session.employeeId);
  if (!model.active(employee)) fail(403, 'Nalog nije aktivan.');
  return { employee, clients: rows[0]?.clients || [] };
}
async function template(key) { return await read('template:' + key) || { id:'template:' + key, updated_at:null, payload:structuredClone(defaults[key]) }; }
async function handle(req, res) {
  if (req.method !== 'POST') return json(res,405,{ error:'Method not allowed' });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return json(res,503,{error:'Upitnici nisu povezani.'});
  try {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    if (Buffer.byteLength(raw) > 900000) fail(413,'Previše podataka.');
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const action = body.action;
    if (['public','draft','submit'].includes(action)) {
      if (!model.checkToken(body.id, body.token, secret())) fail(404,'Link nije dostupan.');
      let row = await read(body.id);
      if (!row || row.payload.recordType !== 'invite' || row.payload.revoked || row.payload.deletedAt || Date.parse(row.payload.expiresAt) <= Date.now()) fail(404,'Link je istekao ili nije dostupan.');
      if (action === 'public') return json(res,200,model.publicView(row));
      if (row.payload.status === 'Popunjen') return json(res,200,{ok:true,submitted:true,revision:row.updated_at});
      if (body.revision !== row.updated_at) fail(409,'Upitnik je izmenjen na drugom uređaju. Sačuvajte tekst i osvežite stranicu.');
      if (!model.validAnswers(row.payload.questions,body.answers,action==='submit')) fail(400,'Proverite odgovore i popunite sva obavezna polja.');
      const answers = Object.fromEntries(row.payload.questions.map((q,i)=>[i,body.answers[i] || '']));
      row = await update(row,{...row.payload,answers,status:action==='submit'?'Popunjen':'U toku',...(action==='submit'?{submittedAt:new Date().toISOString()}:{})});
      return json(res,200,{ok:true,submitted:action==='submit',revision:row.updated_at});
    }
    if (action === 'viewAnswers') {
      if (!model.checkAnswerToken(body.id,body.token,secret())) fail(404,'Link odgovora nije dostupan.');
      const row = await read(body.id); const p = row?.payload;
      if (!p || p.recordType !== 'invite' || p.status !== 'Popunjen' || p.revoked || p.deletedAt) fail(404,'Link odgovora nije dostupan.');
      return json(res,200,{id:row.id,title:p.title,clientName:p.clientName,lang:p.lang,questions:p.questions,answers:p.answers,status:p.status,submittedAt:p.submittedAt,answerToken:body.token});
    }
    const { employee, clients } = await actor(req);
    if (action === 'answers') {
      if (!model.uuid(body.id)) fail(400,'Neispravan link.');
      const row = await read(body.id);
      if (!row || row.payload.recordType !== 'invite' || row.payload.deletedAt) fail(404,'Upitnik nije pronađen.');
      const p = row.payload;
      return json(res,200,{id:row.id,title:p.title,clientName:p.clientName,lang:p.lang,questions:p.questions,answers:p.answers,status:p.status,submittedAt:p.submittedAt,answerToken:p.status==='Popunjen'&&!p.revoked?model.answerToken(row.id,secret()):null});
    }
    if (!model.canManage(employee)) fail(403,'Slanje i uređivanje dostupni su SMM-u i administratorima.');
    if (action === 'list') {
      const ts = await Promise.all(Object.keys(defaults).map(template));
      const rows = await request(`${TABLE}?${nsQuery()}&id=not.like.template:*&payload->>deletedAt=${body.deleted?'not.is.null':'is.null'}&select=id,payload,updated_at&order=updated_at.desc&limit=501`);
      const records = rows.filter(r=>r.payload.recordType==='invite' && (!!r.payload.deletedAt === !!body.deleted)).slice(0,500).map(r=>({...r.payload,id:r.id,revision:r.updated_at,token:model.publicToken(r.id,secret()),answerToken:r.payload.status==='Popunjen'&&!r.payload.revoked?model.answerToken(r.id,secret()):null}));
      return json(res,200,{employee:{id:employee.id,name:employee.name},clients:clients.filter(c=>c.status!=='Arhiviran').map(c=>({id:c.id,name:c.name})),templates:Object.fromEntries(ts.map(t=>[t.id.slice(9),{...t.payload,revision:t.updated_at}])),records,hasMore:rows.length>500});
    }
    if (action === 'template') {
      if (!defaults[body.key] || !model.validQuestions(body.questions)) fail(400,'Neispravna pitanja.');
      const old = await template(body.key);
      if ((body.revision || null) !== old.updated_at) fail(409,'Šablon je već izmenjen. Osvežite pregled.');
      const payload = {...old.payload,questions:body.questions.map(q=>q.trim()),version:old.payload.version+1,editedBy:employee.id};
      if (old.updated_at) await update(old,payload); else if (!(await insert(old.id,payload))) fail(409,'Šablon je već izmenjen. Osvežite pregled.');
      return json(res,200,{ok:true});
    }
    if (action === 'create') {
      if (!defaults[body.key] || !model.uuid(body.requestId)) fail(400,'Neispravan zahtev.');
      const client = clients.find(c=>c.id===body.clientId && c.status!=='Arhiviran');
      if (!client) fail(400,'Klijent nije dostupan.');
      const previous = await read(body.requestId);
      if (previous) {
        if (previous.payload.createdBy !== employee.id || previous.payload.clientId !== client.id || previous.payload.key !== body.key) fail(409,'Zahtev je već iskorišćen.');
        return json(res,200,{ok:true,id:previous.id});
      }
      const t = (await template(body.key)).payload;
      const payload = {recordType:'invite',key:body.key,type:t.type,lang:t.lang,title:t.title,version:t.version,questions:t.questions,answers:{},clientId:client.id,clientName:client.name,createdBy:employee.id,createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+90*86400000).toISOString(),status:'Kreiran'};
      if (!(await insert(body.requestId,payload))) fail(409,'Zahtev se obrađuje. Pokušajte ponovo istim zahtevom.');
      return json(res,200,{ok:true,id:body.requestId});
    }
    if (['delete','restore'].includes(action)) {
      if (!model.uuid(body.id)) fail(400,'Neispravan upitnik.');
      const row=await read(body.id);
      if (!row || row.payload.recordType!=='invite') fail(404,'Upitnik nije dostupan.');
      if (action==='delete' && !row.payload.deletedAt) await update(row,{...row.payload,deletedAt:new Date().toISOString(),deletedBy:employee.id});
      if (action==='restore' && row.payload.deletedAt) { const {deletedAt,deletedBy,...payload}=row.payload; await update(row,payload); }
      return json(res,200,{ok:true});
    }
    if (['sent','revoke'].includes(action)) {
      if (!model.uuid(body.id)) fail(400,'Neispravan upitnik.');
      const row = await read(body.id);
      if (!row || row.payload.recordType!=='invite' || row.payload.deletedAt) fail(404,'Upitnik nije dostupan.');
      if (action==='revoke') await update(row,{...row.payload,revoked:true});
      else if (row.payload.status==='Kreiran') await update(row,{...row.payload,status:'Poslat'});
      return json(res,200,{ok:true});
    }
    fail(400,'Nepodržana radnja.');
  } catch(e) { return json(res,e.status || 500,{error:e.status?e.message:'Upitnici trenutno nisu dostupni. Pokušajte ponovo.'}); }
}
module.exports = (req,res) => db.withRequestBudget(()=>handle(req,res));

