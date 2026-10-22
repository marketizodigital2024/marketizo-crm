'use strict';
const {PGlite}=require('@electric-sql/pglite');
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {hash}=require('../lib/sign-workflow.js');const {validateDraft}=require('../lib/sign-content.js');
(async()=>{
 const db=new PGlite();await db.waitReady;
 try{
  await db.exec('create role anon;create role authenticated;create role service_role;create table agency_crm_state(id text primary key,payload jsonb);grant select on agency_crm_state to service_role;');
  await db.query('insert into agency_crm_state values($1,$2)',['marketizo-main',JSON.stringify({employees:[{id:'emp-miljan',active:true}]})]);
  for(const name of ['marketizo-sign.sql','marketizo-sign-flow.sql','marketizo-sign-direct.sql','marketizo-sign-completion.sql'])await db.exec(fs.readFileSync(path.join(__dirname,'../database',name),'utf8'));
  await db.exec('set role service_role');
  const flow=async(action,data={},org='marketizo-main')=>(await db.query('select marketizo_sign_flow($1,$2,$3::jsonb) r',[org,action,JSON.stringify(data)])).rows[0].r;
  const command=async(action,payload)=>(await db.query('select marketizo_sign_command($1,$2,$3,$4,$5::jsonb) r',['marketizo-main','emp-miljan',crypto.randomUUID(),action,JSON.stringify(payload)])).rows[0].r;
  const id=crypto.randomUUID(),requestId=crypto.randomUUID(),original=Buffer.from('%PDF-direct-fixture'),sha=hash(original);
  const draft=validateDraft({title:'Direct link fixture',category:'other',signatureMethod:'ses',content:{version:1,blocks:[{type:'paragraph',runs:[{text:'Nonbinding fixture'}]}]},recipients:[{name:'First Test',email:'one@example.com',country:'AT'},{name:'Second Test',email:'two@example.com',country:'DE'}]});
  await command('save',{id,kind:'document',revision:0,data:draft});await command('freeze',{id,kind:'document',revision:1});
  await flow('pdf_store',{actor:'emp-miljan',documentId:id,revision:2,pdfBase64:original.toString('base64'),pdfSha256:sha,renderer:'fixture'});
  const parties=draft.recipients.map((recipient,i)=>({id:crypto.randomUUID(),recipient,tokenSha256:hash('invite'+i),sealedMail:'sealed-fixture'}));
  assert.equal((await flow('prepare',{actor:'emp-miljan',id:requestId,documentId:id,revision:2,commandId:crypto.randomUUID(),requestSha256:hash('prepare'),review:{decision:'ses_allowed',reviewedBy:'Fixture',reference:'Nonbinding test',pdfReviewed:true,pdfSha256:sha},issuer:{name:'Fixture'},parties})).ok,true);
  assert.equal((await flow('link_exchange',{invitationDigest:hash('wrong'),sessionDigest:hash('bad'),context:{}})).status,401);
  const sessions=[];
  for(let i=0;i<2;i++){
   const sessionDigest=hash('session'+i);sessions.push(sessionDigest);
   // The second party exercises an existing unverified cookie from the old portal.
   assert.equal((await flow(i?'exchange':'link_exchange',{invitationDigest:parties[i].tokenSha256,sessionDigest,context:{ip:'127.0.0.1',userAgent:'fixture'}})).ok,true);
   assert.equal((await flow('link_view',{sessionDigest},'wrong-tenant')).status,401);
   const view=await flow('link_view',{sessionDigest});assert.equal(view.verified,true);assert.equal(view.authenticationMethod,'email_link');
   await flow('link_view',{sessionDigest});
   assert.equal((await db.query('select accepted_at from marketizo_sign_parties where id=$1',[parties[i].id])).rows[0].accepted_at,null,'Opening/viewing never accepts');
   const accept={sessionDigest,commandId:crypto.randomUUID(),payloadSha256:hash('accept'+i),pdfSha256:sha,accepted:true,authority:true,signature:{name:draft.recipients[i].name,strokes:[]},consentText:'I have read this exact document and explicitly intend to sign it for myself or with authority.'};
   assert.equal((await flow('link_accept',accept)).status,400,'Document must be loaded first');
   assert.equal((await flow('pdf',{sessionDigest})).pdfSha256,sha);
   assert.equal((await flow('link_accept',{...accept,authority:false})).status,400);
   assert.equal((await flow('link_accept',{...accept,pdfSha256:hash('wrong')})).status,400);
   assert.equal((await flow('link_accept',{...accept,signature:{name:'Wrong person'}})).status,400);
   assert.equal((await flow('link_accept',accept)).ok,true);
   assert.equal((await flow('link_accept',accept)).duplicate,true);
   assert.equal((await flow('link_accept',{...accept,payloadSha256:hash('changed')})).status,409);
  }
  assert.equal((await db.query("select count(*)::int n from marketizo_sign_events where document_id=$1 and action like 'otp_%'",[id])).rows[0].n,0);
  assert.equal((await db.query("select count(*)::int n from marketizo_sign_events where document_id=$1 and action='email_link_accessed'",[id])).rows[0].n,2,'One access event per session');
  const evidence=await flow('finalize_data',{requestId});assert.equal(evidence.signers.length,2);
  for(const signer of evidence.signers){assert.equal(signer.authentication.method,'email_link');assert.equal(signer.authentication.identityVerified,false);assert.ok(signer.id);}
  const messages=parties.map(p=>({partyId:p.id,to:p.recipient.email,sealedMail:'encrypted-final-mail'}));
  assert.equal((await flow('queue_receipts',{requestId,messages})).status,409);
  const final=Buffer.concat([original,Buffer.from('\ncertificate')]);
  await flow('finalize',{requestId,pdfBase64:final.toString('base64'),pdfSha256:hash(final),manifest:{originalSha256:sha},manifestSha256:hash('manifest'),seal:'fixture'});
  await assert.rejects(flow('queue_receipts',{requestId,messages:[{...messages[0],to:'attacker@example.com'},messages[1]]}),/recipient mismatch/);
  assert.equal((await flow('queue_receipts',{requestId,messages})).ok,true);
  assert.equal((await flow('queue_receipts',{requestId,messages})).ok,true);
  assert.equal((await db.query("select count(*)::int n from marketizo_sign_outbox where request_id=$1 and kind='signed_pdf'",[requestId])).rows[0].n,2,'Retries cannot enqueue duplicate final emails');
  for(const party of parties){const mail=await flow('receipt_mail_data',{requestId,partyId:party.id});assert.equal(mail.to,party.recipient.email);assert.equal(hash(Buffer.from(mail.pdfBase64,'base64')),hash(final));}
  assert.equal((await flow('receipt_mail_data',{requestId,partyId:crypto.randomUUID()})).status,404);
  assert.equal((await flow('receipt_mail_data',{requestId,partyId:parties[0].id},'wrong-tenant')).status,404);
  await db.query("update marketizo_sign_sessions set expires_at=clock_timestamp()-interval '1 second' where digest=$1",[sessions[0]]);
  assert.equal((await flow('link_view',{sessionDigest:sessions[0]})).status,401);
  await db.exec('reset role');
  for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(flow('link_view',{sessionDigest:sessions[1]}),/permission denied/);await db.exec('reset role');}
  console.log('PASS: direct links show the document without OTP, opening cannot accept, old sessions upgrade, explicit exact-PDF consent is idempotent, recipients and tenants stay isolated, and final-PDF emails are durable and deduplicated.');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
