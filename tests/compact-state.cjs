const assert=require('node:assert/strict'),crypto=require('node:crypto');
const patch=require('../lib/state-patch.js'),h=require('./crm-regression.cjs');
const base={clients:[{id:'client',name:'Before',contractFileData:'x'.repeat(5*1024*1024),invoices:{'2026-10':{amount:997,paid:false}}}],employeeWorkLogs:[{id:'old',minutes:60}]};
const desired=structuredClone(base);desired.clients[0].name='After';desired.clients[0].invoices['2026-10'].paid=true;desired.employeeWorkLogs.unshift({id:'new',minutes:90});
const change=patch.create(base,desired);assert.ok(Buffer.byteLength(JSON.stringify(change))<2048);assert.deepEqual(patch.apply(base,change),desired);assert.equal(patch.create(base,base),null);
assert.throws(()=>patch.apply({},JSON.parse('{"type":"object","set":{"__proto__":{"type":"replace","value":{}}},"remove":[]}')),/Nedozvoljeno/);
(async()=>{
  h.reset();const state=h.getCurrent();state.payload.clients[0].contractFileData=base.clients[0].contractFileData;
  const enc=Buffer.from(JSON.stringify({employeeId:'emp-miljan',role:'full-admin',exp:Date.now()+3600000})).toString('base64url');const token=enc+'.'+crypto.createHmac('sha256','local-fixture').update(enc).digest('base64url');
  async function call(method,body,t=token){let result;const res={setHeader(){},end(s){result={status:this.statusCode,body:JSON.parse(s)}}};await h.state({method,body,headers:{authorization:'Bearer '+t}},res);return result;}
  const initial=(await call('GET')).body;const edited=structuredClone(initial.payload);edited.clients[0].name='Confirmed compact change';const body={patch:patch.create(initial.payload,edited),baseUpdatedAt:initial.updatedAt};assert.ok(Buffer.byteLength(JSON.stringify(body))<2048);
  let result=await call('PUT',body);assert.equal(result.status,200);assert.equal(h.getCurrent().payload.clients[0].name,'Confirmed compact change');assert.equal(h.getCurrent().payload.clients[0].contractFileData,base.clients[0].contractFileData);
  assert.equal((await call('PUT',body)).status,409);
  const cenc=Buffer.from(JSON.stringify({clientId:'client-a',role:'client',exp:Date.now()+3600000})).toString('base64url');const clientToken=cenc+'.'+crypto.createHmac('sha256','local-fixture').update(cenc).digest('base64url');const clientInitial=(await call('GET',{},clientToken)).body;const clientDesired=structuredClone(clientInitial.payload);clientDesired.leads.push({id:'own-lead',clientId:'client-a'});
  result=await call('PUT',{patch:patch.create(clientInitial.payload,clientDesired),baseUpdatedAt:clientInitial.updatedAt},clientToken);assert.equal(result.status,200);assert.ok(h.getCurrent().payload.leads.some(x=>x.id==='lead-b'));assert.ok(h.getCurrent().payload.leads.some(x=>x.id==='own-lead'));assert.equal(h.getCurrent().payload.clients.length,2);
  console.log('PASS: a >5 MB state uses <2 KB edits; actual owner/client API retains contracts and other-client data; stale changes rejected; patch input blocks prototype manipulation.');
})().catch(error=>{console.error(error);process.exitCode=1});
