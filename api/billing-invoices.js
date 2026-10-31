'use strict';
const core=require('../lib/billing-content.js'),{createStore,render}=require('../lib/billing-store.js');
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
   const routing=require('../lib/billing-routing.js'),seen=new Set(),clients=[];
   for(const c of current.payload.clients||[]){if(c.status==='Arhiviran')continue;const key=c.billingGroupId||c.id;if(seen.has(key))continue;seen.add(key);
    try{const ctx=routing.context(current.payload,c.id),r=ctx.recipient,p=core.profile(require('../client-billing-defaults.js')(r));clients.push({id:ctx.primary.id,name:ctx.members.length>1?p.legalName+' · '+ctx.members.map(x=>x.name).join(' + '):c.name,recipientName:p.legalName,revenue:ctx.primary.revenue,billingFrequency:ctx.members.some(x=>x.billingFrequency==='once')?'once':'monthly',invoiceStartMonth:ctx.members.find(x=>x.billingFrequency==='once')?.invoiceStartMonth||String(ctx.primary.invoiceStartMonth||ctx.primary.startDate||'').slice(0,7),profile:p,profileHash:core.hash(core.profile(r.billingProfile)),missing:core.clientMissing(r),members:ctx.members.map(x=>({id:x.id,name:x.name,revenue:x.revenue,description:x.billingDescription||core.brand.defaults.description+' – '+x.name})),invoices:[...new Set(ctx.members.flatMap(x=>Object.entries(x.invoices||{}).filter(([,v])=>v.originalInvoice||v.invoiceStatus==='Poslat'||v.payments?.length||Number(v.paidAmount)>0).map(([k])=>k)))]});}
    catch(e){clients.push({id:c.id,name:c.name,revenue:c.revenue,profile:{},missing:[e.message],members:[],invoices:[]});}
   }
   return json(res,200,{ok:true,...await store.rpc('list'),defaults:core.brand.defaults,clients});
  }
  if(!String(req.headers?.['content-type']||'').startsWith('application/json'))throw Error('Neispravan zahtev.');const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body);if(!raw||raw.length>10000)throw Error('Zahtev je prevelik.');const body=JSON.parse(raw);
  if(body.action==='profile')throw Error('Podatke za račun izmeni u Klijenti → Izmena klijenta, pa osveži ovaj prikaz.');
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(body.id||''))throw Error('Neispravan ID računa.');
  if(body.action==='draft'){
   const client=current.payload.clients?.find(c=>c.id===body.clientId);if(!client)throw Error('Izaberi klijenta.');const snapshot=core.snapshotFor(current.payload,body);await h.preserveDailyPrewriteBackup(config,current);const doc=await store.rpc('draft',{id:body.id,revision:body.revision||0,snapshot,actor:h.accessSession(req,current.payload,config.key)?.employee?.id||'owner'});return json(res,200,{ok:true,invoice:doc});
  }
  const doc=await store.rpc('get',{id:body.id});core.assertSnapshot(current.payload,doc.snapshot);
  if(body.action==='preview'){
   if(doc.status!=='draft')throw Error('Račun je već izdat.');const cfg=await store.rpc('settings'),pdf=await(deps.render||render)(doc.snapshot,cfg.nextNumber);await store.rpc('preview',{id:doc.id,revision:doc.revision,snapshotHash:doc.snapshotHash,number:cfg.nextNumber,pdfBase64:pdf.base64,pdfSha256:pdf.sha256});return json(res,200,{ok:true,invoice:{...doc,previewNumber:cfg.nextNumber,pdfSha256:pdf.sha256,pdfBase64:undefined},pdf:pdf.base64});
  }
  if(body.action==='issue'){
   if(body.confirmed!==true||body.pdfSha256!==doc.pdfSha256||body.snapshotHash!==doc.snapshotHash||body.revision!==doc.revision)throw Error('Prvo pregledaj i potvrdi aktuelni PDF.');if(doc.snapshot.issueDate!==core.today())throw Error('Datum računa se promenio. Pripremi novi pregled.');await h.preserveDailyPrewriteBackup(config,current);return json(res,200,{ok:true,invoice:await store.rpc('issue',{id:doc.id,revision:doc.revision,snapshotHash:doc.snapshotHash,pdfSha256:doc.pdfSha256,profileHash:doc.snapshot.profileHash})});
  }throw Error('Nepoznata radnja.');
 }catch(e){return json(res,422,{ok:false,error:e.message||'Radnja nije završena.',missing:e.missing,clientId:e.clientId});}
};}
module.exports=createHandler();module.exports.createHandler=createHandler;
