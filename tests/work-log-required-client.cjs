const assert = require('node:assert/strict');
const { missingWorkLogAssociations } = require('../lib/work-log-integrity.js');
const before = {
  clients: [{id:'c',name:'Client'}, {id:'company',name:'Marketizo Digital'}, {id:'archived',name:'Old',status:'Arhiviran'}],
  employeeActivities: [{id:'edit',name:'Edit',category:'Editori'}, {id:'pause',name:'Pauza',category:'Interno'}, {id:'retired',name:'Old',category:'SMM',active:false}],
  employeeWorkLogs: [{id:'legacy',minutes:20,activityCategory:'Ostalo',activityName:'Rad',clientId:''}],
};
const log = {id:'new',minutes:15,activityId:'edit',activityName:'Edit',activityCategory:'Editori',clientId:'c',clientName:'Client'};
function check(row) { return missingWorkLogAssociations(before,{...before,employeeWorkLogs:[...before.employeeWorkLogs,row]}); }
assert.deepEqual(missingWorkLogAssociations(before,structuredClone(before)),[]);
assert.deepEqual(check(log),[]);
assert.equal(check({...log,clientId:'',clientName:''})[0].field,'clientId');
assert.equal(check({...log,clientId:'bogus',clientName:'Client'})[0].field,'clientId');
assert.equal(check({...log,clientName:'Forged'})[0].field,'clientId');
assert.equal(check({...log,clientId:'archived',clientName:'Old'})[0].field,'clientId');
assert.equal(check({...log,activityId:'',activityName:'Rad'})[0].field,'activityId');
assert.equal(check({...log,activityId:'retired',activityName:'Old',activityCategory:'SMM'})[0].field,'activityId');
assert.equal(check({...log,activityCategory:'Interno',clientId:'',clientName:''})[0].field,'activityId');
assert.deepEqual(check({...log,activityId:'pause',activityName:'Pauza',activityCategory:'Interno',clientId:'',clientName:''}),[]);
assert.deepEqual(check({...log,clientId:'company',clientName:'Marketizo Digital'}),[]);
console.log('PASS: prospective client/activity requirement, canonical internal exemption, invalid/archived client rejection and legacy preservation');
