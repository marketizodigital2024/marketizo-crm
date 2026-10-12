const fs=require("node:fs"),vm=require("node:vm"),crypto=require("node:crypto"),assert=require("node:assert/strict");
const harness=require("./crm-regression.cjs");
let mode="normal",patches=0,backups=0,raced=false;
const ctx={module:{exports:{}},process:{env:{SUPABASE_URL:"https://fixture.invalid",SUPABASE_SERVICE_ROLE_KEY:"local-fixture",EMPLOYEE_SESSION_SECRET:"local-fixture"}},Buffer,Date,Math,JSON,setTimeout(fn){fn();},
require(id){return id==="./state.js"?{helpers:{...harness.state.helpers,async preserveDailyPrewriteBackup(config,current){backups++;if(mode==="backup-failure")throw Error("backup fixture failure");await harness.state.helpers.preserveDailyPrewriteBackup(config,current);}}}:require(id);},
async fetch(url,options){
assert.ok(url.startsWith("https://fixture.invalid/"));assert.equal(options.method,"PATCH");assert.equal(new URL(url).searchParams.get("select"),"updated_at");patches++;
const current=harness.getCurrent(),body=JSON.parse(options.body);
if(mode==="race"&&!raced){raced=true;current.payload.employeeWorkLogs.push({id:"coworker-log",minutes:60});current.updated_at="2026-10-12T15:00:00.000Z";return {ok:true,status:200,json:async()=>[]};}
if(mode==="busy")return {ok:true,status:200,json:async()=>[]};
if(mode==="temporary"&&patches===1)return {ok:false,status:503};
assert.equal(new URL(url).searchParams.get("updated_at"),"eq."+current.updated_at);
current.payload=body.payload;current.updated_at=body.updated_at;return {ok:true,status:200,json:async()=>[{updated_at:current.updated_at}]};
}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+"/../api/activity-catalog.js","utf8"),ctx);
function token(role,id="emp-miljan"){const s=Buffer.from(JSON.stringify({employeeId:id,role,exp:Date.now()+3600000})).toString("base64url");return s+"."+crypto.createHmac("sha256","local-fixture").update(s).digest("base64url");}
async function call(activity,auth,method="POST"){let r;await ctx.module.exports({method,body:{activity},headers:{authorization:auth?"Bearer "+auth:""}},{statusCode:200,setHeader(){},end(s){r={status:this.statusCode,...JSON.parse(s)};}});return r;}
function reset(next="normal"){harness.reset();mode=next;patches=0;backups=0;raced=false;}
const input={id:"team-building-fixture",name:"Team Building",category:"Interno"};
(async()=>{
reset();assert.equal((await call(input)).status,401);assert.equal(patches,0);
assert.equal((await call(input,token("employee","emp-a"))).status,403);assert.equal(patches,0);
assert.equal((await call({...input,name:"<img>"},token("full-admin"))).status,400);
reset("race");harness.getCurrent().payload.largeAttachment="x".repeat(5000000);const before=structuredClone(harness.getCurrent().payload);
let r=await call(input,token("full-admin"));assert.equal(r.status,200);assert.equal(patches,2);assert.equal(backups,2);
const saved=harness.getCurrent().payload;assert.ok(saved.employeeWorkLogs.some(x=>x.id==="coworker-log"));assert.deepEqual(saved.employees,before.employees);assert.deepEqual(saved.clients,before.clients);assert.deepEqual(saved.employeeAbsences,before.employeeAbsences);assert.equal(saved.largeAttachment,before.largeAttachment);assert.equal(saved.employeeActivities.filter(x=>x.name===input.name).length,1);
assert.ok(Buffer.byteLength(JSON.stringify({activity:input}))<1024);assert.ok(Buffer.byteLength(JSON.stringify(r))<10000);
r=await call(input,token("full-admin"));assert.equal(r.status,200);assert.equal(r.duplicate,true);assert.equal(patches,2);
r=await call({...input,id:"other-id"},token("full-admin"));assert.equal(r.status,200);assert.equal(r.activity.id,input.id);assert.equal(patches,2);
assert.equal((await call({...input,category:"SMM"},token("full-admin"))).status,409);assert.equal((await call(null,token("full-admin"),"GET")).activities.length,2);
reset("backup-failure");assert.equal((await call(input,token("full-admin"))).status,500);assert.equal(patches,0);
reset("busy");assert.equal((await call(input,token("full-admin"))).status,409);assert.equal(patches,8);
reset("temporary");assert.equal((await call(input,token("full-admin"))).status,200);assert.equal(patches,2);
reset();harness.getCurrent().payload.employees.find(x=>x.id==="emp-a").isOperationalAdmin=true;assert.equal((await call(input,token("operational-admin","emp-a"))).status,200);
console.log("PASS: catalog authorization, validation, >5 MB state with tiny request/response, CAS coworker race, replay, conflict, backup failure, bounded retry, transient retry and operational admin.");
})().catch(e=>{console.error(e);process.exitCode=1;});
