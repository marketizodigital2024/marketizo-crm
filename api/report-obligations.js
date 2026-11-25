'use strict';
const db=require('../lib/database-request.js'),core=require('../lib/report-obligations.js');
function send(res,status,data){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','private, no-store');res.end(JSON.stringify(data));}
async function handler(req,res){
  if(require('../lib/environment.js').blockProductionFeatureInPreview(res))return;
  if(!['GET','POST'].includes(req.method))return send(res,405,{ok:false,error:'Metod nije podržan.'});
  const url=String(process.env.SUPABASE_URL||'').replace(/\/$/,''),key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return send(res,503,{ok:false,error:'Baza nije dostupna.'});
  const cron=Boolean(process.env.CRON_SECRET)&&req.headers?.authorization===`Bearer ${process.env.CRON_SECRET}`;
  const session=cron?null:require('./employee-report.js').helpers.verifySession(req,process.env.EMPLOYEE_SESSION_SECRET||key);
  if(!cron&&!session?.employeeId)return send(res,401,{ok:false,error:'Prijava je obavezna.'});
  const root=`${url}/rest/v1/${process.env.SUPABASE_TABLE||'agency_crm_state'}?id=eq.${encodeURIComponent(process.env.CRM_STATE_ID||'marketizo-main')}`;
  const headers={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
  try{
    const now=new Date();
    for(let attempt=0;attempt<5;attempt++){
      const response=await db.request(fetch,root+'&select=employees:payload->employees,employeeReports:payload->employeeReports,employeeAbsences:payload->employeeAbsences,employeeWorkLogs:payload->employeeWorkLogs,updated_at',{headers});
      if(!response.ok)throw Error('Čitanje obaveza nije uspelo.');
      let row=(await response.json())[0];if(row)row.payload={employees:row.employees,employeeReports:row.employeeReports,employeeAbsences:row.employeeAbsences,employeeWorkLogs:row.employeeWorkLogs};if(!row?.payload)throw Error('CRM zapis nije pronađen.');
      let p=row.payload;const actor=cron?null:(p.employees||[]).find(e=>e.id===session.employeeId&&core.employed(e,core.local(now).date));
      if(!cron&&!actor)return send(res,403,{ok:false,error:'Nalog nije aktivan.'});
      // Deterministic IDs and compare-and-swap retain every concurrent work entry.
      const changed=(cron||req.method==='POST')?core.ensure(p,now):0;
      if(changed){
        const full=await db.request(fetch,root+'&select=payload,updated_at',{headers});
        if(!full.ok)throw Error('Čitanje baze pre čuvanja nije uspelo.');
        row=(await full.json())[0];if(!row?.payload)throw Error('CRM zapis nije pronađen.');
        p=row.payload;
        if(!core.ensure(p,now))continue;
        const update=await db.request(fetch,root+`&updated_at=eq.${encodeURIComponent(row.updated_at)}&select=updated_at`,{method:'PATCH',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify({payload:p,updated_at:now.toISOString()})});
        if(!update.ok)throw Error('Čuvanje obaveza nije uspelo.');
        if(!(await update.json()).length)continue;
      }
      if(cron)return send(res,200,{ok:true,created:changed});
      const owner=['emp-miljan','emp-ivana'].includes(actor.id);
      const visible=(p.employees||[]).filter(e=>e.id===actor.id||(actor.isLeader&&(owner||e.leaderId===actor.id)&&core.employed(e,core.local(now).date)));
      const ids=new Set(visible.map(e=>e.id));
      const reports=(p.employeeReports||[]).filter(r=>ids.has(r.employeeId)&&(r.isFinalDailyReport||r.isWeeklyQuestionnaire||r.isClientWeeklyReport));
      return send(res,200,{ok:true,actorId:actor.id,startDate:core.START,serverDate:core.local(now).date,pending:visible.flatMap(e=>core.pending(p,e,now)),reports,people:visible.map(e=>({id:e.id,name:e.name,isLeader:e.isLeader===true})),checkedAt:now.toISOString()});
    }
    return send(res,409,{ok:false,error:'Podaci su promenjeni tokom provere. Pokušaj ponovo.'});
  }catch(e){return send(res,503,{ok:false,error:e.message});}
}
module.exports=(req,res)=>db.withRequestBudget(()=>handler(req,res),25000);
