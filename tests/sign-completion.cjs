'use strict';
const {PGlite}=require('@electric-sql/pglite');
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {hash}=require('../lib/sign-workflow.js'),{validateDraft,assertReady}=require('../lib/sign-content.js');
const {personalizeDocument,validateFields}=require('../lib/sign-personalization.js');
(async()=>{
 const db=new PGlite();await db.waitReady;
 try{
  await db.exec('create role anon;create role authenticated;create role service_role;create table agency_crm_state(id text primary key,payload jsonb);grant select on agency_crm_state to service_role;');
  await db.query('insert into agency_crm_state values($1,$2)',['marketizo-main',JSON.stringify({employees:[{id:'emp-miljan',active:true}]})]);
  for(const name of ['marketizo-sign.sql','marketizo-sign-flow.sql','marketizo-sign-direct.sql','marketizo-sign-completion.sql'])await db.exec(fs.readFileSync(path.join(__dirname,'../database',name),'utf8'));
  await db.exec('set role service_role');
  const flow=async(action,data={},org='marketizo-main')=>(await db.query('select marketizo_sign_flow($1,$2,$3::jsonb) r',[org,action,JSON.stringify(data)])).rows[0].r;
  const command=async(action,payload)=>(await db.query('select marketizo_sign_command($1,$2,$3,$4,$5::jsonb) r',['marketizo-main','emp-miljan',crypto.randomUUID(),action,JSON.stringify(payload)])).rows[0].r;
  async function fixture(recipients,body='997 € mesečno. Isti uslovi.',category='clients'){
   const id=crypto.randomUUID(),requestId=crypto.randomUUID(),original=Buffer.from('%PDF-reviewed-'+id),sha=hash(original);
   const draft=validateDraft({title:'Completion fixture',category,recipientCompletion:true,signatureMethod:'ses',content:{version:1,blocks:[{type:'paragraph',runs:[{text:body}]}]},recipients});assertReady(draft);
   assert.equal((await command('save',{id,kind:'document',revision:0,data:draft})).ok,true);
   assert.equal((await command('freeze',{id,kind:'document',revision:1})).ok,true,'Email-only recipients can freeze in completion mode');
   await flow('pdf_store',{actor:'emp-miljan',documentId:id,revision:2,pdfBase64:original.toString('base64'),pdfSha256:sha,renderer:'fixture'});
   const parties=draft.recipients.map(recipient=>({id:crypto.randomUUID(),recipient,tokenSha256:hash(crypto.randomUUID()),sealedMail:'sealed-fixture'}));
   const prepared=await flow('prepare',{actor:'emp-miljan',id:requestId,documentId:id,revision:2,commandId:crypto.randomUUID(),requestSha256:hash(id),review:{decision:'ses_allowed',reviewedBy:'Fixture',reference:'Nonbinding test',pdfReviewed:true,pdfSha256:sha},issuer:{name:'Fixture'},parties});assert.equal(prepared.ok,true);
   const sessions=[];for(const party of parties){const digest=hash(crypto.randomUUID());sessions.push(digest);assert.equal((await flow('link_exchange',{invitationDigest:party.tokenSha256,sessionDigest:digest,context:{ip:'127.0.0.1'}})).ok,true);}
   return{id,requestId,original,sha,draft,parties,sessions};
  }
  const f=await fixture([{name:'',email:'one@example.com',country:'',partyType:'business'},{name:'Owner Fixture',email:'owner@example.com',country:'AT',role:'marketizo'}]);
  const sessionDigest=f.sessions[0];let view=await flow('link_view',{sessionDigest});assert.equal(view.completion.complete,false);assert.ok(view.completion.required.includes('company'));assert.equal(JSON.stringify(view).includes('Owner Fixture'),false,'Only own identity is exposed');
  assert.equal((await flow('pdf',{sessionDigest})).status,409);
  assert.equal((await flow('link_accept',{sessionDigest})).status,409);
  assert.equal((await flow('completion_submit',{sessionDigest,fields:{email:'attacker@example.com'}})).status,400);
  assert.equal((await flow('completion_submit',{sessionDigest,fields:{name:'One'}})).status,400);
  const fields={name:'Čeda Test',country:'RS',company:'Test Firma',address:'Test Ulica 1',taxId:'TEST-123'};
  assert.equal((await flow('completion_submit',{sessionDigest,fields},'wrong-org')).status,401);
  assert.equal((await flow('completion_submit',{sessionDigest,fields})).ok,true);
  assert.equal((await flow('completion_submit',{sessionDigest,fields})).duplicate,true);
  assert.equal((await flow('completion_submit',{sessionDigest,fields:{...fields,company:'Changed'}})).status,409);
  view=await flow('link_view',{sessionDigest});assert.equal(view.completion.complete,true);assert.equal(view.completion.allComplete,true);assert.equal(view.name,'Čeda Test');
  const input=await flow('completion_render_data',{sessionDigest});assert.equal(input.document.recipients[0].company,'Test Firma');assert.equal(input.document.recipients[1].name,'Owner Fixture');
  const document=personalizeDocument(input.document),pdf=Buffer.from('%PDF-personalized-'+f.id),sha=hash(pdf);
  const store={sessionDigest,inputSha256:input.inputSha256,document,pdfBase64:pdf.toString('base64'),pdfSha256:sha,renderer:'fixture'};
  assert.equal((await flow('completion_pdf_store',{...store,inputSha256:hash('stale')})).status,409);
  assert.equal((await flow('completion_pdf_store',store)).ok,true);
  assert.equal((await flow('completion_pdf_store',store)).ready,true);
  assert.equal((await flow('completion_submit',{sessionDigest,fields:{name:'Replacement'}})).status,409);
  for(let i=0;i<2;i++){
   const digest=f.sessions[i],name=i?'Owner Fixture':'Čeda Test';
   const accept={sessionDigest:digest,commandId:crypto.randomUUID(),payloadSha256:hash('accept'+i),pdfSha256:sha,accepted:true,authority:true,signature:{name,strokes:[]},consentText:'I read the exact personalized PDF and explicitly agree to sign this document.'};
   assert.equal((await flow('link_accept',accept)).status,400,'Must preview personalized bytes');
   assert.equal((await flow('pdf',{sessionDigest:digest})).pdfSha256,sha);
   assert.equal((await flow('link_accept',{...accept,pdfSha256:f.sha})).status,400,'Reviewed blank source cannot be signed');
   assert.equal((await flow('link_accept',accept)).ok,true);
   assert.equal((await flow('link_accept',accept)).duplicate,true);
  }
  const finalInput=await flow('finalize_data',{requestId:f.requestId});assert.equal(finalInput.originalSha256,sha);assert.equal(finalInput.personalization.reviewedSourceSha256,f.sha);
  const final=Buffer.concat([pdf,Buffer.from('\ncertificate')]);
  assert.equal((await flow('finalize',{requestId:f.requestId,pdfBase64:final.toString('base64'),pdfSha256:hash(final),manifest:{originalSha256:f.sha},manifestSha256:hash('manifest'),seal:'fixture'})).status,400);
  assert.equal((await flow('finalize',{requestId:f.requestId,pdfBase64:final.toString('base64'),pdfSha256:hash(final),manifest:{originalSha256:sha},manifestSha256:hash('manifest'),seal:'fixture'})).ok,true);
  assert.equal((await flow('receipt',{sessionDigest})).pdfSha256,hash(final));
  assert.equal((await db.query('select original_sha256 from marketizo_sign_requests where id=$1',[f.requestId])).rows[0].original_sha256,f.sha,'Reviewed source remains immutable');
  await assert.rejects(db.query('update marketizo_sign_completed_parties set recipient=$1 where party_id=$2',[{},f.parties[0].id]),/permission denied|immutable/);
  const employee=await fixture([{name:'Employee Test',email:'employee@example.com',country:'RS',address:'Test 2',partyType:'employee'}],'Saradnika (fizičko lice ili preduzetnik) __________________________, JMBG _____________________, sa adresom _____________________(u daljem tekstu: Saradnik)','employees');
  const empView=await flow('link_view',{sessionDigest:employee.sessions[0]});assert.equal(empView.completion.required.includes('company'),false);assert.ok(empView.completion.required.includes('personalId'));
  assert.equal((await flow('completion_submit',{sessionDigest:employee.sessions[0],fields:{name:'Different',personalId:'TEST-ID'}})).status,409,'Owner supplied fields cannot be changed');
  assert.equal((await flow('completion_submit',{sessionDigest:employee.sessions[0],fields:{personalId:'TEST-ID'}})).ok,true);
  const empDoc=personalizeDocument((await flow('completion_render_data',{sessionDigest:employee.sessions[0]})).document);assert.match(empDoc.content.blocks[0].runs[0].text,/Employee Test, JMBG TEST-ID, sa adresom Test 2/);
  const prefilled=await fixture([{name:'Complete Test',email:'filled@example.com',country:'AT',address:'Already filled 4',company:'Complete Ltd',taxId:'TEST-TAX',partyType:'business'}]);
  const fullView=await flow('link_view',{sessionDigest:prefilled.sessions[0]});assert.equal(fullView.completion.complete,true,'All admin supplied fields skip form');assert.equal(fullView.completion.allComplete,true);
  const multi=await fixture([{name:'',email:'a@example.com',country:'',partyType:'employee'},{name:'',email:'b@example.com',country:'',partyType:'employee'}]);
  await flow('completion_submit',{sessionDigest:multi.sessions[0],fields:{name:'A Person',country:'RS',address:'A Street'}});
  assert.equal((await flow('completion_render_data',{sessionDigest:multi.sessions[0]})).waiting,true,'No signer can freeze incomplete shared identity data');
  assert.equal((await flow('pdf',{sessionDigest:multi.sessions[0]})).status,409);
  assert.deepEqual(validateFields({name:' Čeda ',country:'rs'}),{name:'Čeda',country:'RS'});assert.throws(()=>validateFields({price:'0'}));assert.throws(()=>validateFields({address:'x\nInjected'}));
  const de=personalizeDocument({...prefilled.draft,contractDetails:{language:'de'},content:{version:1,blocks:[{type:'paragraph',runs:[{text:'Kunde:\n________________\nAdresse: __________\nUID: ______\nInhaber: ______\n6.1 Vergütung 997 €.'}]}]}});assert.match(de.content.blocks[0].runs[0].text,/Complete Ltd\nAnschrift: Already filled 4/);assert.match(de.content.blocks[0].runs[0].text,/6.1 Vergütung 997 €/);
  await db.exec('reset role');for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(flow('completion_submit',{sessionDigest,fields}),/permission denied/);await assert.rejects(db.exec('select * from marketizo_sign_completed_parties'),/permission denied/);await db.exec('reset role');}
  console.log('PASS: email-only and prefilled contracts, per-party identity isolation, locked sender data, required employee ID, immutable shared personalized PDF, exact-PDF acceptance, receipt integrity and tenant/role protection.');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
