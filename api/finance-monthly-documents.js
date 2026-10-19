'use strict';
const {verifyGoogle}=require('../lib/finance-google-auth.js');
const {accessSession,readStoredState,supabaseConfig,supabaseHeaders}=require('./state.js').helpers;
const {request}=require('../lib/database-request.js');
const docs=require('../lib/finance-monthly-documents.js');
const ID='finance-monthly-documents-2026-10';
const json=(res,code,body)=>{res.statusCode=code;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','private, no-store');res.end(JSON.stringify(body));};
function url(c){return `${c.url}/rest/v1/${process.env.SUPABASE_TABLE||'agency_crm_state'}`;}
async function read(c,key=ID){const r=await request(fetch,`${url(c)}?id=eq.${key}&select=payload,updated_at`,{headers:supabaseHeaders(c.key)});if(!r.ok)throw Error('Evidencija dokumenata nije dostupna.');const a=await r.json();return{data:a[0]?.payload||{documents:{},accounts:{}},revision:a[0]?.updated_at};}
async function queue(c,document,file){
 const key=ID+'-raw-'+document.sha256;
 const r=await request(fetch,url(c)+'?on_conflict=id',{method:'POST',headers:{...supabaseHeaders(c.key),Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify({id:key,payload:{file},updated_at:new Date().toISOString()})});
 if(!r.ok)throw Error('Original nije sačuvan za kopiranje.');
 const saved=(await read(c,key)).data.file;if(!saved||require('node:crypto').createHash('sha256').update(Buffer.from(saved.data,'base64')).digest('hex')!==document.sha256)throw Error('Ponovno čitanje originala nije potvrđeno.');
}
async function update(c,change){for(let i=0;i<6;i++){const old=await read(c),payload=change(structuredClone(old.data)),updated_at=new Date(Math.max(Date.now(),Date.parse(old.revision||0)+1)).toISOString();const r=await request(fetch,url(c)+(old.revision?`?id=eq.${ID}&updated_at=eq.${encodeURIComponent(old.revision)}`:''),{method:old.revision?'PATCH':'POST',headers:{...supabaseHeaders(c.key),Prefer:'return=representation'},body:JSON.stringify({id:ID,payload,updated_at})});if(r.status===409)continue;if(!r.ok)throw Error('Evidencija nije sačuvana.');if((await r.json()).length===1)return payload;}throw Error('Evidencija je zauzeta.');}
module.exports=async(req,res)=>{
 if(!['GET','POST'].includes(req.method))return json(res,405,{ok:false,error:'Metod nije podržan.'});
 try{
 const c=supabaseConfig();if(!c.configured)throw Error('Baza nije dostupna.');
 const google=await verifyGoogle(req.headers?.authorization);
 if(google){
  if(process.env.VERCEL_ENV!=='production')return json(res,409,{ok:false,error:'Sinhronizacija je dozvoljena samo u produkciji.'});
  if(req.method==='GET'){
   const h=new URL(req.url,'https://app.marketizo.com').searchParams.get('original');
   if(h){if(google.email!=='office@marketizo.com'||!/^[a-f0-9]{64}$/.test(h))throw Error('Original nije dostupan ovom nalogu.');return json(res,200,{ok:true,file:(await read(c,ID+'-raw-'+h)).data.file||null});}
   const {data}=await read(c);return json(res,200,{ok:true,month:docs.MONTH,folderId:docs.FOLDER,documents:Object.values(data.documents).map(d=>({sha256:d.sha256,copy:d.copy||null,source:d.source,sourceId:d.sourceId,account:d.account}))});
  }
  let body=req.body||{};if(typeof body==='string')body=JSON.parse(body);if(Buffer.byteLength(JSON.stringify(body))>2300000)throw Error('Zahtev je prevelik.');
  if(body.kind==='document'){
   const document=await docs.inspect(body.file,google.email);if(document.skip)return json(res,200,{ok:true,...document});
   if(document.source==='gmail')await queue(c,document,body.file);
   await update(c,d=>{const old=d.documents[document.sha256];if(!old)d.documents[document.sha256]=document;else if(document.direction==='outgoing'&&old.direction!=='outgoing')d.documents[document.sha256]={...old,...document,copy:old.copy,lease:old.lease};return d;});return json(res,200,{ok:true,document:(await read(c)).data.documents[document.sha256]});
  }
  if(body.kind==='reserve'){
   if(google.email!=='office@marketizo.com')throw Error('Kopiranje obavlja samo office nalog.');
   if(!/^[a-f0-9]{64}$/.test(body.sha256||''))throw Error('Neispravan otisak.');
   const data=await update(c,d=>{const x=d.documents[body.sha256];if(!x)throw Error('Original nije pročitan.');if(!x.copy?.verified&&(!x.lease||x.lease.until<Date.now()||x.lease.account===google.email))x.lease={account:google.email,until:Date.now()+300000};return d;});
   const x=data.documents[body.sha256];return json(res,200,{ok:true,allowed:!x.copy?.verified&&x.lease?.account===google.email,document:x});
  }
  if(body.kind==='copy-missing'){
   if(google.email!=='office@marketizo.com')throw Error('Folder proverava samo office nalog.');
   if(!/^[a-f0-9]{64}$/.test(body.sha256||''))throw Error('Neispravan otisak.');
   await update(c,d=>{const x=d.documents[body.sha256];if(x?.copy?.fileId===body.fileId){x.copy={...x.copy,verified:false,missingAt:new Date().toISOString()};delete x.lease;}return d;});return json(res,200,{ok:true});
  }
  if(body.kind==='copied'){
   if(!/^[a-f0-9]{64}$/.test(body.sha256||'')||!docs.id(body.fileId)||body.folderId!==docs.FOLDER||body.actualSha256!==body.sha256)throw Error('Kopija nije potvrđena čitanjem sadržaja.');
   await update(c,d=>{const x=d.documents[body.sha256];if(!x||x.lease?.account!==google.email)throw Error('Kopiranje nije rezervisano za ovaj nalog.');if(!x.copy?.verified)x.copy={fileId:body.fileId,folderId:docs.FOLDER,verified:true,account:google.email,at:new Date().toISOString()};return d;});return json(res,200,{ok:true,verifiedReadback:(await read(c)).data.documents[body.sha256]?.copy?.verified===true});
  }
  if(body.kind==='heartbeat'){await update(c,d=>{d.accounts[google.email]={at:new Date().toISOString(),complete:body.complete===true,pending:body.pending===true,error:String(body.error||'').slice(0,200)};return d;});return json(res,200,{ok:true});}
  throw Error('Nepoznata vrsta zahteva.');
 }
 if(req.method!=='GET')return json(res,401,{ok:false,error:'Potrebna je Google veza.'});
 if(!/^Bearer\s+\S+/i.test(req.headers?.authorization||''))return json(res,401,{ok:false,error:'Prijava je obavezna.'});
 const current=await readStoredState(c);if(accessSession(req,current.payload,c.key)?.role!=='full-admin')return json(res,403,{ok:false,error:'Prikaz je dostupan samo vlasnicima.'});
 const month=new URL(req.url,'https://app.marketizo.com').searchParams.get('month');if(month!==docs.MONTH)return json(res,200,{ok:true,enabled:false,month});
 const data=(await read(c)).data;let bank=[],bankError=null;try{bank=await require('./bank-matches.js')._test.transactions(process.env.KONTOFLUX_READ_KEY);}catch{bankError='Banka trenutno nije dostupna; lista nedostajućih dokumenata nije kompletna.';}
 return json(res,200,{ok:true,enabled:true,...docs.overview(data,bank,current.payload),bankError});
 }catch(e){return json(res,422,{ok:false,error:e.message||'Provera dokumenata nije uspela.'});}
};
module.exports._test={read,update,ID};
