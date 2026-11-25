'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
process.env.SUPABASE_URL='https://fixture.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='fixture';process.env.EMPLOYEE_SESSION_SECRET='fixture';process.env.VERCEL_ENV='test';process.env.CRON_SECRET='cron-fixture';
const handler=require('../api/report-obligations.js'),clone=structuredClone;
let row={updated_at:'initial',payload:{employees:[{id:'worker',name:'Worker',status:'Aktivan',startDate:'2026-11-01',weeklyHours:38.5,leaderId:'leader',password:'must-not-leak'},{id:'other',name:'Other',status:'Aktivan',weeklyHours:38.5}],employeeReports:[],employeeWorkLogs:[],employeeAbsences:[],clients:[{private:'preserve'}]}};
let patches=0,race=true,calls=0;
global.fetch=async(input,options={})=>{
  const url=new URL(input);assert.equal(url.hostname,'fixture.invalid','Never call production');calls++;
  const reply=data=>({ok:true,status:200,json:async()=>clone(data)});
  if(options.method==='PATCH'){
    patches++;assert.equal(url.searchParams.get('updated_at'),'eq.'+row.updated_at);
    if(race){race=false;row.updated_at='concurrent';row.payload.employeeWorkLogs.push({id:'coworker-live',employeeId:'other',date:'2026-11-25',minutes:20});return reply([]);}
    row=JSON.parse(options.body);return reply([{updated_at:row.updated_at}]);
  }
  if(url.searchParams.get('select')==='payload,updated_at')return reply([row]);
  return reply([{...row.payload,updated_at:row.updated_at}]);
};
function token(id){const data=Buffer.from(JSON.stringify({employeeId:id,role:'employee',exp:Date.now()+60000})).toString('base64url');return data+'.'+crypto.createHmac('sha256','fixture').update(data).digest('base64url');}
async function call(method,authorization){let result;const res={setHeader(){},end(s){result={status:this.statusCode,body:JSON.parse(s)};}};await handler({method,headers:{authorization}},res);return result;}
(async()=>{
  assert.equal((await call('POST','')).status,401);assert.equal(calls,0);
  const result=await call('POST','Bearer '+token('worker'));
  assert.equal(result.status,200);assert.equal(result.body.actorId,'worker');assert(result.body.pending.length);
  assert(result.body.reports.every(r=>r.employeeId==='worker'));assert(result.body.people.every(e=>e.id==='worker'));
  assert(!JSON.stringify(result.body).includes('must-not-leak'));
  assert(row.payload.employeeWorkLogs.some(l=>l.id==='coworker-live'),'CAS retry retains live coworker append');
  assert.deepEqual(row.payload.clients,[{private:'preserve'}]);
  const before=patches;await call('POST','Bearer '+token('worker'));assert.equal(patches,before,'Confirmed obligations require no repeated writes');
  const snapshot=clone(row);await call('GET','Bearer '+token('worker'));assert.deepEqual(row,snapshot,'GET is read-only');
  process.env.VERCEL_ENV='preview';const count=calls;assert.equal((await call('POST','Bearer cron-fixture')).status,409);assert.equal(calls,count,'Preview cannot touch production');
  console.log('PASS obligation API: auth, role scoping, no secrets, idempotency, projected reads, concurrent append preservation, preview isolation');
})().catch(e=>{console.error(e);process.exitCode=1;});
