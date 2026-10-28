'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const {createHandler}=require('../api/codeks.js');
const {createStore}=require('../lib/sign-store.js');
const {createCodeksStore}=require('../lib/codeks-store.js');
const {createWorkflow,hash}=require('../lib/sign-workflow.js');
const {PREFIX,TEMPLATE_ID,metadata,stableId,DEFAULT_TEXT}=require('../lib/codeks.js');
(async()=>{
 const db=new PGlite();await db.waitReady;
 await db.exec('create role anon;create role authenticated;create role service_role;create table agency_crm_state(id text primary key,payload jsonb);grant select on agency_crm_state to service_role;');
 const crm={employees:[{id:'emp-miljan',name:'Owner Fixture',email:'owner@example.invalid',active:true},{id:'emp-one',name:'First Fixture',email:'first@example.invalid',password:'NEVER-SHARE',salary:9000},{id:'emp-two',name:'Second Fixture',email:'second@example.invalid'},{id:'emp-disabled',name:'Disabled',email:'disabled@example.invalid',active:false}]};
 await db.query('insert into agency_crm_state values($1,$2)',['marketizo-main',JSON.stringify(crm)]);
 for(const file of ['marketizo-sign.sql','marketizo-sign-flow.sql','marketizo-sign-direct.sql','marketizo-sign-completion.sql','marketizo-codeks.sql','marketizo-codeks-portal.sql'])await db.exec(fs.readFileSync(path.join(__dirname,'../database',file),'utf8'));
 await db.exec('set role service_role');
 const rpc=async(name,params)=>{
  const names=Object.keys(params);if(!['marketizo_sign_command','marketizo_sign_flow','marketizo_sign_required_fields','marketizo_codeks_portal_link'].includes(name))throw Error('Unexpected RPC');
  return(await db.query('select '+name+'('+names.map((key,i)=>key+' => $'+(i+1)).join(',')+') result',Object.values(params).map(v=>v&&typeof v==='object'?JSON.stringify(v):v))).rows[0].result;
 };
 async function fetchDb(url,options={}){
  const u=new URL(url),table=u.pathname.split('/').pop();let result;
  if(u.pathname.includes('/rpc/'))result=await rpc(table,JSON.parse(options.body));
  else{
   if(!/^marketizo_sign_[a-z_]+$/.test(table))throw Error('Unexpected table');
   const values=[],where=[];
   for(const[raw,value]of u.searchParams){if(['select','order','limit','offset'].includes(raw))continue;let key=raw==='data->>note'?"data->>'note'":raw;if(!/^[a-z_]+$/.test(raw)&&raw!=='data->>note')throw Error('Unexpected key');
    if(value==='is.null')where.push(key+' is null');else if(value==='not.is.null')where.push(key+' is not null');
    else if(value.startsWith('in.(')){const set=value.slice(4,-1).split(',');where.push(key+' in ('+set.map(v=>{values.push(v);return '$'+values.length;}).join(',')+')');}
    else{const prefix=value.startsWith('not.like.')?'not.like.':value.split('.')[0]+'.',op=prefix==='eq.'?'=':prefix==='like.'?'like':prefix==='not.like.'?'not like':null;if(!op)throw Error('Unexpected operator');values.push(value.slice(prefix.length).replace(/\*/g,'%'));where.push(key+' '+op+' $'+values.length);}
   }
   let select=u.searchParams.get('select')||'*';if(select.endsWith(',contractDetails:data->contractDetails'))select=select.replace(',contractDetails:data->contractDetails',",data->'contractDetails' as \"contractDetails\"");else if(!/^[a-z0-9_,*]+$/.test(select))throw Error('Unexpected select');
   let sql='select '+select+' from '+table+(where.length?' where '+where.join(' and '):'');const order=u.searchParams.get('order');if(order){if(!/^[a-z_,.]+$/.test(order))throw Error('Unexpected order');sql+=' order by '+order.split(',').map(s=>s.replace('.',' ')).join(',');}
   if(u.searchParams.has('limit'))sql+=' limit '+Number(u.searchParams.get('limit'));if(u.searchParams.has('offset'))sql+=' offset '+Number(u.searchParams.get('offset'));
   result=(await db.query(sql,values)).rows.map(row=>Object.fromEntries(Object.entries(row).map(([k,v])=>[k,v instanceof Uint8Array?'\\x'+Buffer.from(v).toString('hex'):v])));
  }
  return {ok:true,status:200,json:async()=>result};
 }
 process.env.SIGN_INTERNAL_SECRET='fixture'.repeat(10);process.env.SIGN_EVIDENCE_SECRET='evidence'.repeat(8);process.env.SIGN_SES_ENABLED='true';process.env.SIGN_SMTP_HOST='fixture';process.env.SIGN_SMTP_USER='fixture';process.env.SIGN_SMTP_PASSWORD='fixture';process.env.SIGN_LEGAL_ENTITY='Fixture';process.env.SIGN_LEGAL_ADDRESS='Fixture';process.env.SIGN_PRIVACY_URL='https://example.invalid/privacy';
 let role='full-admin',employee=crm.employees[0];
 const config={configured:true,url:'https://fixture.invalid',key:'secret',organization:'marketizo-main'};
 const flow=createWorkflow(config,{fetch:fetchDb,origin:process.env.CODEKS_BROWSER_FIXTURE==='1'?'http://127.0.0.1:4178':'https://app.marketizo.com',helper:async input=>{if(input.action==='render'){const bytes=Buffer.from('%PDF-fixture-'+JSON.stringify(input.document));return {base64:bytes.toString('base64'),sha256:hash(bytes),renderer:'fixture'};}if(input.action==='finalize'){const bytes=Buffer.concat([Buffer.from(input.originalBase64,'base64'),Buffer.from('\nfixture-certificate')]);return{base64:bytes.toString('base64'),sha256:hash(bytes)};}if(input.action==='preview'){assert.ok(!/\s/.test(input.pdfBase64),'PostgreSQL base64 line wrapping must be normalized before strict PDF preview');return{pdfSha256:input.pdfSha256,pages:[[{text:'NEOBAVEZUJUĆE · Test kodeksa'}]],purpose:'codeks'};}throw Error('No real email permitted in this test');}});
 const store=createStore(config,fetchDb),codeks=createCodeksStore(config,fetchDb);
 const handler=createHandler({helpers:{supabaseConfig:()=>config,readStoredState:async()=>({payload:crm}),accessSession:req=>process.env.CODEKS_BROWSER_FIXTURE==='1'?(req.headers.authorization==='Bearer employee-fixture'?{role:'employee',employee:crm.employees[1]}:{role:'full-admin',employee:crm.employees[0]}):role?{role,employee}:null},createStore:()=>store,createCodeksStore:()=>codeks,createWorkflow:()=>flow,onError:e=>{if(!(e instanceof require('../lib/sign-content.js').SignError))console.error(e);}});
 async function call(method='GET',params='',body,headers={}){const req={method,url:'/api/codeks'+params,body,headers:{authorization:'Bearer fixture','content-type':'application/json',...headers}},res={headers:{},setHeader(k,v){this.headers[k]=v;},end(value){this.body=value;}};await handler(req,res);return{status:res.statusCode,body:typeof res.body==='string'?JSON.parse(res.body):res.body,headers:res.headers};}
 if(process.env.CODEKS_BROWSER_FIXTURE==='1'){
  const http=require('node:http'),root=path.join(__dirname,'..');
  const server=http.createServer(async(req,res)=>{
   try{
    const url=new URL(req.url,'http://127.0.0.1:4178');
    if(url.pathname==='/api/codeks'){const parts=[];for await(const p of req)parts.push(p);if(parts.length)req.body=Buffer.concat(parts).toString();return handler(req,res);}
    if(url.pathname==='/fixture-admin'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(`<script>localStorage.setItem('marketizoAdminSession',JSON.stringify({token:'owner-fixture',name:'Owner Fixture',employeeId:'emp-miljan',role:'full-admin',expiresAt:Date.now()+3600000}));location.replace('/kodeks')</script>`);}
    if(url.pathname==='/fixture-employee'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(`<!doctype html><html lang="sr"><head><title>Marketizo · Test portal</title><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/kodeks.css"><script>localStorage.setItem('marketizoEmployeeSession',JSON.stringify({token:'employee-fixture',expiresAt:Date.now()+3600000}));</script><script src="/kodeks-notifications.js" defer></script></head><body><div id="employeeApp" class="app-shell"><aside class="sidebar"><div class="brand"><strong>Test član tima</strong></div><nav class="nav"></nav></aside><main class="main"><header class="topbar"><h1>Dashboard · test portal</h1></header><section class="panel"><p>Izolovano test okruženje. Nema stvarnih zaposlenih ni slanja mejlova.</p></section></main></div></body></html>`);}
    const name=url.pathname==='/'?'index.html':url.pathname.slice(1)+(path.extname(url.pathname)?'':'.html');
    const file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.statusCode=404;return res.end('Not found');}
    res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
   }catch(e){res.statusCode=500;res.end('Fixture error');console.error(e);}
  });
  process.env.SIGN_APP_ORIGIN='http://127.0.0.1:4178';server.listen(4178,'127.0.0.1',()=>console.log('Kodeks fixture http://127.0.0.1:4178/fixture-admin'));return;
 }
 try{
  assert.equal((await call('GET','',null,{authorization:''})).status,401);role='client';assert.equal((await call()).status,403);role='employee';employee=crm.employees[1];assert.equal((await call('GET','?action=bootstrap')).status,403);assert.equal((await call('POST','',{action:'save'})).status,403);
  role='full-admin';employee=crm.employees[0];
  const boot=await call('GET','?action=bootstrap');assert.equal(boot.status,200);assert.equal(boot.body.ready,true);assert.ok(!JSON.stringify(boot).includes('NEVER-SHARE'));assert.ok(!JSON.stringify(boot).includes('9000'));assert.equal(boot.body.people.some(p=>p.id==='emp-disabled'),false);
  assert.equal((await call('POST','',{action:'save'},{origin:'https://evil.invalid'})).status,403);
  const save={action:'save',commandId:crypto.randomUUID(),revision:0,title:'NEOBAVEZUJUĆE · Test kodeksa',text:DEFAULT_TEXT};
  const saved=await call('POST','',save);assert.equal(saved.status,200,JSON.stringify(saved));assert.equal(saved.body.template.revision,1);
  assert.equal((await call('POST','',save)).body.template.revision,1,'Uncertain save retry is idempotent');
  assert.equal((await call('POST','',{...save,commandId:crypto.randomUUID()})).status,409,'Concurrent editor is rejected');
  assert.equal((await call('POST','',{action:'prepare',version:1,employeeId:'emp-disabled'})).status,400);
  const a=await call('POST','',{action:'prepare',version:1,employeeId:'emp-one'});assert.equal(a.status,200,JSON.stringify(a));assert.ok(a.body.pdfSha256);
  const b=await call('POST','',{action:'prepare',version:1,employeeId:'emp-one'});assert.equal(a.body.id,b.body.id);
  role='employee';employee=crm.employees[1];assert.deepEqual((await call()).body.items,[],'Preparation is not notification');
  role='full-admin';employee=crm.employees[0];
  const send={action:'send',version:1,employeeId:'emp-one',pdfSha256:a.body.pdfSha256,pdfReviewed:true,confirmed:true};
  assert.equal((await call('POST','',{...send,confirmed:false})).status,400);
  const sent=await call('POST','',send);assert.equal(sent.status,200,JSON.stringify(sent));assert.ok(!JSON.stringify(sent).includes('/sign#'),'Admin response does not expose signing secrets');
  assert.equal((await call('POST','',send)).body.duplicate,true);
  assert.equal((await db.query('select count(*)::int c from marketizo_sign_requests')).rows[0].c,1);
  assert.equal((await store.list('document',{offset:0})).items.length,0,'Kodeks is separate from Sign library');
  role='employee';employee=crm.employees[2];assert.deepEqual((await call()).body.items,[]);assert.equal((await call('POST','',{action:'open',id:a.body.id})).status,404);assert.equal((await call('GET','?action=receipt&id='+a.body.id)).status,404);
  // The delivery worker scrubs invitation payloads before the employee opens the portal.
  await db.query("update marketizo_sign_outbox set state='done',sealed_payload=null where kind='invitation'");
  employee=crm.employees[1];const own=await call();assert.equal(own.body.items[0].status,'pending');assert.ok(!JSON.stringify(own).includes('email'));const opened=await call('POST','',{action:'open',id:a.body.id});assert.equal(opened.status,200,JSON.stringify(opened));assert.match(opened.body.url,/\/sign#[A-Za-z0-9_-]{43}$/);
  assert.equal((await call('POST','',{action:'open',id:a.body.id})).body.url,opened.body.url,'Repeated portal opens retain the same valid link');
  assert.equal((await rpc('marketizo_codeks_portal_link',{p_organization:'marketizo-main',p_document:a.body.id,p_employee:'emp-two',p_digest:hash('wrong')})).status,404);
  assert.equal((await rpc('marketizo_codeks_portal_link',{p_organization:'other-org',p_document:a.body.id,p_employee:'emp-one',p_digest:hash('wrong')})).status,404);
  const invitation=new URL(opened.body.url).hash.slice(1),digest=hash(crypto.randomUUID());assert.equal((await flow.rpc('link_exchange',{invitationDigest:hash(invitation),sessionDigest:digest,context:{ip:'127.0.0.1'}})).ok,true);
  const view=await flow.rpc('link_view',{sessionDigest:digest});assert.deepEqual(view.completion.required,['name']);assert.equal(view.completion.allComplete,true,'No address or civil ID requested');
  await flow.completePdf(digest);const document=await flow.rpc('pdf',{sessionDigest:digest});
  const accept=await flow.rpc('link_accept',{sessionDigest:digest,commandId:crypto.randomUUID(),pdfSha256:document.pdfSha256,signature:{name:'First Fixture',strokes:[]},accepted:true,authority:true,consentText:'NEOBAVEZUJUĆE · Test potvrde kodeksa',payloadSha256:hash('fixture-accept')});assert.equal(accept.ok,true,JSON.stringify(accept));
  assert.equal((await call()).body.items[0].status,'processing');
  assert.equal((await call('POST','',{action:'open',id:a.body.id})).status,409,'Accepted signatures cannot be reopened for signing');
  await flow.finalize(sent.body.requestId);assert.equal((await call()).body.items[0].status,'signed');assert.equal((await call('GET','?action=receipt&id='+a.body.id)).headers['Content-Type'],'application/pdf');
  role='full-admin';employee=crm.employees[0];
  const next=await call('POST','',{...save,revision:1,commandId:crypto.randomUUID(),text:DEFAULT_TEXT+'\n\nNova test verzija.'});assert.equal(next.body.template.revision,2);
  const newer=await call('POST','',{action:'prepare',version:2,employeeId:'emp-one'});assert.notEqual(newer.body.id,a.body.id);
  const original=await store.get('document',a.body.id);assert.equal(metadata(original).version,1);assert.ok(!JSON.stringify(original.data).includes('Nova test verzija'));
  assert.deepEqual(await rpc('marketizo_sign_required_fields',{rec:{partyType:'employee'},doc:{category:'employees',content:{blocks:[{text:'JMBG'}]}}}),['name','country','address','personalId'],'Contract identity requirements unchanged');
  await db.exec('reset role;set role anon');await assert.rejects(db.query('select * from marketizo_sign_documents'),/permission denied/);await assert.rejects(db.query('select marketizo_sign_required_fields($1,$2)',[{},{}]),/permission denied/);
  await assert.rejects(db.query('select marketizo_codeks_portal_link($1,$2,$3,$4)',['marketizo-main',a.body.id,'emp-one',hash('anon')]),/permission denied/);
  console.log('PASS: Kodeks owner authorization, employee isolation, no premature notification, immutable versions, exact PDF binding, idempotent retries, own signing link, minimal identity and unchanged contract requirements.');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
