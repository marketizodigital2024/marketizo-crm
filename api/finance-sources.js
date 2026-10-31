'use strict';
const {accessSession,readStoredState,supabaseConfig}=require('./state.js').helpers;
const store=require('../lib/finance-source-store.js');
const {evidenceFor}=require('../lib/finance-email-evidence.js');
const {apply}=require('../lib/finance-source-apply.js');
function json(res,status,body){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','private, no-store');res.end(JSON.stringify(body));}
module.exports=async function(req,res){
 if(require('../lib/environment.js').blockProductionFeatureInPreview(res,typeof process==='undefined'?{}:process.env))return;
 if(!['GET','POST'].includes(req.method))return json(res,405,{ok:false,error:'Metod nije podržan.'});
 if(!/^Bearer\s+\S+/i.test(String(req.headers?.authorization||'')))return json(res,401,{ok:false,error:'Prijava je obavezna.'});
 try{
  const config=supabaseConfig();if(!config.configured)throw Error('Baza nije dostupna.');
  const current=await readStoredState(config),access=accessSession(req,current.payload,config.key);if(access?.role!=='full-admin')return json(res,403,{ok:false,error:'Samo vlasnici imaju pristup izvorima računa.'});
  if(!process.env.FINANCE_GOOGLE_AUDIENCES)return json(res,200,{ok:true,connected:false,invoices:[],accounts:{}});
  const {data}=await store.read(config),registry=store.mergeRegistry(process.env.BANK_DRIVE_REGISTRY,data);
  if(req.method==='POST'){
   if(process.env.VERCEL_ENV!=='production')throw Error('Potvrda važi samo u produkciji.');
   let body=req.body||{};if(typeof body==='string')body=JSON.parse(body);if(JSON.stringify(body).length>2000)throw Error('Zahtev je prevelik.');
   const x=registry.invoices.find(x=>x.number===body.invoiceNumber&&x.clientId===body.clientId),m=Object.values(data.messages||{}).find(m=>m.id===body.messageId&&m.account===body.account);
   if(!x||!m||!x.clientLinkVerified||x.issues.length||!m.to.includes(body.recipient))throw Error('Veza nije potvrđena.');
   const evidence=evidenceFor(x,data,current.payload);if(!evidence.candidates.some(c=>c.id===m.id&&c.account===m.account))throw Error('Prilog poruke ne odgovara računu.');
   const address=String(body.recipient).toLowerCase();if(!/^\S+@\S+\.\S+$/.test(address)||/@(?:marketizo\.com|marketizo\.local)$/i.test(address))throw Error('Izaberi adresu klijenta.');
   await store.update(config,d=>{d.approvedRecipients=d.approvedRecipients||{};d.approvedRecipients[x.clientId]=[...new Set([...(d.approvedRecipients[x.clientId]||[]),address])];return d;});
   return json(res,200,{ok:true,...await apply(config)});
  }
  const month=new URL(req.url,'https://app.marketizo.com').searchParams.get('month');if(!/^\d{4}-\d{2}$/.test(month||''))throw Error('Izaberi mesec.');
  return json(res,200,{ok:true,connected:true,accounts:data.accounts||{},driveCheckedAt:data.driveCheckedAt||null,parseErrors:Object.values(data.files||{}).filter(f=>f.error).map(f=>({filename:f.name,error:f.error})),invoices:registry.invoices.filter(x=>x.month===month).map(x=>({number:x.number,client:x.client,clientId:x.clientId,filename:x.filename,fileId:x.fileId||null,issues:x.issues,email:evidenceFor(x,data,current.payload)}))});
 }catch(error){return json(res,422,{ok:false,error:error.message||'Provera izvora nije uspela.'});}
};
