'use strict';
const crypto=require('node:crypto');
const {withRequestBudget}=require('../lib/database-request.js');
const {SignError,validateDraft}=require('../lib/sign-content.js');
const {createWorkflow,readiness,origin,context,mac,hash,canonical,PRIVACY_VERSION}=require('../lib/sign-workflow.js');
const template=require('../sign-onboarding-template.js');
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
let cached;
function createHandler(deps={}){return async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');
 const json=(status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));};
 try{
  if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return json(405,{ok:false,error:'Metod nije podržan.'});}
  if(req.method==='POST'&&(req.headers.origin!==(deps.origin||origin())||req.headers['x-sign-request']!=='1'))throw new SignError(403,'Zahtev nije dozvoljen sa ove adrese.');
  const ready=(deps.readiness||readiness)();if(!ready.sendingEnabled)throw new SignError(503,'Onboarding trenutno nije dostupan.');
  const config=deps.config||require('./state.js').helpers.supabaseConfig();if(!config.configured)throw new SignError(503,'Onboarding trenutno nije dostupan.');
  const flow=(deps.createWorkflow||createWorkflow)({...config,organization:process.env.CRM_STATE_ID||'marketizo-main'}),ctx=context(req);
  await flow.rpc('rate',{key:mac('public-onboarding-'+req.method,ctx.ip)});
  const document=(deps.template||template.create)();document.recipients=[{role:'counterparty',name:'',company:'',email:'',country:'',partyType:'business'}];
  const doc=validateDraft(document),issuer={name:process.env.SIGN_LEGAL_ENTITY,address:process.env.SIGN_LEGAL_ADDRESS,email:'office@marketizo.com',privacyNotice:{version:PRIVACY_VERSION,url:process.env.SIGN_PRIVACY_URL}};
  const templateSha256=hash(canonical({document:doc,issuer}));
  // Canonical public source only. No client data, document ids, or signing tokens are cached.
  if(!cached||cached.key!==templateSha256){const promise=flow.helper({action:'render',document:doc,issuer}).then(pdf=>{
   const bytes=Buffer.from(pdf.base64||'','base64');if(bytes.length>1000000||hash(bytes)!==pdf.sha256||bytes.subarray(0,5).toString()!=='%PDF-')throw new SignError(503,'PDF nije potvrđen.');return pdf;
  });cached={key:templateSha256,promise};promise.catch(()=>{if(cached?.promise===promise)cached=null;});}
  const pdf=await cached.promise;
  if(req.method==='GET')return json(200,{ok:true,title:doc.title,content:doc.content,issuer,templateSha256,pdfBase64:pdf.base64,pdfSha256:pdf.sha256});
  if(!String(req.headers['content-type']||'').startsWith('application/json'))throw new SignError(415,'Potreban je JSON zahtev.');
  let raw=req.body;if(raw===undefined){const chunks=[];let size=0;for await(const chunk of req){size+=Buffer.byteLength(chunk);if(size>2048)throw new SignError(413,'Zahtev je prevelik.');chunks.push(Buffer.from(chunk));}raw=Buffer.concat(chunks).toString();}
  if(typeof raw==='object')raw=JSON.stringify(raw);if(Buffer.byteLength(raw||'')>2048)throw new SignError(413,'Zahtev je prevelik.');
  let body;try{body=JSON.parse(raw);}catch{throw new SignError(400,'Proveri zahtev.');}
  if(!body||body.action!=='start'||!UUID.test(body.commandId||'')||Object.keys(body).some(k=>!['action','commandId','templateSha256'].includes(k)))throw new SignError(400,'Proveri zahtev.');
  if(body.templateSha256!==templateSha256)throw new SignError(409,'Pravila su ažurirana. Osvežite stranicu i pročitajte važeću verziju.');
  // Stable secret token makes a timed-out retry return the same individual document.
  const token=Buffer.from(mac('public-onboarding-token',body.commandId),'hex').toString('base64url');
  await flow.rpc('public_onboarding_start',{commandId:body.commandId,requestSha256:hash(canonical(body)),templateSha256,document:doc,issuer,pdfBase64:pdf.base64,pdfSha256:pdf.sha256,renderer:pdf.renderer,tokenSha256:hash(token),context:ctx});
  return json(200,{ok:true,url:'/sign?onboarding-details=1#'+token});
 }catch(e){return json(e instanceof SignError?e.status:503,{ok:false,error:e instanceof SignError?e.message:'Onboarding trenutno nije dostupan. Pokušajte ponovo.'});}
};}
module.exports=(req,res)=>withRequestBudget(()=>createHandler()(req,res),90000);
module.exports.createHandler=createHandler;
