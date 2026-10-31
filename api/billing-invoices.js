'use strict';
const core=require('../lib/billing-content.js'),{createStore,render}=require('../lib/billing-store.js'),{request}=require('../lib/database-request.js');
const json=(res,status,body)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','private, no-store');res.end(JSON.stringify(body));};
function createHandler(deps={}){return async(req,res)=>{
 if(require('../lib/environment.js').blockProductionFeatureInPreview(res))return;
 try{
  if(!['GET','POST'].includes(req.method))return json(res,405,{ok:false,error:'Metod nije podržan.'});
  if(!/^Bearer\s+\S+/i.test(req.headers?.authorization||''))return json(res,401,{ok:false,error:'Prijavi se u aplikaciju.'});
  if(req.method==='POST'&&req.headers?.origin&&req.headers.origin!==(process.env.SIGN_APP_ORIGIN||'https://app.marketizo.com'))return json(res,403,{ok:false,error:'Poreklo zahteva nije dozvoljeno.'});
  const h=deps.helpers||require('./state.js').helpers,config=h.supabaseConfig();if(!config.configured)throw Error('Baza nije dostupna.');let current=await h.readStoredState(config);
  if(h.accessSession(req,current.payload,config.key)?.role!=='full-admin')return json(res,403,{ok:false,error:'Račune može izdavati samo vlasnik.'});
  const store=(deps.createStore||createStore)(config),query=new URL(req.url,'https://app.marketizo.com').searchParams;
  if(req.method==='GET'){
   if(query.get('action')==='pdf'){const doc=await store.rpc('get',{id:query.get('id')});const b=core.verifyPdf({base64:doc.pdfBase64,sha256:doc.pdfSha256});res.statusCode=200;res.setHeader('Content-Type','application/pdf');res.setHeader('Cache-Control','private, no-store');res.setHeader('Content-Disposition','inline; filename="Rechnung_'+String(doc.number||doc.previewNumber).padStart(6,'0')+'.pdf"');return res.end(b);}
   return json(res,200,{ok:true,...await store.rpc('list'),defaults:core.brand.defaults,clients:(current.payload.clients||[]).filter(c=>c.status!=='Arhiviran').map(c=>({id:c.id,name:c.name,revenue:c.revenue,billingFrequency:c.billingFrequency==='once'?'once':'monthly',invoiceStartMonth:String(c.invoiceStartMonth||c.startDate||'').slice(0,7),profile:core.profile(require('../client-billing-defaults.js')(c)),profileHash:core.hash(core.profile(c.billingProfile)),missing:core.missing(c.billingProfile),invoices:Object.entries(c.invoices||{}).filter(([,v])=>v.originalInvoice||v.invoiceStatus==='Poslat'||v.payments?.length||Number(v.paidAmount)>0).map(([k])=>k)}))});
  }
  if(!String(req.headers?.['content-type']||'').startsWith('application/json'))throw Error('Neispravan zahtev.');const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body);if(!raw||raw.length>10000)throw Error('Zahtev je prevelik.');const body=JSON.parse(raw);
  if(body.action==='profile'){
   const profile=core.profile(body.profile);
   for(let n=0;n<5;n++){
    if(h.accessSession(req,current.payload,config.key)?.role!=='full-admin')throw Error('Pristup je istekao.');
    const c=current.payload.clients?.find(c=>c.id===body.clientId);if(!c)throw Error('Klijent nije pronađen.');if(core.hash(core.profile(c.billingProfile))!==body.previousHash)throw Error('Profil je promenjen u drugom prozoru. Osveži prikaz.');
    await h.preserveDailyPrewriteBackup(config,current);const next=structuredClone(current.payload);next.clients.find(c=>c.id===body.clientId).billingProfile=profile;
    const at=new Date(Math.max(Date.now(),Date.parse(current.updatedAt)+1)).toISOString();const r=await request(fetch,`${config.url}/rest/v1/${process.env.SUPABASE_TABLE||'agency_crm_state'}?id=eq.${encodeURIComponent(process.env.CRM_STATE_ID||'marketizo-main')}&updated_at=eq.${encodeURIComponent(current.updatedAt)}&select=updated_at`,{method:'PATCH',headers:{...h.supabaseHeaders(config.key),Prefer:'return=representation'},body:JSON.stringify({payload:next,updated_at:at})});if(!r.ok)throw Error('Profil nije sačuvan.');if((await r.json()).length===1){const check=await h.readStoredState(config);if(core.hash(core.profile(check.payload.clients.find(c=>c.id===body.clientId)?.billingProfile))!==core.hash(profile))throw Error('Čuvanje profila nije potvrđeno.');return json(res,200,{ok:true,verifiedReadback:true});}current=await h.readStoredState(config);
   }throw Error('Drugi upis je u toku. Pokušaj ponovo.');
  }
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(body.id||''))throw Error('Neispravan ID računa.');
  if(body.action==='draft'){
   const client=current.payload.clients?.find(c=>c.id===body.clientId);if(!client)throw Error('Izaberi klijenta.');const snapshot=core.snapshot(client,body);await h.preserveDailyPrewriteBackup(config,current);const doc=await store.rpc('draft',{id:body.id,revision:body.revision||0,snapshot,actor:h.accessSession(req,current.payload,config.key)?.employee?.id||'owner'});return json(res,200,{ok:true,invoice:doc});
  }
  const doc=await store.rpc('get',{id:body.id});core.assertCurrent(current.payload.clients?.find(c=>c.id===doc.snapshot.clientId),doc.snapshot);
  if(body.action==='preview'){
   if(doc.status!=='draft')throw Error('Račun je već izdat.');const cfg=await store.rpc('settings'),pdf=await(deps.render||render)(doc.snapshot,cfg.nextNumber);await store.rpc('preview',{id:doc.id,revision:doc.revision,snapshotHash:doc.snapshotHash,number:cfg.nextNumber,pdfBase64:pdf.base64,pdfSha256:pdf.sha256});return json(res,200,{ok:true,invoice:{...doc,previewNumber:cfg.nextNumber,pdfSha256:pdf.sha256,pdfBase64:undefined},pdf:pdf.base64});
  }
  if(body.action==='issue'){
   if(body.confirmed!==true||body.pdfSha256!==doc.pdfSha256||body.snapshotHash!==doc.snapshotHash||body.revision!==doc.revision)throw Error('Prvo pregledaj i potvrdi aktuelni PDF.');if(doc.snapshot.issueDate!==core.today())throw Error('Datum računa se promenio. Pripremi novi pregled.');await h.preserveDailyPrewriteBackup(config,current);return json(res,200,{ok:true,invoice:await store.rpc('issue',{id:doc.id,revision:doc.revision,snapshotHash:doc.snapshotHash,pdfSha256:doc.pdfSha256,profileHash:doc.snapshot.profileHash})});
  }throw Error('Nepoznata radnja.');
 }catch(e){return json(res,422,{ok:false,error:e.message||'Radnja nije završena.',missing:e.missing,clientId:e.clientId});}
};}
module.exports=createHandler();module.exports.createHandler=createHandler;
