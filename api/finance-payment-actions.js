'use strict';
const {accessSession,readStoredState,supabaseConfig,supabaseHeaders,preserveDailyPrewriteBackup}=require('./state.js').helpers;
const {registryFrom}=require('../lib/bank-matching.js');
const {transactions}=require('./bank-matches.js')._test;
const {request}=require('../lib/database-request.js');
const actions=require('../lib/finance-payment-actions.js');
const json=(res,code,body)=>{res.statusCode=code;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','private, no-store');res.end(JSON.stringify(body));};
module.exports=async(req,res)=>{
 if(require('../lib/environment.js').blockProductionFeatureInPreview(res,typeof process==='undefined'?{}:process.env))return;
 if(!['GET','POST'].includes(req.method))return json(res,405,{ok:false,error:'Metod nije podržan.'});
 if(!/^Bearer\s+\S+/i.test(req.headers?.authorization||''))return json(res,401,{ok:false,error:'Prijava je obavezna.'});
 try{
  const config=supabaseConfig();if(!config.configured)throw Error('Baza nije dostupna.');let current=await readStoredState(config);
  const allowed=()=>accessSession(req,current.payload,config.key)?.role==='full-admin';if(!allowed())return json(res,403,{ok:false,error:'Samo vlasnik može da uređuje veze uplata.'});
  const registry=process.env.FINANCE_GOOGLE_AUDIENCES?await require('../lib/finance-source-store.js').loadBankRegistry(config,process.env.BANK_DRIVE_REGISTRY):registryFrom(process.env.BANK_DRIVE_REGISTRY);
  if(req.method==='GET'){
   const bank=await transactions(process.env.KONTOFLUX_READ_KEY),p=current.payload,all=actions.entries(p);
   return json(res,200,{ok:true,clients:(p.clients||[]).map(c=>({id:c.id,name:c.name})),targets:registry.invoices.filter(x=>x.clientLinkVerified&&!x.issues.length&&x.net+x.vat===x.gross&&p.clients.find(c=>c.id===x.clientId)?.invoices?.[x.month]).map(x=>({id:x.id,number:x.number,clientId:x.clientId,client:x.client+(x.clientShares?.length>1?' · '+x.clientShares.map(s=>p.clients.find(c=>c.id===s.clientId)?.name||'').join(' + '):''),month:x.month,netCents:x.net,grossCents:x.gross})),transactions:bank.filter(t=>t.currency==='EUR'&&t.amount>0).map(t=>({id:String(t.id),date:String(t.bookingDate).slice(0,10),grossCents:Math.round(t.amount*100),payer:t.counterpart?.name||'',purpose:t.purpose||'',revision:actions.revision(p,t.id),allocatedCents:actions.allocations(p,t.id).reduce((s,e)=>s+(e.payment.bankGrossCents||0),0)})),payments:all.map(e=>({clientId:e.client.id,client:e.client.name,month:e.month,id:e.payment.id,date:e.payment.date,netCents:Math.round(e.payment.amount*100),note:e.payment.note||'',bankTransactionIds:e.payment.bankTransactionIds||[],grossCents:e.payment.bankGrossCents||e.payment.cashGrossCents||null,invoiceId:e.payment.originalInvoiceId||null,hash:actions.hash(e.payment),groupPaymentId:e.payment.groupPaymentId||null})),cash:(p.clients||[]).flatMap(c=>(c.cashReceipts||[]).map(r=>({...r,clientId:c.id,client:c.name}))),history:(p.clients||[]).flatMap(c=>(c.financePaymentActions||[]).map(a=>({...a,client:c.name}))).sort((a,b)=>b.at.localeCompare(a.at)).slice(0,100)});
  }
  if(process.env.VERCEL_ENV!=='production')return json(res,409,{ok:false,error:'Izmene su dozvoljene samo u produkciji.'});
  let body=req.body;if(typeof body==='string')body=JSON.parse(body);if(!body||JSON.stringify(body).length>15000)throw Error('Neispravan zahtev.');
  const bank=['allocate','dismiss'].includes(body.kind)?await transactions(process.env.KONTOFLUX_READ_KEY):[];
  for(let n=0;n<5;n++){
   if(!allowed())return json(res,403,{ok:false,error:'Pristup više nije dostupan.'});
   const identity=accessSession(req,current.payload,config.key),result=actions.plan(current.payload,registry,bank,body,identity.employee?.id||identity.session?.employeeId||'owner');
   if(result.duplicate)return json(res,200,{ok:true,duplicate:true,verifiedReadback:true});
   if(!current.updatedAt)throw Error('Glavni zapis nije dostupan.');await preserveDailyPrewriteBackup(config,current);
   const updatedAt=new Date(Math.max(Date.now(),Date.parse(current.updatedAt)+1)).toISOString(),id=process.env.CRM_STATE_ID||'marketizo-main';
   const r=await request(fetch,`${config.url}/rest/v1/${process.env.SUPABASE_TABLE||'agency_crm_state'}?id=eq.${encodeURIComponent(id)}&updated_at=eq.${encodeURIComponent(current.updatedAt)}&select=updated_at`,{method:'PATCH',headers:{...supabaseHeaders(config.key),Prefer:'return=representation'},body:JSON.stringify({payload:result.payload,updated_at:updatedAt})});
   if(!r.ok)throw Error('Čuvanje nije potvrđeno.');if((await r.json()).length===1){const check=await readStoredState(config);if(!check.payload.clients?.some(c=>c.financePaymentActions?.some(a=>a.actionId===body.actionId)))throw Error('Ponovno čitanje nije potvrdilo izmenu.');return json(res,200,{ok:true,verifiedReadback:true,actionId:body.actionId});}
   current=await readStoredState(config);
  }
  return json(res,409,{ok:false,error:'Drugi upis je u toku. Osveži prikaz.'});
 }catch(e){return json(res,422,{ok:false,error:e.message||'Izmena nije potvrđena.'});}
};
