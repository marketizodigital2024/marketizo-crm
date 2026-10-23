'use strict';
const {withRequestBudget}=require('../lib/database-request.js');
const {SignError}=require('../lib/sign-content.js');
const {createStore}=require('../lib/sign-store.js');
const {createCodeksStore}=require('../lib/codeks-store.js');
const {createWorkflow,readiness,hash}=require('../lib/sign-workflow.js');
const {TEMPLATE_ID,TEMPLATE_NOTE,DEFAULT_TEXT,stableId,metadata,templateData,documentData}=require('../lib/codeks.js');
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function id(v){if(!UUID.test(v||''))throw new SignError(400,'Proveri identifikator.');return v;}
function json(res,status,data){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));}
async function readBody(req){
 if(!String(req.headers?.['content-type']||'').startsWith('application/json'))throw new SignError(415,'Potreban je JSON zahtev.');
 let raw;
 if(req.body!==undefined)raw=typeof req.body==='string'?req.body:JSON.stringify(req.body);
 else{const parts=[];let size=0;for await(const part of req){size+=Buffer.byteLength(part);if(size>300000)throw new SignError(413,'Tekst je prevelik.');parts.push(Buffer.from(part));}raw=Buffer.concat(parts).toString('utf8');}
 if(Buffer.byteLength(raw)>300000)throw new SignError(413,'Tekst je prevelik.');
 try{const b=JSON.parse(raw);if(!b||typeof b!=='object'||Array.isArray(b))throw Error();return b;}catch{throw new SignError(400,'Zahtev nije ispravan.');}
}
function createHandler(deps={}){return async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');
 try{
  if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return json(res,405,{ok:false,error:'Metod nije podržan.'});}
  if(!/^Bearer\s+\S+$/i.test(req.headers?.authorization||''))throw new SignError(401,'Prijavi se u Marketizo.');
  if(req.method==='POST'&&req.headers.origin&&req.headers.origin!==(process.env.SIGN_APP_ORIGIN||'https://app.marketizo.com'))throw new SignError(403,'Poreklo zahteva nije dozvoljeno.');
  const helpers=deps.helpers||require('./state.js').helpers,base=helpers.supabaseConfig();
  if(!base.configured)throw new SignError(503,'Online baza nije povezana.');
  // Match the canonical state namespace, including preview isolation.
  const config={...base,organization:process.env.VERCEL_ENV==='preview'?'marketizo-smm-preview-v1':process.env.CRM_STATE_ID||'marketizo-main'};
  const current=await helpers.readStoredState(base),access=helpers.accessSession(req,current.payload,base.key);
  if(!access||access.role==='client')throw new SignError(403,'Kodeks je dostupan prijavljenim članovima tima.');
  const owner=access.role==='full-admin',actor=access.employee.id;
  const store=(deps.createStore||createStore)(config),codeks=(deps.createCodeksStore||createCodeksStore)(config),flow=(deps.createWorkflow||createWorkflow)(config);
  async function getTemplate(){try{const t=await store.get('template',TEMPLATE_ID);if(t.data.note!==TEMPLATE_NOTE||t.archived_at)throw new SignError(409,'Kodeks nije dostupan.');return t;}catch(e){if(e.status===404)return null;throw e;}}
  async function assigned(docId){const d=await store.get('document',id(docId)),meta=metadata(d);if(!meta||(!owner&&meta.employeeId!==actor))throw new SignError(404,'Kodeks nije pronađen.');return d;}
  const params=new URL(req.url,'https://app.marketizo.com').searchParams;
  if(req.method==='GET'){
   const action=params.get('action')||'list';
   if(action==='bootstrap'){
    if(!owner)throw new SignError(403,'Uređivanje kodeksa je dostupno vlasnicima aplikacije.');
    const t=await getTemplate();
    return json(res,200,{ok:true,template:t?{id:t.id,title:t.title,revision:t.revision,text:t.data.content.blocks.map(b=>b.runs.map(r=>r.text).join('')).join('\n\n')}: {id:TEMPLATE_ID,title:'Kodeks ponašanja Marketizo tima',revision:0,text:DEFAULT_TEXT},
     ready:await codeks.ready(),sendingEnabled:(deps.readiness||readiness)().sendingEnabled,
     people:(current.payload.employees||[]).filter(e=>e.active!==false&&e.status!=='Neaktivan').map(e=>({id:e.id,name:e.name,email:e.email||''}))});
   }
   if(action==='list'){
    const offset=Number(params.get('offset')||0);if(!Number.isInteger(offset)||offset<0||offset>100000)throw new SignError(400,'Proveri stranicu.');
    const list=await codeks.list({employeeId:owner&&params.get('mine')!=='true'?undefined:actor,offset});
    // Unsent preparations never appear to employees as delivered requests.
    if(!owner||params.get('mine')==='true')list.items=list.items.filter(d=>d.status!=='prepared');
    return json(res,200,{ok:true,...list});
   }
   if(action==='receipt'){
    const d=await assigned(params.get('id')),data=await flow.adminArtifact(d.id,'receipt');
    if(hash(data.bytes)!==data.sha256)throw new SignError(503,'PDF nije potvrđen.');
    res.statusCode=200;res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition','attachment; filename="Marketizo-Kodeks.pdf"');return res.end(data.bytes);
   }
   throw new SignError(400,'Nepoznata radnja.');
  }
  const body=await readBody(req);
  if(body.action==='open'){
   const d=await assigned(body.id),url=await codeks.link(d.id);
   const parsed=new URL(url);if(parsed.origin!==(process.env.SIGN_APP_ORIGIN||'https://app.marketizo.com')||parsed.pathname!=='/sign'||!/^#[A-Za-z0-9_-]{43}$/.test(parsed.hash))throw new SignError(503,'Poziv nije potvrđen.');
   return json(res,200,{ok:true,url});
  }
  if(!owner)throw new SignError(403,'Uređivanje i slanje kodeksa dostupni su vlasnicima aplikacije.');
  if(body.action==='save'){
   if(!Number.isInteger(body.revision)||body.revision<0)throw new SignError(400,'Proveri verziju kodeksa.');
   const data=templateData(body.title,body.text);
   const result=await store.command(actor,id(body.commandId),'save',{id:TEMPLATE_ID,kind:'template',revision:body.revision,data});
   const latest=await getTemplate();
   if(latest.revision!==result.revision)throw new SignError(409,'Tvoje čuvanje je potvrđeno, ali je kodeks zatim izmenjen u drugom prozoru. Sačuvaj svoj tekst lokalno i osveži stranicu da uporediš poslednju verziju.');
   return json(res,200,{...result,template:latest});
  }
  if(!['prepare','send'].includes(body.action))throw new SignError(400,'Nepoznata radnja.');
  if(!(await codeks.ready()))throw new SignError(503,'Potpisivanje kodeksa čeka pripremu baze. Nacrt možeš sačuvati.');
  const employee=(current.payload.employees||[]).find(e=>e.id===body.employeeId&&e.active!==false&&e.status!=='Neaktivan');
  if(!employee||!employee.name||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(employee.email||''))throw new SignError(400,'Zaposleni mora imati aktivan nalog, ime i ispravan mejl.');
  if(!Number.isInteger(body.version)||body.version<1)throw new SignError(400,'Prvo sačuvaj kodeks.');
  const documentId=stableId(`${config.organization}:${TEMPLATE_ID}:${body.version}:${employee.id}`);
  if(body.action==='prepare'){
   const t=await getTemplate();if(!t||t.revision!==body.version)throw new SignError(409,'Kodeks je izmenjen. Učitaj poslednju verziju pre pripreme.');
   let d;try{d=await store.get('document',documentId);}catch(e){if(e.status!==404)throw e;}
   if(!d){await store.command(actor,stableId(documentId+':save'),'save',{id:documentId,kind:'document',revision:0,data:documentData(t,employee)});d=await store.get('document',documentId);}
   if(metadata(d)?.employeeId!==employee.id||d.archived_at)throw new SignError(409,'Pripremljeni kodeks nije dostupan.');
   if(d.data.recipients[0].email!==employee.email.trim().toLowerCase()||d.data.recipients[0].name!==employee.name.trim())throw new SignError(409,'Podaci zaposlenog su promenjeni. Sačuvaj novu verziju kodeksa pre slanja.');
   if(d.status==='draft'){await store.command(actor,stableId(documentId+':freeze'),'freeze',{id:documentId,kind:'document',revision:d.revision});d=await store.get('document',documentId);}
   if(d.status!=='ready')return json(res,200,{ok:true,id:d.id,alreadySent:true});
   const pdf=await flow.preparePdf(actor,d),preview=await flow.helper({action:'preview',pdfBase64:pdf.pdfBase64.replace(/\s/g,''),pdfSha256:pdf.pdfSha256});
   if(preview.pdfSha256!==pdf.pdfSha256||!Array.isArray(preview.pages)||!preview.pages.length)throw new SignError(503,'Pregled kodeksa nije potvrđen.');
   return json(res,200,{ok:true,id:d.id,pdfSha256:pdf.pdfSha256,pages:preview.pages});
  }
  if(body.confirmed!==true||!body.pdfReviewed||!/^[a-f0-9]{64}$/.test(body.pdfSha256||''))throw new SignError(400,'Pregledaj kodeks i potvrdi slanje.');
  const d=await assigned(documentId),meta=metadata(d);
  if(meta.version!==body.version||d.data.recipients[0].email!==employee.email.trim().toLowerCase())throw new SignError(409,'Podaci su promenjeni. Ponovo pripremi slanje.');
  // Stable per-version/per-employee command: uncertain retries cannot create duplicate invitations.
  const result=await flow.prepare(actor,{commandId:stableId(documentId+':send'),revision:2,delivery:'link',review:{decision:'ses_allowed',reviewedBy:d.created_by||actor,reference:`Kodeks v${body.version}: potvrđen pregled i elektronsko potpisivanje u administratorskoj aplikaciji.`,pdfReviewed:true,pdfSha256:body.pdfSha256}},d);
  return json(res,200,{ok:result.ok,id:d.id,requestId:result.requestId,duplicate:result.duplicate===true});
 }catch(e){if(deps.onError)deps.onError(e);return json(res,e instanceof SignError?e.status:503,{ok:false,error:e instanceof SignError?e.message:'Kodeks trenutno nije dostupan. Unos je zadržan; pokušaj ponovo.'});}
};}
module.exports=(req,res)=>withRequestBudget(()=>createHandler()(req,res),90000);
module.exports.createHandler=createHandler;
