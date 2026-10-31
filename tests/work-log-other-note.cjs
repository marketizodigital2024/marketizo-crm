const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const {missingWorkLogAssociations} = require('../lib/work-log-integrity.js');
const legacy = {id:'legacy',activityId:'other',note:'',minutes:20,clientId:''};
const before = {employeeActivities:[{id:'other',name:'Communication',category:'Ostalo'},{id:'renamed',name:'Other work',category:'Druge aktivnosti'},{id:'edit',name:'Edit',category:'Editori'}],clients:[{id:'c',name:'Client'}],employeeWorkLogs:[legacy]};
const row = {id:'new',activityId:'other',activityName:'Communication',activityCategory:'Ostalo',clientId:'c',clientName:'Client',minutes:10};
const check = r => missingWorkLogAssociations(before,{...before,employeeWorkLogs:[legacy,r]});
for (const note of [undefined,'',' ','\t\n']) assert(check({...row,note}).some(x=>x.field==='note'));
assert.deepEqual(check({...row,note:'Provera dogovora sa klijentom'}),[]);
assert.deepEqual(check({...row,activityId:'edit',activityName:'Edit',activityCategory:'Editori'}),[]);
assert(check({...row,activityId:'renamed',activityName:'Other work',activityCategory:'Druge aktivnosti'}).some(x=>x.field==='note'));
assert.deepEqual(missingWorkLogAssociations(before,structuredClone(before)),[],'unchanged historical incomplete row remains untouched');
const documented = {...row,note:'Original description'};
assert(missingWorkLogAssociations({...before,employeeWorkLogs:[documented]},{...before,employeeWorkLogs:[{...documented,note:''}]}).some(x=>x.field==='note'),'clearing a retained description is rejected');
for(const file of ['app.js','employee-portal.js']) {
 const source=fs.readFileSync(__dirname+'/../'+file,'utf8');
 const start=source.indexOf('function workActivityCategoryLabel('),end=source.indexOf('\n}',start)+2;
 const ctx={};vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
 assert.equal(ctx.workActivityCategoryLabel('Ostalo'),'Druge aktivnosti');
 assert.equal(ctx.workActivityCategoryLabel('Druge aktivnosti'),'Druge aktivnosti');
 assert.equal(ctx.workActivityCategoryLabel('SMM'),'SMM');
}
console.log('PASS: other-work descriptions, renamed category compatibility, history preservation and category display');
