const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const source = fs.readFileSync(__dirname + '/../api/state.js', 'utf8');
const costs = require('../cost-calculation.js');
const stored = {
  employees: [{id:'emp-miljan',name:'Nikola',status:'Aktivan',weeklyHours:38.5}],
  clients: [], employeeAbsences: [], employeeHourAdjustments:[{id:'manual',minutes:10}],
  employeeWorkLogs:[{id:'a',employeeId:'emp-miljan',date:'2026-10-20',minutes:440,activityName:'Rad',clientName:'Klijent'},
    {id:'today',employeeId:'emp-miljan',date:'2026-10-21',minutes:20}],
  employeeReports:[{id:'auto',employeeId:'emp-miljan',date:'2026-10-20',isAutomaticRollup:true,minutes:0,hours:0,expectedMinutes:510,missingMinutes:510,
    note:'Nema upisanih aktivnosti do 17:30.',autoSummary:'Nema upisanih aktivnosti do 17:30.',negative:'Nedostaje 510 min do dnevne kvote.'},
    {id:'human',employeeId:'emp-miljan',date:'2026-10-20',minutes:17,note:'Ručni izveštaj'}],
  notifications:[{id:'shortage',key:'employee-hours-shortage-emp-miljan-2026-10-20',message:'0/510',read:true,hiddenUntil:'2026-10-28'},
    {id:'other',key:'invoice-unpaid-1',message:'Keep'}]
};
let writes = 0;
const context = {
  module:{exports:{}}, require: id => {
    if(id==='../cost-calculation.js') return costs;
    if(id==='../lib/password.js') return {hashPassword: value => value};
    if(id==='node:crypto') return crypto;
    if(id==='../lib/database-request.js') return {request:(fetcher,...args)=>fetcher(...args),withRequestBudget:fn=>fn()};
    throw Error('Unexpected dependency '+id);
  }, process:{env:{SUPABASE_URL:'https://fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:'fixture'}},
  Buffer,Date,Intl,console,
  fetch: async (url, options={}) => {
    assert.match(url,/marketizo_read_session_state/);
    // This POST is a read-only scoped RPC, not a state mutation.
    assert.deepEqual(JSON.parse(options.body),{p_role:'full-admin',p_employee_id:'emp-miljan',p_client_id:null});
    return {ok:true,status:200,json:async()=>({payload:structuredClone(stored),updated_at:'revision-1'})};
  }
};
vm.createContext(context);vm.runInContext(source, context);
const refresh = context.module.exports.helpers.refreshWorkSummaries;
const normalize = value => JSON.parse(JSON.stringify(value));
const before = JSON.stringify(stored);
let result = refresh(stored);
assert.match(result.notifications[0].message,/440\/510/);
assert.equal(result.notifications[0].read,true);
assert.equal(result.notifications[0].hiddenUntil,'2026-10-28');
assert.equal(result.employeeReports[0].minutes,440);
assert.equal(result.employeeReports[0].missingMinutes,70);
assert.equal(JSON.stringify(stored),before);
stored.employeeWorkLogs.push({id:'late',employeeId:'emp-miljan',date:'2026-10-20',minutes:72,activityName:'Rad',clientName:'Klijent'});
const afterEmployeeAppend = JSON.stringify(stored);
result = refresh(stored);
assert.equal(result.employeeReports[0].minutes,512);
assert.equal(result.employeeReports[0].missingMinutes,0);
assert.equal(result.employeeReports[0].negative,'');
assert.match(result.employeeReports[0].autoSummary,/512 min/);
assert.deepEqual(normalize(result.notifications),[{id:'other',key:'invoice-unpaid-1',message:'Keep'}]);
assert.deepEqual(normalize(result.employeeReports[1]),stored.employeeReports[1]);
assert.equal(JSON.stringify(stored),afterEmployeeAppend);
assert.deepEqual(normalize(refresh(result)),normalize(result));
assert.strictEqual(result.employeeWorkLogs,stored.employeeWorkLogs);
assert.strictEqual(result.employeeHourAdjustments,stored.employeeHourAdjustments);
assert.equal(stored.employeeWorkLogs.find(l=>l.id==='today').minutes,20);
stored.employeeReports[0].note='Ručna napomena';stored.employeeReports[0].negative='Lični komentar';
assert.equal(refresh(stored).employeeReports[0].note,'Ručna napomena');
assert.equal(refresh(stored).employeeReports[0].negative,'Lični komentar');
const scoped={...stored,employees:[]};
assert.deepEqual(normalize(refresh(scoped).notifications),stored.notifications);
const abs={...stored,employeeAbsences:[{employeeId:'emp-miljan',status:'Odobreno',startDate:'2026-10-20',endDate:'2026-10-20'}]};
assert.equal(refresh(abs).notifications.length,1);
const expired={...stored,employees:[{...stored.employees[0],endDate:'2026-10-19'}]};
assert.equal(refresh(expired).notifications.length,1);
(async()=>{
 const encoded=Buffer.from(JSON.stringify({role:'full-admin',employeeId:'emp-miljan',exp:Date.now()+3600000})).toString('base64url');
 const token=encoded+'.'+crypto.createHmac('sha256','fixture').update(encoded).digest('base64url');
 const baseline=JSON.stringify(stored);
 let response;
 await context.module.exports({method:'GET',query:{compact:'1'},headers:{authorization:'Bearer '+token}},
 {setHeader(){},end(body){response={status:this.statusCode,body:JSON.parse(body)}}});
 assert.equal(response.status,200);
 assert.equal(response.body.updatedAt,'revision-1');
 assert.equal(response.body.payload.employeeReports[0].minutes,512);
 assert.deepEqual(response.body.payload.employeeWorkLogs,stored.employeeWorkLogs);
 assert.equal(JSON.stringify(stored),baseline);
 assert.equal(writes,0);
 console.log('PASS: late entry updates scoped GET totals and clears stale shortage; source logs, today, adjustments, manual text and revision unchanged; repeated reads are idempotent.');
})().catch(error=>{console.error(error);process.exitCode=1});
