const dbFetch = (...args) => require('../lib/database-request.js').request(fetch, ...args);
const { accessSession, readStoredState, supabaseConfig, supabaseHeaders } = require('./state.js').helpers;
const { employeeRoles } = require('../lib/employee-roles.js');
const UNITS = ['scenario','scenario_revision','clip','clip_revision','story','post','task','call','shoot','clip_check','none'];
function reply(res,status,data) { res.statusCode=status; res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','private, no-store');res.end(JSON.stringify(data)); }
async function rows(config,table,query='') {
 const all=[];
 for(let offset=0;offset<100000;offset+=1000) {
  const r=await dbFetch(`${config.url}/rest/v1/${table}?select=*&${query}${query?'&':''}order=${table==='marketizo_work_outputs'?'log_id':'activity_id'}.asc&limit=1000&offset=${offset}`,{headers:supabaseHeaders(config.key)});
  if(!r.ok) throw Error('Analitika trenutno nije dostupna. Pokušaj ponovo.');
  const page=await r.json(); if(!Array.isArray(page)) throw Error('Neispravan odgovor analitike.');all.push(...page);if(page.length<1000)return all;
 }
 throw Error('Previše podataka za jedan pregled. Obrati se administratoru.');
}
function projection(payload) {
 return {
  employees:(payload.employees||[]).map(e=>({id:e.id,name:e.name,positions:employeeRoles(e.positions?.length?e.positions:e.position),status:e.status})),
  clients:(payload.clients||[]).map(c=>({id:c.id,name:c.name,status:c.status})),
  activities:(payload.employeeActivities||[]).map(a=>({id:a.id,name:a.name,category:a.category,active:a.active})),
  logs:(payload.employeeWorkLogs||[]).map(l=>({id:l.id,employeeId:l.employeeId,date:l.date,minutes:Number(l.minutes??Number(l.hours||0)*60),activityId:l.activityId,activityName:l.activityName,activityCategory:l.activityCategory,clientId:l.clientId,clientName:l.clientName,note:String(l.note||'').slice(0,2000),aggregate:/migracija|prenos stvarnog|usklađen mesečni zbir/i.test(`${l.activityName||''} ${l.note||''}`)}))
 };
}
async function handler(req,res) {
 if(!['GET','POST'].includes(req.method))return reply(res,405,{ok:false,error:'Metod nije podržan.'});
 const config=supabaseConfig();if(!config.configured)return reply(res,503,{ok:false,error:'Online baza nije povezana.'});
 try {
  const current=await readStoredState(config), access=accessSession(req,current.payload,config.key);
  if(!access||access.role==='client')return reply(res,401,{ok:false,error:'Prijava zaposlenog je obavezna.'});
  const admin=['full-admin','operational-admin'].includes(access.role);
  if(req.method==='POST') {
   if(access.role!=='full-admin')return reply(res,403,{ok:false,error:'Samo administrator može menjati jedinice aktivnosti.'});
   let body=req.body;if(typeof body==='string'){if(body.length>4096)return reply(res,413,{ok:false,error:'Zahtev je prevelik.'});body=JSON.parse(body);}
   if(!body){let raw='';for await(const part of req){raw+=part;if(raw.length>4096)return reply(res,413,{ok:false,error:'Zahtev je prevelik.'});}body=JSON.parse(raw||'{}');}
   if(!(current.payload.employeeActivities||[]).some(a=>a.id===body.activityId)||!UNITS.includes(body.unit))return reply(res,400,{ok:false,error:'Izaberi postojeću aktivnost i ispravnu jedinicu.'});
   const r=await dbFetch(`${config.url}/rest/v1/marketizo_activity_metrics?on_conflict=activity_id`,{method:'POST',headers:{...supabaseHeaders(config.key),Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({activity_id:body.activityId,unit:body.unit,updated_at:new Date().toISOString(),updated_by:access.employee.id})});
   if(!r.ok)throw Error('Podešavanje nije sačuvano. Pokušaj ponovo.');
   return reply(res,200,{ok:true,rule:(await r.json())[0]});
  }
  const input=new URL(req.url,'https://app.marketizo.com').searchParams.get('view')==='input';
  if(!input&&!admin)return reply(res,403,{ok:false,error:'Analitika tima je dostupna administratorima.'});
  const [rules,outputs]=await Promise.all([rows(config,'marketizo_activity_metrics'),rows(config,'marketizo_work_outputs',input&&!admin?`employee_id=eq.${encodeURIComponent(access.employee.id)}`:'')]);
  if(input) {
   const closed=new Set(outputs.filter(o=>o.completed).map(o=>o.batch_id));
   const seen=new Set(), batches=outputs.filter(o=>!closed.has(o.batch_id)&&!seen.has(o.batch_id)&&(seen.add(o.batch_id),true));
   return reply(res,200,{ok:true,rules,batches:batches.map(o=>({batchId:o.batch_id,employeeId:o.employee_id,activityId:o.activity_id,clientId:o.client_id,label:o.label,unit:o.unit}))});
  }
  return reply(res,200,{ok:true,...projection(current.payload),rules,outputs,canConfigure:access.role==='full-admin',updatedAt:current.updatedAt});
 } catch(error) {return reply(res,500,{ok:false,error:error?.message||'Analitika nije dostupna.'});}
}
module.exports=Object.assign((req,res)=>require('../lib/database-request.js').withRequestBudget(()=>handler(req,res)),{helpers:{projection,rows,UNITS}});
