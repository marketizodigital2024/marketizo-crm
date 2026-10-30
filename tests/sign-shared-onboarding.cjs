'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const {createHandler}=require('../api/onboarding.js');
const {hash}=require('../lib/sign-workflow.js'),{validateDraft}=require('../lib/sign-content.js');
const template=require('../sign-onboarding-template.js');
process.env.SIGN_INTERNAL_SECRET='fixture-secret-'.repeat(4);process.env.SIGN_LEGAL_ENTITY='Fixture Company';process.env.SIGN_LEGAL_ADDRESS='Fixture Address';process.env.SIGN_PRIVACY_URL='https://fixture.invalid/privacy';
(async()=>{
 const calls=[],bytes=Buffer.from('%PDF-shared-fixture');
 const handler=createHandler({origin:'https://fixture.invalid',config:{configured:true},readiness:()=>({sendingEnabled:true}),createWorkflow:()=>({rpc:async(action,data)=>{calls.push({action,data});return{ok:true};},helper:async()=>({base64:bytes.toString('base64'),sha256:hash(bytes),renderer:'fixture'})})});
 async function request(method='GET',body,origin='https://fixture.invalid'){
  let text;const headers={};const res={setHeader:(k,v)=>headers[k]=v,end:v=>text=v};
  await handler({method,headers:{origin,'x-sign-request':'1','content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),socket:{remoteAddress:'127.0.0.1'}},res);return{status:res.statusCode,body:JSON.parse(text),headers};
 }
 const read=await request();assert.equal(read.status,200);assert.equal(read.body.pdfSha256,hash(bytes));assert.equal(calls.some(c=>c.action==='public_onboarding_start'),false,'Reading must not create a document');
 assert.equal(read.headers['Cache-Control'],'private, no-store');
 const commandId=crypto.randomUUID(),body={action:'start',commandId,templateSha256:read.body.templateSha256};
 assert.equal((await request('POST',body,'https://evil.invalid')).status,403);
 assert.equal((await request('POST',{...body,document:{title:'changed'}})).status,400);
 assert.equal((await request('POST',{...body,templateSha256:'f'.repeat(64)})).status,409);
 const first=await request('POST',body),retry=await request('POST',body),second=await request('POST',{...body,commandId:crypto.randomUUID()});
 assert.equal(first.status,200);assert.match(first.body.url,/^\/sign\?onboarding-details=1#[A-Za-z0-9_-]{43}$/);assert.equal(first.body.url,retry.body.url);assert.notEqual(first.body.url,second.body.url);
 assert.equal(calls.filter(c=>c.action==='public_onboarding_start')[0].data.document.recipients[0].name,'');
 const db=new PGlite();await db.waitReady;
 try{
  await db.exec('create role anon;create role authenticated;create role service_role;create table agency_crm_state(id text primary key,payload jsonb);grant select on agency_crm_state to service_role;');
  await db.query('insert into agency_crm_state values($1,$2)',['marketizo-main',JSON.stringify({employees:[{id:'emp-miljan',active:true}]})]);
  for(const n of ['marketizo-sign.sql','marketizo-sign-flow.sql','marketizo-sign-direct.sql','marketizo-sign-completion.sql','marketizo-sign-onboarding-email.sql','marketizo-sign-onboarding-details.sql','marketizo-sign-read-first.sql','marketizo-sign-public-onboarding.sql','marketizo-sign-readable-documents.sql'])await db.exec(fs.readFileSync(__dirname+'/../database/'+n,'utf8'));
  assert.equal((await db.query("select has_function_privilege('anon','marketizo_sign_flow(text,text,jsonb)','EXECUTE') allowed")).rows[0].allowed,false);
  await db.exec('set role service_role');
  const flow=async(action,data={},org='marketizo-main')=>(await db.query('select marketizo_sign_flow($1,$2,$3::jsonb) r',[org,action,JSON.stringify(data)])).rows[0].r;
  const d=template.create();d.recipients=[{role:'counterparty',name:'',company:'',email:'',country:'',partyType:'business'}];const doc=validateDraft(d);
  const base={document:doc,issuer:{name:'Fixture Company'},pdfBase64:bytes.toString('base64'),pdfSha256:hash(bytes),renderer:'fixture',templateSha256:hash('template'),context:{ip:'127.0.0.1'}};
  const records=[];
  for(let i=0;i<2;i++){
   const cmd=crypto.randomUUID(),payload={...base,commandId:cmd,requestSha256:hash(cmd),tokenSha256:hash('token'+cmd)};
   const made=await flow('public_onboarding_start',payload);assert.equal(made.ok,true,JSON.stringify(made));records.push(made);
   assert.equal((await flow('public_onboarding_start',payload)).documentId,made.documentId);
   assert.equal((await flow('public_onboarding_start',{...payload,requestSha256:hash('changed')})).status,409);
   const sessionDigest=hash('session'+cmd);assert.equal((await flow('link_exchange',{invitationDigest:payload.tokenSha256,sessionDigest,context:{}})).ok,true);
   const view=await flow('link_view',{sessionDigest});assert.equal(view.completion.complete,false);assert.equal(view.accepted,false);
   assert.equal((await flow('completion_submit',{sessionDigest,fields:{name:'Client '+i,company:'Company '+i,country:'AT',postalCode:'x'.repeat(21)}})).status,400);
   assert.equal((await flow('completion_submit',{sessionDigest,fields:{name:'Client '+i,company:'Company '+i,country:'AT',postalCode:'11000'}})).ok,true);
   const ready=await flow('completion_render_data',{sessionDigest});assert.equal(ready.document.recipients[0].name,'Client '+i);assert.equal(ready.document.recipients[0].postalCode,'11000');
   if(i===0){
    const filled=Buffer.from('%PDF-completed-public-client'),filledSha=hash(filled);
    assert.equal((await flow('completion_pdf_store',{sessionDigest,document:ready.document,inputSha256:ready.inputSha256,pdfBase64:filled.toString('base64'),pdfSha256:filledSha,renderer:'fixture'})).ok,true);
    await flow('pdf',{sessionDigest});
    assert.equal((await flow('link_accept',{sessionDigest,commandId:crypto.randomUUID(),payloadSha256:hash('accept'),pdfSha256:filledSha,signature:{name:'Client 0',strokes:[]},accepted:true,authority:true,consentText:'Fixture explicit agreement with this exact nonbinding test document.',receiptEmail:'fixture@example.com'})).ok,true);
    const evidence=await flow('finalize_data',{requestId:made.requestId});assert.equal(evidence.signers[0].receiptEmail,'fixture@example.com');assert.equal(evidence.originalSha256,filledSha);
    const final=Buffer.concat([filled,Buffer.from('signed')]);
    assert.equal((await flow('finalize',{requestId:made.requestId,pdfBase64:final.toString('base64'),pdfSha256:hash(final),manifest:{originalSha256:filledSha},manifestSha256:hash('manifest'),seal:'fixture'})).ok,true);
    assert.equal((await flow('link_view',{sessionDigest})).status,'signed');
   }
  }
  assert.notEqual(records[0].documentId,records[1].documentId);
  assert.equal((await db.query('select count(*) n from marketizo_sign_documents')).rows[0].n,2,'Each client has one separate document, retries do not duplicate');
  assert.equal((await db.query("select count(*) n from marketizo_sign_outbox where kind='invitation'")).rows[0].n,0,'A shared-link opening must not send invitations');
  const rows=(await db.query('select recipient_names,search_text from marketizo_sign_documents order by recipient_names')).rows;assert.equal(rows[0].recipient_names,'Client 0');assert.equal(rows[1].recipient_names,'Client 1');
  assert.equal((await flow('public_onboarding_start',{...base,commandId:crypto.randomUUID(),requestSha256:hash('x'),tokenSha256:hash('y')},'other')).status,403);
 }finally{await db.close();}
 console.log('PASS shared onboarding: read without identity, canonical source, origin checks, stale-version rejection, stable private retries, separate client records, completion and private grants');
})().catch(e=>{console.error(e);process.exitCode=1;});
