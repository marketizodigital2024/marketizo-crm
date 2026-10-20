'use strict';
// Real headless Chrome -> real Node handlers -> real PostgreSQL (PGlite) ->
// real PDF renderer. Only session identity and SMTP delivery use test fixtures.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const {createHandler:adminHandler}=require('../api/sign-admin.js');
const {createHandler:publicHandler}=require('../api/sign-public.js');
const {createStore}=require('../lib/sign-store.js');
const {createWorkflow}=require('../lib/sign-workflow.js');
const root=path.join(__dirname,'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 const db=new PGlite();await db.waitReady;
 await db.exec('create role anon;create role authenticated;create role service_role;create table agency_crm_state(id text primary key,payload jsonb);grant select on agency_crm_state to service_role;');
 const crm={employees:[{id:'emp-miljan',name:'Fixture Owner',active:true}],clients:[]};await db.query('insert into agency_crm_state values($1,$2)',['marketizo-main',JSON.stringify(crm)]);
 for(const file of ['marketizo-sign.sql','marketizo-sign-flow.sql','marketizo-sign-direct.sql'])await db.exec(fs.readFileSync(path.join(root,'database',file),'utf8'));
 const mails=[],errors=[];let server,chrome,ws,origin;
 const allowedTables=new Set(['marketizo_sign_documents','marketizo_sign_templates','marketizo_sign_events','marketizo_sign_versions','marketizo_sign_prepared_pdfs','marketizo_sign_requests','marketizo_sign_receipts','marketizo_sign_outbox']);
 async function fetchDb(url,options={}){
  const u=new URL(url), table=u.pathname.split('/').pop();let result;
  try{
   if(u.pathname.includes('/rpc/')){const b=JSON.parse(options.body);if(table==='marketizo_sign_command')result=(await db.query('select marketizo_sign_command($1,$2,$3,$4,$5::jsonb) r',[b.p_organization,b.p_actor,b.p_command,b.p_action,JSON.stringify(b.p_payload)])).rows[0].r;
    else if(table==='marketizo_sign_flow')result=(await db.query('select marketizo_sign_flow($1,$2,$3::jsonb) r',[b.p_organization,b.p_action,JSON.stringify(b.p_data)])).rows[0].r;else throw Error('Unexpected RPC');
   }else{
    if(!allowedTables.has(table))throw Error('Unexpected test table');
    let select=u.searchParams.get('select')||'*';
    if(select==='id,title,status,archived_at,data->dossier,data->parentDocumentId') select=`id,title,status,archived_at,data->'dossier' as dossier,data->'parentDocumentId' as "parentDocumentId"`;
    else if(!/^[a-zA-Z0-9_,*]+$/.test(select))throw Error('Unsafe selection');
    const values=[],where=[];
    for(const [rawKey,value]of u.searchParams){let key=rawKey;if(['select','order','limit','offset'].includes(key))continue;if(key==='data->dossier->>id')key="data->'dossier'->>'id'";else if(!/^[a-z_]+$/.test(key))throw Error('Unsafe column');
     if(value==='is.null')where.push(key+' is null');else if(value==='not.is.null')where.push(key+' is not null');
     else if(value.startsWith('eq.')){values.push(value.slice(3));where.push(key+'=$'+values.length);}
     else if(value.startsWith('ilike.')){values.push(value.slice(6).replace(/\*/g,'%'));where.push(key+' ilike $'+values.length);}else throw Error('Unsupported filter');
    }
    let sql='select '+select+' from '+table+(where.length?' where '+where.join(' and '):'');
    const order=u.searchParams.get('order');if(order){if(!/^[a-z_,.]+$/.test(order))throw Error('Unsafe order');sql+=' order by '+order.split(',').map(s=>s.replace('.',' ')).join(',');}
    if(u.searchParams.has('limit'))sql+=' limit '+Number(u.searchParams.get('limit'));if(u.searchParams.has('offset'))sql+=' offset '+Number(u.searchParams.get('offset'));
    result=(await db.query(sql,values)).rows.map(row=>Object.fromEntries(Object.entries(row).map(([k,v])=>[k,v instanceof Uint8Array?'\\x'+Buffer.from(v).toString('hex'):v])));
   }
   return{ok:true,status:200,json:async()=>result};
  }catch(e){console.error('fixture-db-error',e.message);return{ok:false,status:500,json:async()=>({})};}
 }
 async function helper(payload){
  if(payload.action==='mail'){mails.push(payload);return{accepted:true};}
  const r=cp.spawnSync(process.env.SIGN_TEST_PYTHON||'python',['-c',"import json,runpy,sys; h=runpy.run_path('api/sign-helper.py'); print(json.dumps(h['dispatch'](json.load(sys.stdin))))"],{cwd:root,input:JSON.stringify(payload),encoding:'utf8',maxBuffer:6000000});
  if(r.status!==0)throw Error(r.stderr);return JSON.parse(r.stdout);
 }
 const config={configured:true,url:'https://fixture.invalid',key:'fixture',organization:'marketizo-main'};
 const flow=()=>createWorkflow(config,{fetch:fetchDb,helper,origin});
 const admin=adminHandler({helpers:{supabaseConfig:()=>config,readStoredState:async()=>({payload:crm}),accessSession:req=>req.headers.authorization==='Bearer fixture-admin'?{role:'full-admin',employee:{id:'emp-miljan'}}:null},createStore:()=>createStore(config,fetchDb),createWorkflow:flow});
 let pub;
 try{
  server=http.createServer(async(req,res)=>{
   const u=new URL(req.url,origin||'http://127.0.0.1');
   if(u.pathname==='/api/sign-admin')return admin(req,res);if(u.pathname==='/api/sign-public')return pub(req,res);
   let name=u.pathname;if(name==='/marketizo-sign')name='/marketizo-sign.html';if(name==='/sign')name='/sign.html';if(name==='/sign-privacy-20261020')name='/sign-privacy-20261020.html';
   const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()||!/\.(html|js|mjs|css|png)$/.test(file)){res.statusCode=404;return res.end();}
   res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]);res.end(fs.readFileSync(file));
  });
  await new Promise((resolve,reject)=>{server.on('error',reject);server.listen(0,'127.0.0.1',resolve);});origin='http://127.0.0.1:'+server.address().port;
  Object.assign(process.env,{SIGN_INTERNAL_SECRET:'i'.repeat(48),SIGN_EVIDENCE_SECRET:'e'.repeat(48),SIGN_SMTP_HOST:'fixture',SIGN_SMTP_USER:'fixture',SIGN_SMTP_PASSWORD:'fixture',SIGN_LEGAL_ENTITY:'Fixture Company',SIGN_LEGAL_ADDRESS:'Fixture Address Austria',SIGN_PRIVACY_URL:'https://example.com/privacy',SIGN_SES_ENABLED:'true',SIGN_APP_ORIGIN:origin});
  pub=publicHandler({config,origin,createWorkflow:flow});
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'marketizo-sign-browser-'));
  chrome=cp.spawn(process.env.SIGN_TEST_CHROME||'google-chrome',['--headless','--no-sandbox','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
  let stderr='';const debuggerUrl=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Chrome startup timeout: '+stderr.slice(-500))),20000);chrome.stderr.on('data',chunk=>{stderr+=chunk;const match=stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(match){clearTimeout(timer);resolve(match[1]);}});chrome.on('error',reject);});
  ws=new WebSocket(debuggerUrl);await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
  let seq=0;const pending=new Map();let sessionId;
  function send(method,params={},session){return new Promise((resolve,reject)=>{const id=++seq;const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method));},30000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params,...(session?{sessionId:session}:{})}));});}
  ws.addEventListener('message',e=>{const msg=JSON.parse(e.data);if(msg.id){const p=pending.get(msg.id);if(!p)return;clearTimeout(p.timer);pending.delete(msg.id);msg.error?p.reject(Error(JSON.stringify(msg.error))):p.resolve(msg.result);}else if(msg.method==='Page.javascriptDialogOpening')send('Page.handleJavaScriptDialog',{accept:true},msg.sessionId).catch(()=>{});else if(msg.method==='Runtime.exceptionThrown')errors.push({text:msg.params.exceptionDetails.text,description:msg.params.exceptionDetails.exception?.description,url:msg.params.exceptionDetails.url});});
  const {targetId}=await send('Target.createTarget',{url:'about:blank'});({sessionId}=await send('Target.attachToTarget',{targetId,flatten:true}));
  await send('Runtime.enable',{},sessionId);await send('Page.enable',{},sessionId);
  await send('Page.addScriptToEvaluateOnNewDocument',{source:"if(window===window.top && location.protocol==='http:')localStorage.setItem('marketizoAdminSession',JSON.stringify({token:'fixture-admin',role:'full-admin',expiresAt:Date.now()+3600000}));"},sessionId);
  async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true},sessionId);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result?.value;}
  async function until(expression){for(let i=0;i<150;i++){try{if(await evaluate(expression))return;}catch{}await sleep(100);}throw Error('Browser condition failed: '+expression+' | '+await evaluate("document.getElementById('signMessage')?.textContent||document.getElementById('message')?.textContent||document.body.innerText.slice(-400)"));}
  async function click(id){await evaluate(`document.getElementById(${JSON.stringify(id)}).click()`);}
  async function fill(id,value){await evaluate(`(()=>{const e=document.getElementById(${JSON.stringify(id)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);}
  await send('Page.navigate',{url:origin+'/sign-privacy-20261020'},sessionId);
  await until("document.querySelector('h1')?.textContent==='Zaštita podataka u Marketizo Sign-u'");
  assert.equal(await evaluate('document.scripts.length'),0,'Privacy notice must be readable without scripts or a signing session');
  await send('Page.navigate',{url:origin+'/marketizo-sign'},sessionId);await until("document.getElementById('connectionStatus')?.textContent.includes('Jednostavan elektronski potpis') && !document.getElementById('newDocument').disabled");
  assert.equal(await evaluate("document.querySelectorAll('[data-new-audience]').length"),3);
  await click('newDocument');await until("!document.getElementById('workspace').hidden");await fill('documentTitle','Browser fixture contract');await fill('documentDossier','new');await fill('dossierName','Fixture Client Dossier');
  await evaluate("document.getElementById('contractEditor').textContent='Ugovor o uslugama. Čćžšđ ÄÖÜ.';document.getElementById('contractEditor').dispatchEvent(new Event('input',{bubbles:true}))");
  await click('addRecipient');
  await evaluate("for(const [k,v]of Object.entries({name:'Fixture Signer',email:'fixture@example.com',country:'AT'})){const e=document.querySelector('[data-field='+k+']');e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));}");
  await click('saveDocument');await until("document.getElementById('dirtyLabel').textContent==='Izmene su sačuvane'");
  await click('newAnnex');await until("document.getElementById('documentCategory').value==='annexes'");
  assert.equal(await evaluate("document.getElementById('parentDocument').value.length"),36);
  await click('saveDocument');await until("document.getElementById('dirtyLabel').textContent==='Izmene su sačuvane'");
  const linked=(await db.query("select data from marketizo_sign_documents where category='annexes'")).rows[0].data;
  assert.equal(linked.dossier.name,'Fixture Client Dossier');assert.ok(linked.parentDocumentId);
  await evaluate("document.querySelector('#parentDocumentLabel button').click()");await until("document.getElementById('documentTitle').value==='Browser fixture contract'");
  await click('freezeDocument');await until("document.getElementById('contractEditor').contentEditable==='false' && !document.getElementById('previewPdf').disabled");
  await click('previewPdf');await until("document.getElementById('previewDialog').open");await click('closePreview');
  await until("!document.getElementById('sendDocument').disabled");await click('sendDocument');await fill('reviewerName','Fixture legal reviewer');await fill('reviewReference','Fixture form review for Austrian service agreement');
  await evaluate("document.getElementById('confirmForm').checked=true;document.getElementById('confirmPdf').checked=true");await click('confirmSend');await until("!document.getElementById('sendDialog').open");
  assert.equal(mails.filter(m=>m.subject.includes('dokument za potpis')).length,1);
  const invitation=mails.find(m=>m.subject.includes('dokument za potpis')),token=invitation.text.match(/\/sign#([\w-]+)/)[1];
  await send('Page.navigate',{url:origin+'/sign#'+token},sessionId);
  await until("document.querySelectorAll('#documentPages canvas').length>0 && document.getElementById('documentPages').getAttribute('aria-busy')==='false' && !document.getElementById('acceptDocument').disabled && document.getElementById('title').textContent==='Browser fixture contract' && document.getElementById('message').textContent===''");
  assert.equal(await evaluate("document.getElementById('signatureSection').classList.contains('on-paper')"),true,'Signature pad must sit on the agreement');
  assert.equal(mails.some(m=>m.subject.includes('kod')),false,'No OTP must be sent');
  assert.equal(await evaluate("document.getElementById('requestOtp')!==null"),false,'No verification step');
  assert.equal((await db.query("select count(*)::int n from marketizo_sign_parties where accepted_at is not null")).rows[0].n,0,'Opening the link cannot sign');
  const out=path.join(root,'browser-results');fs.mkdirSync(out,{recursive:true});
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false},sessionId);await sleep(300);assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth+1'),false);
  fs.writeFileSync(path.join(out,'sign-mobile.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false},sessionId)).data,'base64'));
  await fill('signerName','Fixture Signer');
  await click('enlargeSignature'); assert.equal(await evaluate("document.getElementById('signatureDialog').open"),true);
  const rect=await evaluate("(()=>{const r=document.getElementById('largeSignatureCanvas').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}})()");
  const start={x:rect.x+rect.width*.15,y:rect.y+rect.height*.65};
  await send('Input.dispatchMouseEvent',{type:'mousePressed',...start,button:'left',buttons:1,clickCount:1},sessionId);
  for(const [x,y]of [[.3,.25],[.45,.7],[.6,.3],[.8,.55]])await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:rect.x+rect.width*x,y:rect.y+rect.height*y,button:'left',buttons:1},sessionId);
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:rect.x+rect.width*.8,y:rect.y+rect.height*.55,button:'left',buttons:0,clickCount:1},sessionId);
  await click('closeSignatureDialog');
  await evaluate("document.getElementById('acceptTerms').checked=true");await click('acceptDocument');
  await until("!document.getElementById('receiptLinks').hidden");
  const packages=await evaluate("Promise.all([fetch('/api/sign-public?action=evidence').then(r=>r.json()),fetch('/api/sign-public?action=receipt').then(r=>r.arrayBuffer()).then(b=>Array.from(new Uint8Array(b)))]).then(([e,p])=>({e,p}))");
  require('../scripts/verify-sign-evidence.cjs').verify(packages.e,Buffer.from(packages.p));
  assert.equal(packages.e.manifest.issuer.privacyNotice.version,'2026-10-20.1','Final evidence must preserve the notice version sent with the request');
  assert.ok(packages.e.manifest.signers[0].strokes.some(stroke=>stroke.length>=3),'Drawn signature must survive browser, database and final evidence export');
  const delivered=mails.filter(m=>m.subject==='Marketizo Sign: potpisani dokument');
  assert.equal(delivered.length,1,'One final email per recipient');assert.equal(delivered[0].to,'fixture@example.com');
  assert.equal(crypto.createHash('sha256').update(Buffer.from(delivered[0].attachment.base64,'base64')).digest('hex'),packages.e.finalSha256,'Email attaches the exact immutable signed PDF');
  assert.equal(packages.e.manifest.signers[0].authentication.method,'email_link');
  assert.deepEqual(errors,[]);assert.equal((await db.query("select status from marketizo_sign_documents where category='clients'")).rows[0].status,'signed');
  await send('Page.navigate',{url:origin+'/marketizo-sign'},sessionId);await until("document.querySelector('#dossierCards button')?.textContent.includes('Fixture Client Dossier')");
  await evaluate("document.querySelector('#dossierCards button').click()");await until("document.querySelectorAll('#documentRows tr').length===2");
  await fill('categoryFilter','annexes');await until("document.querySelectorAll('#documentRows tr').length===1");
  await evaluate("document.querySelector('#documentRows button').click()");await until("document.getElementById('documentCategory').value==='annexes'");
  await click('archiveDocument');await until("document.getElementById('archiveDocument').textContent==='Vrati iz arhive'");await click('backToLibrary');
  await evaluate("document.querySelector('[data-library=archive]').click()");await until("document.querySelectorAll('#documentRows tr').length===1");
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false},sessionId);await sleep(300);
  fs.writeFileSync(path.join(out,'sign-dossiers.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false},sessionId)).data,'base64'));
  assert.deepEqual(errors,[]);
  const beforeLinkMails=mails.length;
  await evaluate("document.querySelector('[data-new-audience=contractor]').click()");
  await until("document.getElementById('contractAudience').value==='contractor' && document.getElementById('contractStartLabel').hidden");
  assert.equal(await evaluate("document.getElementById('documentDossier').value"),'','Manual sales contract needs no CRM dossier');
  await fill('contractLanguage','de'); await fill('documentTitle','Manual contractor link fixture'); await fill('contractPlace','Wien');
  await evaluate("document.getElementById('contractEditor').textContent='NEOBAVEZUJUĆI PRIMER / UNVERBINDLICHES MUSTER';document.getElementById('contractEditor').dispatchEvent(new Event('input',{bubbles:true}))");
  await click('addRecipient');
  await evaluate("for(const [k,v]of Object.entries({name:'Manual Recipient',email:'manual@example.invalid',company:'Manual PR',address:'Fixture address',taxId:'TEST-123',country:'RS'})){const e=document.querySelector('[data-field='+k+']');e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));}");
  await click('saveDocument');await until("document.getElementById('dirtyLabel').textContent==='Izmene su sačuvane'");
  const manual=(await db.query("select data from marketizo_sign_documents where title='Manual contractor link fixture'")).rows[0].data;
  assert.equal(manual.contractDetails.language,'de');assert.equal(manual.contractDetails.audience,'contractor');assert.equal(manual.recipients[0].taxId,'TEST-123');assert.equal(manual.dossier,null);
  await click('freezeDocument');await until("!document.getElementById('previewPdf').disabled");await click('previewPdf');await until("document.getElementById('previewDialog').open");await click('closePreview');
  await click('generateLink');await fill('reviewerName','Fixture reviewer');await fill('reviewReference','Fixture form review');await evaluate("document.getElementById('confirmForm').checked=true;document.getElementById('confirmPdf').checked=true");await click('confirmSend');
  await until("document.getElementById('linksDialog').open");
  assert.match(await evaluate("document.querySelector('#generatedLinks input').value"),/\/sign#[A-Za-z0-9_-]{43}$/);
  assert.equal(mails.length,beforeLinkMails,'Manual link generation cannot send an invitation');
  console.log('PASS: real Chrome -> real API -> PostgreSQL -> PDF -> encrypted invitation -> inline PDF without OTP -> explicit acceptance -> final receipt email -> offline evidence verification, including mobile width; SMTP and owner login are isolated fixtures.');
 }finally{ws?.close();chrome?.kill();server?.closeAllConnections();await new Promise(resolve=>server?server.close(resolve):resolve());await db.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
