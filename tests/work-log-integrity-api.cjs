const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path'),crypto=require('node:crypto');
const patch=require('../lib/state-patch.js');
const log={id:'old',employeeId:'emp-miljan',date:'2026-10-15',minutes:80,hours:1.3333,activityId:'edit',activityName:'Edit',activityCategory:'Editori',clientId:'c',clientName:'Client',note:'Original'};
let current={payload:{employees:[{id:'emp-miljan',status:'Aktivan'}],clients:[{id:'c',name:'Client'}],employeeActivities:[{id:'edit',name:'Edit',category:'Editori'}],employeeWorkLogs:[log]},updated_at:'2026-10-30T08:00:00Z'},writes=0,backups=0,simulateRace=false;
const ctx={module:{exports:{}},require:id=>require(require.resolve(id,{paths:[path.join(__dirname,'../api')]})),process:{env:{SUPABASE_URL:'https://fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:'fixture'}},Buffer,Date,Intl,URL,console,setTimeout,fetch:async(input,opts={})=>{
 const u=new URL(input),method=opts.method||'GET';let body;
 if(method==='GET'&&u.searchParams.get('id')==='eq.marketizo-main')body=[structuredClone(current)];
 else if(method==='GET'&&u.searchParams.get('id').startsWith('eq.backup-prewrite-')){backups++;body=[{backupDate:new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Vienna',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}];}
 else if(method==='PATCH'){writes++;assert.equal(opts.headers['X-Marketizo-Actor-Id'],'emp-miljan');assert.equal(u.searchParams.get('updated_at'),'eq.'+current.updated_at);
   if(simulateRace){simulateRace=false;current.payload.employeeWorkLogs.unshift({...log,id:'coworker-today',employeeId:'coworker',date:'2026-10-30',minutes:15});current.updated_at='2026-10-30T12:00:00Z';body=[];}
   else{const b=JSON.parse(opts.body);current={payload:b.payload,updated_at:b.updated_at};body=[{updated_at:b.updated_at}];}}
 else throw Error('Unexpected request '+method+' '+u.pathname);
 return {ok:true,status:200,json:async()=>body,text:async()=>JSON.stringify(body)};
}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../api/state.js','utf8'),ctx);
const encoded=Buffer.from(JSON.stringify({employeeId:'emp-miljan',role:'full-admin',exp:Date.now()+3600000})).toString('base64url'),token=encoded+'.'+crypto.createHmac('sha256','fixture').update(encoded).digest('base64url');
async function call(body){let result;await ctx.module.exports({method:'PUT',headers:{authorization:'Bearer '+token},body},{setHeader(){},end(data){result={status:this.statusCode,body:JSON.parse(data)}}});return result;}
(async()=>{
 let desired=structuredClone(current.payload);desired.employeeWorkLogs[0]={id:log.id,employeeId:log.employeeId,date:log.date,minutes:log.minutes};
 let r=await call({payload:desired,baseUpdatedAt:current.updated_at});assert.equal(r.status,409);assert.equal(r.body.unsafeWorkLogMetadata,true);assert.equal(writes,0);assert.equal(backups,0);
 r=await call({patch:patch.create(current.payload,desired),baseUpdatedAt:current.updated_at});assert.equal(r.status,409);assert.equal(writes,0,'Patch and full-state transport both reject loss');
 desired=structuredClone(current.payload);desired.clients[0].name='Renamed';r=await call({payload:desired,baseUpdatedAt:current.updated_at});assert.equal(r.status,200);assert.deepEqual(current.payload.employeeWorkLogs,[log]);
 r=await call({payload:desired,baseUpdatedAt:'stale'});assert.equal(r.status,409);assert.equal(writes,1,'Stale browser cannot overwrite a newer state');
 desired=structuredClone(current.payload);desired.employeeWorkLogs[0].note='Valid correction';simulateRace=true;r=await call({payload:desired,baseUpdatedAt:current.updated_at});assert.equal(r.status,409);assert.equal(current.payload.employeeWorkLogs.length,2);assert.equal(current.payload.employeeWorkLogs.find(x=>x.id==='old').note,'Original','Compare-and-swap race preserves coworker append and old record');
 console.log('PASS: actual state API rejects serializer data loss before any backup/write for both transports; unrelated saves, stale revision and competing live append retain records');
})().catch(e=>{console.error(e);process.exitCode=1});
