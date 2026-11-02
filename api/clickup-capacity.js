'use strict';
const crypto=require('node:crypto');
const core=require('../lib/clickup-capacity.js');
const CLIENT_LIST='1200810000001461', TEAM_LIST='1200810000001520';
function send(res,status,data){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','private, no-store');res.end(JSON.stringify(data));}
function equal(a,b){const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length===y.length&&crypto.timingSafeEqual(x,y);}
async function clickup(path,method='GET',body){
  const res=await fetch('https://api.clickup.com/api/v2'+path,{method,headers:{Authorization:process.env.CLICKUP_API_TOKEN,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000),cache:'no-store'});
  if(!res.ok)throw Error('ClickUp '+res.status);
  return res.json();
}
async function list(id){const all=[];for(let page=0;page<100;page++){
  const data=await clickup(`/list/${id}/task?include_closed=true&include_markdown_description=true&page=${page}`);
  if(!Array.isArray(data.tasks))throw Error('Nepotpuna ClickUp lista');all.push(...data.tasks);
  if(data.last_page===true||data.tasks.length<100)return all;
}throw Error('ClickUp lista je prevelika; ništa nije promenjeno');}
async function handler(req,res){
  if(require('../lib/environment.js').blockProductionFeatureInPreview(res))return;
  if(!['GET','POST'].includes(req.method))return send(res,405,{ok:false,error:'Metod nije podržan.'});
  const cron=Boolean(process.env.CRON_SECRET)&&equal(req.headers?.authorization,'Bearer '+process.env.CRON_SECRET);
  if(!cron){
    const token=String(req.headers?.authorization||'').replace(/^Bearer\s+/i,'');
    if(!token)return send(res,401,{ok:false,error:'Prijava administratora je potrebna.'});
    const state=require('./state.js').helpers,config=state.supabaseConfig();
    if(!config.configured)return send(res,503,{ok:false,error:'Administratorska provera nije dostupna.'});
    if(!state.verifyAccessToken(token,config.key))return send(res,401,{ok:false,error:'Prijava administratora je potrebna.'});
    const current=await state.readStoredState(config),access=state.accessSession(req,current.payload,config.key);
    if(access?.role!=='full-admin')return send(res,403,{ok:false,error:'Potreban je puni administratorski pristup.'});
  }
  if(!process.env.CLICKUP_API_TOKEN)return send(res,503,{ok:false,error:'ClickUp pristup nije podešen.'});
  const apply=cron?process.env.CLICKUP_CAPACITY_SYNC_ENABLED==='true':req.method==='POST'&&req.body?.apply===true;
  try{
    const [clients,team,defs,teamDefs]=await Promise.all([list(CLIENT_LIST),list(TEAM_LIST),clickup(`/list/${CLIENT_LIST}/field`),clickup(`/list/${TEAM_LIST}/field`)]);
    // Definitions carry unset fields too, so new employees need only their weekly hours.
    for(const t of team)for(const d of teamDefs.fields||[])if(!(t.custom_fields||[]).some(f=>f.id===d.id))(t.custom_fields||(t.custom_fields=[])).push({...d});
    const plan=core.plan(clients,team,defs.fields||[]);
    let changed=0;
    if(apply){
      // Stay below ClickUp's smallest 100 requests/min limit. Remaining changes converge next minute.
      for(const w of plan.writes.slice(0,40)){
        if(w.kind==='field')await clickup(`/task/${encodeURIComponent(w.taskId)}/field/${encodeURIComponent(w.fieldId)}`,'POST',{value:w.value});
        else await clickup(`/task/${encodeURIComponent(w.taskId)}`,'PUT',{markdown_description:w.value});
        changed++;
      }
    }
    send(res,200,{ok:true,automatic:process.env.CLICKUP_CAPACITY_SYNC_ENABLED==='true',applied:apply,changed,pending:plan.writes.length-changed,checkedAt:new Date().toISOString(),clientCount:clients.length,rows:plan.rows,warnings:plan.warnings});
  }catch(e){console.error('clickup-capacity-sync',{error:e.message});send(res,502,{ok:false,error:e.message});}
}
module.exports=handler;
module.exports._test={equal,list};
