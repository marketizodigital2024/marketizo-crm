'use strict';
const {verifyGoogle}=require('../lib/finance-google-auth.js'),core=require('../lib/billing-content.js');
const json=(res,status,body)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(body));};
function createHandler(deps={}){return async(req,res)=>{
 if(require('../lib/environment.js').blockProductionFeatureInPreview(res))return;
 try{
  if(req.method!=='POST')return json(res,405,{ok:false});const identity=await(deps.verifyGoogle||verifyGoogle)(req.headers?.authorization);if(identity?.email!=='buchhaltung@marketizo.com')return json(res,403,{ok:false,error:'Buchhaltung nalog je obavezan.'});
  const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body);if(!raw||raw.length>20000)throw Error('Neispravan zahtev.');const body=JSON.parse(raw),allowed=['heartbeat','claim','prepared','sending','uncertain','sent','archived','defer','test-pdf'];if(!allowed.includes(body.action))throw Error('Radnja nije dozvoljena.');
  if(body.action==='test-pdf'){
   const profile=core.profile({legalName:'TEST – KEIN GÜLTIGER BELEG',street:'Teststraße 1',postalCode:'1010',city:'Wien',country:'AT',email:'buchhaltung@marketizo.com',taxMode:'standard20',confirmed:true});
   const snapshot=core.snapshot({id:'connection-test',name:profile.legalName,billingProfile:profile},{quantity:1,unitCents:100,serviceMonth:core.today().slice(0,7),description:'TEST – Kein gültiger Beleg. Keine Zahlung erforderlich.'});
   const pdf=await (deps.render||require('../lib/billing-store.js').render)(snapshot,0,true);return json(res,200,{ok:true,data:{...pdf,issueDate:snapshot.issueDate}});
  }
  const h=deps.helpers||require('./state.js').helpers,config=h.supabaseConfig();if(!config.configured)throw Error('Baza nije dostupna.');const store=(deps.createStore||require('../lib/billing-store.js').createStore)(config);
  if(['prepared','sending'].includes(body.action)){
   const doc=await store.rpc('get',{id:body.id}),current=await h.readStoredState(config);core.assertCurrent(current.payload.clients?.find(c=>c.id===doc.snapshot.clientId),doc.snapshot);await h.preserveDailyPrewriteBackup(config,current);
  }
  if(body.action==='sent'){const current=await h.readStoredState(config);await h.preserveDailyPrewriteBackup(config,current);}
  const data=await store.rpc(body.action,body);return json(res,200,{ok:true,data});
 }catch(e){return json(res,422,{ok:false,error:e.message||'Isporuka nije potvrđena.'});}
};}
module.exports=createHandler();module.exports.createHandler=createHandler;
