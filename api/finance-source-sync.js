'use strict';
const {createHash}=require('node:crypto');
const {verifyGoogle}=require('../lib/finance-google-auth.js');
const {supabaseConfig}=require('./state.js').helpers;
const store=require('../lib/finance-source-store.js');
const {parseFile}=require('../lib/finance-document-parser.js');
const {apply}=require('../lib/finance-source-apply.js');
const {refs}=require('../lib/bank-matching.js');
function json(res,status,body){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','private, no-store');res.end(JSON.stringify(body));}
async function readBody(req){if(req.body){const s=typeof req.body==='string'?req.body:JSON.stringify(req.body);if(Buffer.byteLength(s)>2800000)throw Error('Zahtev je prevelik.');return JSON.parse(s);}const chunks=[];let size=0;for await(const c of req){size+=Buffer.byteLength(c);if(size>2800000)throw Error('Zahtev je prevelik.');chunks.push(Buffer.from(c));}return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}
const id=s=>typeof s==='string'&&/^[a-zA-Z0-9_-]{8,180}$/.test(s);
function metadata(f){if(!id(f.id)||!/^Rechnung[_ ]*\d{3,9}[_ ]/i.test(f.name||'')||f.name.length>300||!['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(f.mimeType)||!Number.isFinite(Date.parse(f.modifiedTime)))throw Error('Neispravni podaci fajla.');return{id:f.id,name:f.name,mimeType:f.mimeType,modifiedTime:f.modifiedTime,sha256Checksum:/^[a-f0-9]{64}$/.test(f.sha256Checksum||'')?f.sha256Checksum:null};}
function message(m,account){
 if(!id(m.id)||m.account!==account||m.from!==account||m.sent!==true||!Array.isArray(m.labels)||!m.labels.includes('SENT')||m.labels.includes('DRAFT')||!Number.isFinite(Date.parse(m.sentAt))||Date.parse(m.sentAt)>Date.now()+60000||!Array.isArray(m.to)||m.to.length>30||!Array.isArray(m.attachments)||m.attachments.length>10)throw Error('Poruka nije potvrđena kao poslata.');
 const to=[...new Set(m.to.map(s=>String(s).trim().toLowerCase()))];if(!to.length||to.some(s=>!/^\S+@\S+\.\S+$/.test(s)||s.length>254))throw Error('Proveri primaoce.');
 const attachments=m.attachments.map(a=>{if(typeof a.filename!=='string'||a.filename.length>300||!/^Rechnung[_ ]*\d{3,9}[_ ].+\.(pdf|docx)$/i.test(a.filename))throw Error('Prilog nije račun.');const bytes=Buffer.from(a.data||'','base64');if(bytes.length<20||bytes.length>1500000)throw Error('Prilog je prevelik ili prazan.');const ns=refs(a.filename);const number=Number(a.filename.match(/^Rechnung[_ ]*0*(\d{3,6})[_ ]/i)?.[1]);if(!number||ns.length>1)throw Error('Broj priloga nije jednoznačan.');return{filename:a.filename,number,sha256:createHash('sha256').update(bytes).digest('hex')};});
 return{id:m.id,account,from:account,to,sent:true,labels:['SENT'],sentAt:new Date(m.sentAt).toISOString(),attachments,url:`https://mail.google.com/mail/u/?authuser=${encodeURIComponent(account)}#sent/${m.id}`,checkedAt:new Date().toISOString()};
}
module.exports=async function(req,res){
 if(!['GET','POST'].includes(req.method))return json(res,405,{ok:false,error:'Metod nije podržan.'});
 const identity=await verifyGoogle(req.headers?.authorization);if(!identity)return json(res,401,{ok:false,error:'Potrebna je odobrena Google veza.'});
 if(process.env.VERCEL_ENV!=='production')return json(res,409,{ok:false,error:'Sinhronizacija je dozvoljena samo u produkciji.'});
 const config=supabaseConfig();if(!config.configured)return json(res,503,{ok:false,error:'Baza nije dostupna.'});
 try{
  if(req.method==='GET'){const {data}=await store.read(config);return json(res,200,{ok:true,files:identity.email==='office@marketizo.com'?Object.fromEntries(Object.entries(data.files||{}).filter(([,v])=>v.parsed&&!v.error&&!v.deleted).map(([k,v])=>[k,v.modifiedTime])):{},messages:Object.values(data.messages||{}).filter(m=>m.account===identity.email).map(m=>m.id)});}
  const body=await readBody(req);let data;
  if(body.kind==='manifest'){
   if(identity.email!=='office@marketizo.com'||body.folderId!==store.folderId||body.complete!==true||!Array.isArray(body.files)||body.files.length>2000)throw Error('Proveri izvorni folder.');
   const files=body.files.map(metadata);if(new Set(files.map(f=>f.id)).size!==files.length)throw Error('Dupliran fajl u listi.');
   data=await store.update(config,d=>{d.manifests=d.manifests||{};d.manifests[store.folderId]={files,complete:true,checkedAt:new Date().toISOString()};d.driveCheckedAt=new Date().toISOString();for(const [k,f]of Object.entries(d.files||{}))if(!files.some(x=>x.id===k))f.deleted=true;return d;});
  }else if(body.kind==='file'){
   if(identity.email!=='office@marketizo.com'||body.folderId!==store.folderId)throw Error('Proveri izvorni folder.');const f=metadata(body.file),before=await store.read(config),item=before.data.manifests?.[store.folderId]?.files?.find(x=>x.id===f.id);
   if(!item||item.modifiedTime!==f.modifiedTime)throw Error('Fajl nije potvrđen aktuelnom listom foldera.');
   let parsed,error;try{parsed=await parseFile({...f,data:body.file.data});if(item.sha256Checksum&&parsed.sha256!==item.sha256Checksum)throw Error('Sadržaj je promenjen posle listanja.');}catch(e){parsed=null;error=e.message;}
   data=await store.update(config,d=>{d.files=d.files||{};d.files[f.id]={...f,parsed:parsed||null,error:error||null,deleted:false};return d;});
  }else if(body.kind==='message'){
   const m=message(body.message,identity.email);data=await store.update(config,d=>{d.messages=d.messages||{};const key=identity.email+':'+m.id;if(!d.messages[key])d.messages[key]=m;d.mailCheckedAt=new Date().toISOString();return d;});
  }else if(body.kind==='heartbeat'){
   data=await store.update(config,d=>{d.accounts=d.accounts||{};d.accounts[identity.email]={checkedAt:new Date().toISOString()};return d;});
  }else throw Error('Nepoznata vrsta izvora.');
  const result=await apply(config);return json(res,200,{ok:true,...result});
 }catch(error){return json(res,422,{ok:false,error:error.message||'Izvor nije potvrđen.'});}
};
module.exports._test={message,metadata};
