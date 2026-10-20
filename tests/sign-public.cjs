'use strict';
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const { createHandler } = require('../api/sign-public.js');
const { hash, canonical, evidenceKey } = require('../lib/sign-workflow.js');
const { verify } = require('../scripts/verify-sign-evidence.cjs');
process.env.SIGN_INTERNAL_SECRET = 'i'.repeat(48); process.env.SIGN_EVIDENCE_SECRET = 'e'.repeat(48);
let calls = [], fail = false;
const flow = { async rpc(action, data) { calls.push({ action, data }); if(fail && action==='accept') throw Error('private fixture content');if(action==='view')return{ok:true,title:'Fixture',verified:false,email:'t***@example.com'};return{ok:true}; },async issueOtp(){return{ok:true,challengeId:crypto.randomUUID()};},async verifyOtp(){return{ok:true};},async drain(){return{done:0};} };
const handler = createHandler({ config:{configured:true,url:'https://fixture.invalid',key:'private'},origin:'https://app.marketizo.com',createWorkflow:()=>flow });
async function call(method, body, extras={}) { const req={method,url:extras.url||'/api/sign-public',body,headers:{origin:'https://app.marketizo.com','content-type':'application/json','x-sign-request':'1',cookie:'__Host-marketizo_sign='+'s'.repeat(43),...extras.headers},socket:{remoteAddress:'127.0.0.1'}};const res={headers:{},setHeader(k,v){this.headers[k]=v;},end(x){this.raw=x;}};await handler(req,res);return{status:res.statusCode,headers:res.headers,body:JSON.parse(res.raw)}; }
(async()=>{
 assert.equal((await call('POST',{action:'exchange',token:'x'.repeat(43)},{headers:{origin:'https://evil.invalid'}})).status,403);assert.equal(calls.length,0);
 assert.equal((await call('GET',undefined,{headers:{cookie:''}})).status,401);
 const exchanged=await call('POST',{action:'exchange',token:'x'.repeat(43)});assert.equal(exchanged.status,200);assert.ok(exchanged.headers['Set-Cookie'].includes('HttpOnly; SameSite=Strict'));assert.ok(exchanged.headers['Set-Cookie'].includes('Secure'));
 const exchangeCall=calls.find(x=>x.action==='exchange');assert.equal(exchangeCall.data.invitationDigest,hash('x'.repeat(43)));assert.ok(!JSON.stringify(exchangeCall).includes('x'.repeat(43)));
 assert.equal((await call('POST',{action:'otp_verify',challengeId:crypto.randomUUID(),code:'abc123'})).status,400);
 assert.equal((await call('POST',{action:'accept',accepted:false})).status,400);
 const body={action:'accept',commandId:crypto.randomUUID(),pdfSha256:'a'.repeat(64),accepted:true,authority:true,signature:{name:'Fixture',strokes:[]}};
 const accepted=await call('POST',body);assert.equal(accepted.status,200);assert.ok(calls.find(x=>x.action==='accept').data.consentText.includes('jednostavnim'));
 fail=true;const failure=await call('POST',body);assert.equal(failure.status,503);assert.ok(!JSON.stringify(failure.body).includes('private fixture'));
 const original=Buffer.from('%PDF-original'),final=Buffer.concat([original,Buffer.from('certificate')]),key=evidenceKey();
 const manifest={originalByteLength:original.length,originalSha256:hash(original),applicationKey:{publicKey:key.publicKey,fingerprint:key.fingerprint,algorithm:'Ed25519'}};
 const manifestSha256=hash(canonical(manifest));const evidence={manifest,manifestSha256,finalSha256:hash(final),seal:crypto.sign(null,Buffer.from(manifestSha256,'hex'),key.privateKey).toString('base64')};
 assert.equal(verify(evidence,final).fingerprint,key.fingerprint);
 assert.throws(()=>verify({...evidence,manifest:{...manifest,originalByteLength:2}},final),/Manifest integrity/);
 assert.throws(()=>verify(evidence,Buffer.from('changed')),/Final PDF/);
 console.log('PASS: public Sign API enforces origin/session/input limits, never returns invitation secrets, records explicit SES intent and provides independently checkable Ed25519/PDF integrity evidence.');
})().catch(e=>{console.error(e);process.exitCode=1;});
