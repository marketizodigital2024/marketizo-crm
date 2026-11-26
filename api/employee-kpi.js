'use strict';
const state=require('./state.js').helpers;
const production=require('../lib/work-production-backup.js');
const core=require('../lib/employee-kpi.js');
const database=require('../lib/database-request.js');
function send(res,status,data){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('Vary','Authorization');res.end(JSON.stringify(data));}
async function handler(req,res){
 if(require('../lib/environment.js').blockProductionFeatureInPreview(res))return;
 if(req.method!=='GET')return send(res,405,{ok:false,error:'Ovaj pregled ne menja podatke.'});
 const token=String(req.headers?.authorization||'').replace(/^Bearer\s+/i,'');
 if(!token)return send(res,401,{ok:false,error:'Prijavi se svojim Marketizo nalogom.'});
 const config=state.supabaseConfig();
 if(!config.configured)return send(res,503,{ok:false,error:'Online baza trenutno nije dostupna.'});
 const session=state.verifyAccessToken(token,config.key);
 if(!session||session.role==='client')return send(res,401,{ok:false,error:'Prijava nije važeća.'});
 try{
  const rosterOnly=new URL(req.url,'https://app.marketizo.com').searchParams.get('view')==='assignments';
  const snapshot=rosterOnly?await state.readStoredState(config):await production.readSnapshot(config.url,config.key,(...args)=>database.request(fetch,...args));
  const access=state.accessSession(req,snapshot.payload,config.key),view=core.scope(access,snapshot.payload);
  if(!view)return send(res,403,{ok:false,error:'KPI je dostupan samo Miljanu, Ivani i liderima za njihov tim.'});
  if(rosterOnly){
   const source=await require('./kpi.js').internal.clickupRoster();
   return send(res,200,core.assignments(source,snapshot.payload,view));
  }
  return send(res,200,core.project(snapshot,view));
 }catch(error){console.error('employee-kpi-read',{name:error?.name||'Error'});return send(res,503,{ok:false,error:'Pregled nije učitan. Pokušaj ponovo; podaci nisu menjani.'});}
}
module.exports=Object.assign((req,res)=>database.withRequestBudget(()=>handler(req,res),18000),{helpers:core});
