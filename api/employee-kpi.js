'use strict';
const state=require('./state.js').helpers;
const database=require('../lib/database-request.js');
const store=require('../lib/employee-kpi-store.js');
const {employeeRoles}=require('../lib/employee-roles.js');
function send(res,status,data){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('Vary','Authorization');res.end(JSON.stringify(data));}
async function handler(req,res){
 if(require('../lib/environment.js').blockProductionFeatureInPreview(res))return;
 if(!['GET','POST'].includes(req.method))return send(res,405,{ok:false,error:'Metod nije podržan.'});
 const token=String(req.headers?.authorization||'').replace(/^Bearer\s+/i,'');
 if(!token)return send(res,401,{ok:false,error:'Prijavi se svojim Marketizo nalogom.'});
 const config=state.supabaseConfig();
 if(!config.configured)return send(res,503,{ok:false,error:'Online baza trenutno nije dostupna.'});
 const session=state.verifyAccessToken(token,config.key);
 if(!session||!session.employeeId||session.role==='client')return send(res,401,{ok:false,error:'Prijava nije važeća.'});
 try{
  if(req.method==='POST'){
   const body=await store.body(req);
   if(body.action.startsWith('activity-')&&!['emp-miljan','emp-ivana'].includes(session.employeeId))return send(res,403,{ok:false,error:'KPI aktivnosti uređuju samo Miljan i Ivana.'});
   if(['activity-update','activity-delete','activity-restore'].includes(body.action))return send(res,200,await store.rpc(config,'marketizo_employee_kpi_activity_change',{p_actor:session.employeeId,p_action:body.action.slice(9),p_request_id:body.requestId,p_entry:body.entry}));
   if(body.action==='activity-create')return send(res,200,await store.rpc(config,'marketizo_employee_kpi_activity_save',{p_actor:session.employeeId,p_request_id:body.requestId,p_entry:body.entry}));
   return send(res,200,await store.rpc(config,'marketizo_employee_kpi_save',{p_actor:session.employeeId,p_action:body.action,p_request_id:body.requestId,p_entry:body.entry}));
  }
  const saved=await store.rpc(config,'marketizo_employee_kpi_read',{p_actor:session.employeeId});
  const ids=new Set(saved.employeeIds||[]);
  const employees=(saved.employees||[]).filter(e=>ids.has(e.id)).map(e=>({id:e.id,name:e.name,positions:employeeRoles(e.positions?.length?e.positions:e.position),active:e.active!==false&&e.status!=='Neaktivan',isLeader:e.isLeader===true}));
  return send(res,200,{ok:true,canSave:true,canManageActivities:saved.canManageActivities===true,scope:saved.scope,viewer:saved.viewer,updatedAt:saved.updatedAt,employees,clients:(saved.clients||[]).map(c=>({id:c.id,name:c.name})),activities:(saved.activities||[]).map(a=>({id:a.id,name:a.name,revision:a.revision||1,deleted:a.deleted===true})),entries:(saved.entries||[]).filter(e=>ids.has(e.employeeId))});
 }catch(error){console.error('employee-kpi-request',{name:error?.name||'Error'});return send(res,error.status||503,{ok:false,error:error.status?error.message:'Zahtev nije potvrđen. Pokušaj ponovo; unos ostaje u obrascu.'});}
}
module.exports=(req,res)=>database.withRequestBudget(()=>handler(req,res),12000);
