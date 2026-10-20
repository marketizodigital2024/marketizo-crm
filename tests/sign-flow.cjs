'use strict';
const { PGlite } = require('@electric-sql/pglite');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { hash, validateSignature } = require('../lib/sign-workflow.js');
const { validateDraft } = require('../lib/sign-content.js');
(async () => {
 const db = new PGlite(); await db.waitReady;
 try {
  await db.exec('create role anon;create role authenticated;create role service_role;create table agency_crm_state(id text primary key,payload jsonb);grant select on agency_crm_state to service_role;');
  const crm = { employees: [{ id: 'emp-miljan', active: true }], clients: [{ id: 'unchanged' }] }; await db.query('insert into agency_crm_state values($1,$2)', ['marketizo-main', JSON.stringify(crm)]);
  for (const file of ['marketizo-sign.sql','marketizo-sign-flow.sql','marketizo-sign-maintenance.sql']) await db.exec(fs.readFileSync(path.join(__dirname, '../database', file), 'utf8'));
  const draft = validateDraft({ title: 'SES fixture', category: 'clients', signatureMethod: 'ses', content: { version: 1, blocks: [{ type: 'paragraph', runs: [{ text: 'Agreed contract' }] }] }, recipients: [{ name: 'First Signer', email: 'first@example.com', country: 'AT' }, { name: 'Second Signer', email: 'second@example.com', country: 'DE' }] });
  const docId = crypto.randomUUID(), reqId = crypto.randomUUID(), commandId = crypto.randomUUID(), original = Buffer.from('%PDF-fixture-original'), originalSha = hash(original);
  const command = async (action, payload) => (await db.query('select marketizo_sign_command($1,$2,$3,$4,$5::jsonb) r', ['marketizo-main','emp-miljan',crypto.randomUUID(),action,JSON.stringify(payload)])).rows[0].r;
  const flow = async (action, payload = {}) => (await db.query('select marketizo_sign_flow($1,$2,$3::jsonb) r', ['marketizo-main',action,JSON.stringify(payload)])).rows[0].r;
  await db.exec('set role service_role');
  assert.equal((await command('save', { id: docId, kind: 'document', revision: 0, data: draft })).ok, true);
  assert.equal((await command('freeze', { id: docId, kind: 'document', revision: 1 })).ok, true);
  const prepared = await flow('pdf_store', { actor:'emp-miljan',documentId:docId,revision:2,pdfBase64:original.toString('base64'),pdfSha256:originalSha,renderer:'fixture' }); assert.equal(prepared.ok,true);
  const parties = draft.recipients.map((recipient,i) => ({ id:crypto.randomUUID(),recipient,tokenSha256:hash('invite-'+i),sealedMail:'encrypted-invitation-'+i }));
  const base = { actor:'emp-miljan',id:reqId,documentId:docId,revision:2,commandId,requestSha256:hash('intent'),review:{decision:'ses_allowed',reviewedBy:'Fixture reviewer',reference:'Fixture legal review',pdfSha256:originalSha,pdfReviewed:true},issuer:{name:'Fixture Company'},parties };
  assert.equal((await flow('prepare', { ...base,review:{} })).status,400);
  assert.equal((await flow('prepare', { ...base,review:{...base.review,pdfReviewed:false} })).status,400);
  assert.equal((await flow('prepare', base)).ok,true);
  assert.equal((await flow('prepare', base)).duplicate,true);
  assert.equal((await flow('prepare', {...base,requestSha256:hash('changed-intent')})).status,409);
  const jobLease = crypto.randomUUID(), job = (await flow('claim',{lease:jobLease})).job; assert.ok(job);
  assert.equal((await flow('ack',{jobId:job.id,lease:crypto.randomUUID(),success:true})).status,409);
  assert.equal((await flow('ack',{jobId:job.id,lease:jobLease,success:true})).ok,true);
  assert.equal((await db.query('select status from marketizo_sign_documents where id=$1',[docId])).rows[0].status,'sent');
  const sessions = [];
  for (let i=0;i<2;i++) {
   const sessionDigest = hash('session-'+i); sessions.push(sessionDigest);
   assert.equal((await flow('exchange',{invitationDigest:parties[i].tokenSha256,sessionDigest,context:{ip:'127.0.0.1',userAgent:'fixture'}})).ok,true);
   assert.equal((await flow('pdf',{sessionDigest})).status,401);
   let challengeId=crypto.randomUUID(), otpDigest=hash('code-'+i);
   assert.equal((await flow('otp_issue',{sessionDigest,challengeId,otpDigest,sealedMail:'encrypted-otp'})).ok,true);
   assert.equal((await flow('otp_issue',{sessionDigest,challengeId,otpDigest,sealedMail:'encrypted-otp'})).status,429);
   if(i===0) {
    assert.equal((await flow('otp_verify',{sessionDigest,challengeId})).status,401,'Missing digest cannot authenticate');
    for(let j=0;j<4;j++) assert.equal((await flow('otp_verify',{sessionDigest,challengeId,otpDigest:hash('wrong')})).status,401);
    assert.equal((await flow('otp_verify',{sessionDigest,challengeId,otpDigest})).status,401,'Five failed attempts lock the challenge');
    await db.query("update marketizo_sign_parties set last_otp_at=clock_timestamp()-interval '2 minutes' where id=$1",[parties[i].id]);
    challengeId=crypto.randomUUID();otpDigest=hash('replacement');await flow('otp_issue',{sessionDigest,challengeId,otpDigest,sealedMail:'encrypted-new-otp'});
   }
   assert.equal((await flow('otp_verify',{sessionDigest,challengeId,otpDigest})).ok,true);
   assert.equal((await flow('otp_verify',{sessionDigest,challengeId,otpDigest})).status,401,'OTP cannot be replayed');
   const accept={sessionDigest,commandId:crypto.randomUUID(),payloadSha256:hash('accept-'+i),pdfSha256:originalSha,accepted:true,authority:true,signature:validateSignature({name:draft.recipients[i].name,strokes:[]}),consentText:'Fixture explicit intention to accept this exact agreement using a simple electronic signature.'};
   assert.equal((await flow('accept',accept)).status,400,'PDF must be accessed after OTP');
   const pdf=await flow('pdf',{sessionDigest});assert.equal(hash(Buffer.from(pdf.pdfBase64,'base64')),originalSha);
   assert.equal((await flow('accept',{...accept,pdfSha256:hash('different-version')})).status,400);
   assert.equal((await flow('accept',{...accept,authority:false})).status,400);
   assert.equal((await flow('accept',accept)).ok,true);
   assert.equal((await flow('accept',accept)).duplicate,true);
   assert.equal((await flow('accept',{...accept,payloadSha256:hash('changed-signature')})).status,409);
  }
  const evidence=await flow('finalize_data',{requestId:reqId});assert.equal(evidence.signers.length,2);assert.equal(evidence.originalSha256,originalSha);
  const final=Buffer.concat([original,Buffer.from('\ncertificate')]);
  assert.equal((await flow('finalize',{requestId:reqId,pdfBase64:Buffer.from('%PDF-different').toString('base64'),pdfSha256:hash('%PDF-different'),manifest:{originalSha256:originalSha},manifestSha256:hash('manifest'),seal:'fixture'})).status,400);
  assert.equal((await flow('finalize',{requestId:reqId,pdfBase64:final.toString('base64'),pdfSha256:hash(final),manifest:{originalSha256:originalSha},manifestSha256:hash('manifest'),seal:'fixture'})).ok,true);
  assert.equal((await flow('receipt',{sessionDigest:sessions[0]})).pdfSha256,hash(final));
  assert.equal((await flow('void',{actor:'emp-miljan',requestId:reqId})).status,409);
  await assert.rejects(db.exec('update marketizo_sign_receipts set seal=\'changed\''),/permission denied|immutable/);
  await assert.rejects(db.exec("update marketizo_sign_requests set original_pdf='changed'"),/immutable/);
  await db.exec('reset role');assert.deepEqual((await db.query('select payload from agency_crm_state')).rows[0].payload,crm);
  for(const role of ['anon','authenticated']) { await db.exec(`set role ${role}`);await assert.rejects(flow('view',{sessionDigest:sessions[0]}),/permission denied/);for(const table of ['marketizo_sign_requests','marketizo_sign_sessions','marketizo_sign_receipts','marketizo_sign_outbox','marketizo_sign_prepared_pdfs']) await assert.rejects(db.exec(`select * from ${table}`),/permission denied/);await db.exec('reset role'); }
  await db.exec('set role service_role');
  const beforeEvidence = (await db.query('select * from marketizo_sign_receipts where request_id=$1',[reqId])).rows[0];
  const acceptedBefore = (await db.query('select signature,accepted_at,consent_text from marketizo_sign_parties where request_id=$1 order by id',[reqId])).rows;
  async function expiredFixture(org,status='open') {
   const id=crypto.randomUUID(),requestId=crypto.randomUUID(),version=crypto.randomUUID(),party=crypto.randomUUID();
   await db.query("insert into marketizo_sign_documents(id,organization_id,data,title,category,status,revision,created_by) values($1,$2,$3,'Expiry fixture','clients','sent',1,'emp-miljan')",[id,org,JSON.stringify(draft)]);
   await db.query("insert into marketizo_sign_versions(id,organization_id,document_id,document_revision,snapshot,content_sha256,frozen_by) values($1,$2,$3,1,$4,$5,'emp-miljan')",[version,org,id,JSON.stringify(draft),originalSha]);
   await db.query("insert into marketizo_sign_requests(id,organization_id,document_id,version_id,command_id,request_sha256,original_pdf,original_sha256,legal_review,issuer,created_by,status,expires_at) values($1,$2,$3,$4,$5,$6,$7,$6,'{}','{}','emp-miljan',$8,clock_timestamp()-interval '1 day')",[requestId,org,id,version,crypto.randomUUID(),originalSha,original,status]);
   await db.query("insert into marketizo_sign_parties(id,request_id,recipient,invitation_sha256,challenge_id,otp_sha256,otp_session,otp_expires_at) values($1,$2,$3,$4,$5,'expired-code','expired-session',clock_timestamp()-interval '1 hour')",[party,requestId,JSON.stringify(draft.recipients[0]),hash(party),crypto.randomUUID()]);
   await db.query("insert into marketizo_sign_sessions(digest,party_id,created_at,expires_at,context) values($1,$2,clock_timestamp()-interval '2 hours',clock_timestamp()-interval '1 hour','{}')",[hash('old-'+party),party]);
   await db.query("insert into marketizo_sign_sessions(digest,party_id,expires_at,context) values($1,$2,clock_timestamp()+interval '30 minutes','{}')",[hash('live-'+party),party]);
   await db.query("insert into marketizo_sign_outbox(request_id,party_id,kind,sealed_payload,expires_at) values($1,$2,'invitation','encrypted-expired-invite',clock_timestamp()-interval '1 day')",[requestId,party]);
   return {id,requestId,party};
  }
  const expired=await expiredFixture('marketizo-main'),otherOrg=await expiredFixture('another-tenant'),finalizing=await expiredFixture('marketizo-main','finalizing');
  await db.query("insert into marketizo_sign_rates values('old-window',clock_timestamp()-interval '2 days',10),('current-window',date_trunc('minute',clock_timestamp()),1)");
  // An expired session from an accepted party remains evidence; live sessions and hourly counters are retained.
  await db.query("update marketizo_sign_sessions set expires_at=clock_timestamp()-interval '1 minute' where digest=$1",[sessions[0]]);
  const maintain=async ()=>(await db.query("select marketizo_sign_maintenance('marketizo-main') r")).rows[0].r;
  const m=await maintain();assert.equal(m.expired,1);assert.equal(m.sessions,2);assert.equal(m.challenges,2);assert.equal(m.rates,1);
  assert.equal((await db.query('select status from marketizo_sign_documents where id=$1',[expired.id])).rows[0].status,'expired');
  assert.equal((await db.query('select status from marketizo_sign_requests where id=$1',[otherOrg.requestId])).rows[0].status,'open');
  assert.equal((await db.query('select status from marketizo_sign_requests where id=$1',[finalizing.requestId])).rows[0].status,'finalizing');
  assert.equal((await db.query('select sealed_payload from marketizo_sign_outbox where request_id=$1',[expired.requestId])).rows[0].sealed_payload,null);
  assert.equal((await db.query('select otp_sha256 from marketizo_sign_parties where id=$1',[expired.party])).rows[0].otp_sha256,null);
  assert.equal((await db.query('select otp_sha256 from marketizo_sign_parties where id=$1',[otherOrg.party])).rows[0].otp_sha256,'expired-code');
  assert.equal((await db.query('select count(*)::int n from marketizo_sign_sessions where digest=$1',[sessions[0]])).rows[0].n,1);
  assert.equal((await db.query('select count(*)::int n from marketizo_sign_sessions where digest=$1',[hash('live-'+expired.party)])).rows[0].n,1);
  assert.deepEqual((await db.query('select * from marketizo_sign_receipts where request_id=$1',[reqId])).rows[0],beforeEvidence);
  assert.deepEqual((await db.query('select signature,accepted_at,consent_text from marketizo_sign_parties where request_id=$1 order by id',[reqId])).rows,acceptedBefore);
  assert.equal((await maintain()).expired,0);
  assert.equal((await db.query("select count(*)::int n from marketizo_sign_events where document_id=$1 and action='expired'",[expired.id])).rows[0].n,1);
  await db.exec('reset role');
  for(const role of ['anon','authenticated']) { await db.exec(`set role ${role}`);await assert.rejects(maintain(),/permission denied/);await db.exec('reset role'); }
  console.log('PASS: bounded maintenance expires only pending tenant requests, clears transient codes/sessions, preserves live access, acceptance/receipts and audit history, and denies public execution.');
  console.log('PASS: actual PostgreSQL SES flow validates form review, immutable exact PDF, idempotency, per-recipient sessions, OTP throttling/attempt limits/replay, explicit consent, all signers, final-byte prefix, archive evidence and private grants.');
 } finally { await db.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
