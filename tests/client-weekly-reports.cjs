const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path'), crypto = require('node:crypto');
const core = require('../lib/client-weekly-reports.js');
const at = '2026-11-02T11:00:00Z', windowInfo = core.weeklyWindow(new Date(at));
assert.equal(windowInfo.releaseDate, '2026-11-02'); assert.equal(windowInfo.periodStart, '2026-10-26'); assert.equal(windowInfo.periodEnd, '2026-11-01');
assert.equal(core.weeklyWindow(new Date('2026-11-02T10:59:00Z')).releaseDate, '2026-10-26');
assert.equal(core.weeklyWindow(new Date('2027-07-05T10:00:00Z')).releaseDate, '2027-07-05', 'Noon follows Vienna DST');
assert.equal(core.weeklyWindow(new Date('2026-11-03T07:00:00Z')).periodStart, '2026-10-26');
const employees = [{ id:'leader', name:'Lead', isLeader:true }, { id:'worker',name:'Hazim Hadžić',leaderId:'leader' }, { id:'other',name:'Other Worker',leaderId:'elsewhere' }, { id:'elsewhere',name:'Else Lead',isLeader:true }, { id:'inactive',name:'Inactive',leaderId:'leader',status:'Neaktivan' }];
const rows = [{ taskId:'c',Klijent:'Ivica',Scenarista:'Hazim Hadzic',Editor:'Other Worker' }, { taskId:'d',Klijent:'Second',Scenarista:'Hazim Hadzic',Checking:'Hazim Hadzic' }, { taskId:'closed',Klijent:'Closed',Scenarista:'Hazim Hadzic',statusType:'closed' }, { taskId:'paused',Klijent:'Paused',Scenarista:'Hazim Hadzic',clientStatus:'Neaktivan' }];
const source = { live:true,syncedAt:at,rows };
const initial = { employees, employeeReports:[], employeeWorkLogs:[{id:'keep',minutes:60}], unrelated:{keep:true} };
const payload = structuredClone(initial); const created = core.ensureReports(payload,source,windowInfo,at); assert.equal(created.length,2); const own = created.find(r=>r.employeeId==='worker'); assert.equal(own.clients.length,2); assert.equal(own.recipientId,'leader');
assert.equal(core.ensureReports(payload,source,windowInfo,at).length,0,'Repeated generation is idempotent');
assert.throws(()=>core.ensureReports(payload,{live:false},windowInfo,at),/ClickUp/);
assert.throws(()=>core.cleanAnswers(own,[]));
const answers=own.clients.map(c=>({clientId:c.clientId,positive:'Dobro',negative:'Nema problema',help:'Ne treba pomoć'}));
assert.deepEqual(core.cleanAnswers(own,answers),answers); assert.throws(()=>core.cleanAnswers(own,[answers[0],answers[0]])); assert.throws(()=>core.cleanAnswers(own,answers.map(a=>({...a,help:''}))));
let state=structuredClone(initial),updatedAt='initial',writes=0,race=false,offline=false;
const reply=(status,body)=>({ok:status>=200&&status<300,status,json:async()=>structuredClone(body)});
const fakeFetch=async(url,options={})=>{assert.equal(new URL(url).hostname,'fixture.invalid');if(options.method==='PATCH'){writes++;if(race){race=false;state.employeeWorkLogs.push({id:'coworker',minutes:20});updatedAt='concurrent';return reply(200,[]);}assert.equal(new URL(url).searchParams.get('updated_at'),'eq.'+updatedAt);const body=JSON.parse(options.body);state=body.payload;updatedAt=body.updated_at;return reply(200,[{updated_at:updatedAt}]);}return reply(200,[{payload:state,employees:state.employees,reports:state.employeeReports,updated_at:updatedAt}]);};
const RealDate=Date;class FixtureDate extends RealDate{constructor(...args){super(...(args.length?args:[at]));}static now(){return new RealDate(at).getTime();}}
const ctx={module:{exports:{}},process:{env:{SUPABASE_URL:'https://fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:'fixture',EMPLOYEE_SESSION_SECRET:'secret',CRON_SECRET:'cron'}},Date:FixtureDate,Buffer,Intl,fetch:fakeFetch,require:id=>id==='../lib/client-weekly-reports.js'?{...core,weeklyWindow:()=>windowInfo}:id==='./kpi.js'?{internal:{clickupRoster:async()=>offline?{live:false,error:'ClickUp offline'}:source}}:require(require.resolve(id,{paths:[path.join(__dirname,'../api')]}))};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../api/client-weekly-report.js'),'utf8'),ctx);
function token(employeeId){const data=Buffer.from(JSON.stringify({employeeId,role:'employee',exp:new RealDate(at).getTime()+60000})).toString('base64url');return data+'.'+crypto.createHmac('sha256','secret').update(data).digest('base64url');}
async function call(actor,body,cron=false){let result;await ctx.module.exports({method:body?'POST':'GET',body,headers:{authorization:'Bearer '+(cron?'cron':token(actor))}},{setHeader(){},end(raw){result={code:this.statusCode,body:JSON.parse(raw)};}});return result;}
(async()=>{
  assert.equal((await call('unknown')).code,403);const before=JSON.stringify(state);assert.equal((await call('worker')).body.reports.length,0);assert.equal(JSON.stringify(state),before,'GET does not generate or acknowledge');
  offline=true;assert.equal((await call('worker',{action:'ensure'})).code,503);assert.equal(writes,0);offline=false;
  race=true;let r=await call('worker',{action:'ensure'});assert.equal(r.code,200);assert.equal(state.employeeWorkLogs.length,2,'Concurrent logging survives CAS retry');assert.deepEqual(state.unrelated,initial.unrelated);assert.equal(r.body.reports.length,1);
  const id=r.body.reports[0].id;let writeCount=writes;await call('worker',{action:'ensure'});assert.equal(writes,writeCount);
  assert.equal((await call('other',{action:'submit',reportId:id,answers})).code,403);assert.equal((await call('worker',{action:'submit',reportId:id,answers:[]})).code,400);assert.equal(writes,writeCount);
  r=await call('worker',{action:'submit',reportId:id,answers});assert.equal(r.code,200);assert.ok(r.body.report.submittedAt);assert.equal(r.body.report.acknowledgedAt,undefined);
  writeCount=writes;assert.equal((await call('worker',{action:'submit',reportId:id,answers})).code,200);assert.equal(writes,writeCount,'Lost response retry cannot duplicate or overwrite answers');
  assert.equal((await call('worker',{action:'submit',reportId:id,answers:answers.map(a=>({...a,positive:'Changed'}))})).code,409);
  assert.equal((await call('other')).body.reports.length,0);assert.equal((await call('leader')).body.reports.length,1);
  assert.equal((await call('worker',{action:'acknowledge',reportId:id})).code,403);assert.equal((await call('other',{action:'acknowledge',reportId:id})).code,403);
  r=await call('leader',{action:'acknowledge',reportId:id});assert.equal(r.code,200);assert.equal(r.body.report.acknowledgedBy,'leader');writeCount=writes;await call('leader',{action:'acknowledge',reportId:id});assert.equal(writes,writeCount);
  const saved = structuredClone(state);assert.deepEqual(saved.employeeReports[0].clientAnswers,answers,'Existing full-state backup retains client answers and assignments');
  r=await call('',null,true);assert.equal(r.code,200);assert.equal(state.employeeReports.length,2,'Cron generates remaining employees even if offline');assert.equal(state.employeeWorkLogs.length,2);
  console.log('PASS client weekly reports: Vienna/DST release, previous-week period, assigned-client completeness, scoped access, mandatory answers, idempotent generation/submission/reading, ClickUp failure, backups, concurrent time logging and cron coverage');
})().catch(e=>{console.error(e);process.exitCode=1;});
