'use strict';
const {PGlite}=require('@electric-sql/pglite'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const {hash}=require('../lib/sign-workflow.js'),{validateDraft,assertReady}=require('../lib/sign-content.js');
(async()=>{const db=new PGlite();await db.waitReady;try{
 await db.exec('create role anon;create role authenticated;create role service_role;create table agency_crm_state(id text primary key,payload jsonb);grant select on agency_crm_state to service_role;');
 await db.query('insert into agency_crm_state values($1,$2)',['marketizo-main',JSON.stringify({employees:[{id:'emp-miljan',active:true}]})]);
 for(const n of ['marketizo-sign.sql','marketizo-sign-flow.sql','marketizo-sign-direct.sql','marketizo-sign-completion.sql','marketizo-sign-onboarding-email.sql','marketizo-sign-onboarding-details.sql','marketizo-sign-read-first.sql','marketizo-sign-readable-documents.sql'])await db.exec(fs.readFileSync(__dirname+'/../database/'+n,'utf8'));
 await db.exec('set role service_role');
 const flow=async(action,data={},org='marketizo-main')=>(await db.query('select marketizo_sign_flow($1,$2,$3::jsonb) r',[org,action,JSON.stringify(data)])).rows[0].r;
 const command=async(action,payload)=>(await db.query('select marketizo_sign_command($1,$2,$3,$4,$5::jsonb) r',['marketizo-main','emp-miljan',crypto.randomUUID(),action,JSON.stringify(payload)])).rows[0].r;
 for(const adminEmail of ['', 'office@example.com']){
  const draft=require('../sign-onboarding-template.js').create();draft.recipients=[{name:adminEmail?'Marketizo Test':'',company:adminEmail?'TEST':'',email:adminEmail,country:adminEmail?'AT':'',role:'counterparty'}];assertReady(validateDraft(draft));
  if(!adminEmail)assert.throws(()=>assertReady({...validateDraft(draft),note:''}));
  const id=crypto.randomUUID(),requestId=crypto.randomUUID(),partyId=crypto.randomUUID(),original=Buffer.from('%PDF-original-'+id),sha=hash(original),sessionDigest=hash('session'+id),tokenSha256=hash('invite'+id);
  assert.equal((await command('save',{id,kind:'document',revision:0,data:validateDraft(draft)})).ok,true);
  assert.equal((await command('freeze',{id,kind:'document',revision:1})).ok,true);
  assert.equal((await flow('pdf_store',{actor:'emp-miljan',documentId:id,revision:2,pdfBase64:original.toString('base64'),pdfSha256:sha,renderer:'fixture'})).ok,true);
  assert.equal((await flow('prepare',{actor:'emp-miljan',id:requestId,documentId:id,revision:2,commandId:crypto.randomUUID(),requestSha256:hash(id),review:{decision:'ses_allowed',reviewedBy:'Fixture',reference:'Nonbinding fixture',pdfReviewed:true,pdfSha256:sha},issuer:{name:'Fixture'},parties:[{id:partyId,recipient:validateDraft(draft).recipients[0],tokenSha256,sealedMail:'fixture'}]})).ok,true);
  assert.equal((await flow('link_exchange',{invitationDigest:tokenSha256,sessionDigest,context:{}})).ok,true);
  assert.equal((await flow('link_view',{sessionDigest})).clientReceiptEmail,true);
  assert.equal((await flow('link_view',{sessionDigest},'other')).ok,false);
  const firstRead=await flow('onboarding_preview',{sessionDigest});assert.equal(firstRead.pdfSha256,sha);assert.equal(firstRead.pdfBase64,original.toString('base64'));assert.equal((await flow('onboarding_preview',{sessionDigest},'other')).ok,false);
  let signingOriginal=original,signingSha=sha;
  if(!adminEmail){
   const view=await flow('link_view',{sessionDigest});assert.equal(view.completion.complete,false);assert.deepEqual(view.completion.required,['name','company','country']);
   assert.equal((await flow('completion_submit',{sessionDigest,fields:{name:'Marketizo Test'}})).status,400);
   assert.equal((await flow('completion_submit',{sessionDigest,fields:{name:'Marketizo Test',company:'TEST',country:'AT'}})).ok,true);
  }
  {
   const ready=await flow('completion_render_data',{sessionDigest});assert.equal(ready.document.recipients[0].name,'Marketizo Test');
   signingOriginal=Buffer.from('%PDF-client-completed-'+id);signingSha=hash(signingOriginal);
   assert.equal((await flow('completion_pdf_store',{sessionDigest,document:ready.document,inputSha256:ready.inputSha256,pdfBase64:signingOriginal.toString('base64'),pdfSha256:signingSha,renderer:'fixture'})).ok,true);
  }
  await flow('pdf',{sessionDigest});
  const email='office@example.com';
  const accept={sessionDigest,commandId:crypto.randomUUID(),payloadSha256:hash('accept'+id),pdfSha256:signingSha,accepted:true,authority:true,signature:{name:'Marketizo Test',strokes:[]},consentText:'Nonbinding fixture explicitly accepts this exact document and the signature.',receiptEmail:'office@example.com'};
  assert.equal((await flow('link_accept',{...accept,receiptEmail:'invalid'})).status,400);assert.equal((await flow('link_accept',{...accept,receiptEmail:''})).status,400,'Client must add email before signing');
  assert.equal((await flow('link_accept',{...accept,pdfSha256:hash('wrong')})).ok,false);
  assert.equal((await db.query('select count(*) n from marketizo_sign_receipt_contacts where party_id=$1',[partyId])).rows[0].n,0,'Failed acceptance must not store email');
  const accepted=await flow('link_accept',accept);assert.equal(accepted.ok,true,JSON.stringify(accepted));assert.equal((await flow('link_accept',accept)).duplicate,true);
  assert.equal((await flow('link_accept',{...accept,receiptEmail:'different@example.com'})).status,409);
  const data=await flow('finalize_data',{requestId});assert.equal(data.signers[0].receiptEmail,email);assert.equal(data.signers[0].email,adminEmail,'Frozen identity is unchanged');
  const final=Buffer.concat([signingOriginal,Buffer.from('signed')]);assert.equal((await flow('finalize',{requestId,pdfBase64:final.toString('base64'),pdfSha256:hash(final),manifest:{originalSha256:signingSha},manifestSha256:hash('manifest'),seal:'fixture'})).ok,true);
  const messages=email?[{partyId,to:email,sealedMail:'fixture'}]:[];
  assert.equal((await flow('queue_receipts',{requestId,messages})).ok,true);
  assert.equal((await flow('queue_receipts',{requestId,messages:[{partyId,to:'wrong@example.com',sealedMail:'fixture'}]})).ok,false);
  const view=await flow('link_view',{sessionDigest});assert.equal(view.status,'signed');assert.equal(view.receiptEmail,email);
  const receipt=await flow('receipt_mail_data',{requestId,partyId});assert.equal(receipt.ok,!!email);if(email)assert.equal(receipt.to,email);
 }
 console.log('PASS optional email: optional admin email and required client email, chosen receipt target, validation, tenant checks, atomicity, immutable identity and retries');
}finally{await db.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
