const assert=require('node:assert/strict');
const {analyze,median,csvCell}=require('../work-analytics-core.js');
const data={employees:[{id:'a',name:'Ana',positions:['Editor','Scenario']},{id:'b',name:'Bojan',positions:['Editor']}],clients:[{id:'c',name:'Client'}],activities:[{id:'edit',name:'Edit klipova',category:'Editori'}],rules:[{activity_id:'edit',unit:'clip'}],logs:[
 {id:'old',employeeId:'a',activityId:'edit',clientId:'c',date:'2026-09-30',minutes:100},
 {id:'first',employeeId:'a',activityId:'edit',clientId:'c',date:'2026-09-30',minutes:30},
 {id:'finish',employeeId:'a',activityId:'edit',clientId:'c',date:'2026-10-01',minutes:30},
 {id:'other',employeeId:'b',activityId:'edit',clientId:'c',date:'2026-10-02',minutes:180},
 {id:'open',employeeId:'a',activityId:'edit',clientId:'c',date:'2026-10-02',minutes:60},
 {id:'aggregate',employeeId:'a',activityId:'edit',clientId:'c',date:'2026-10-01',minutes:2000,aggregate:true}
],outputs:[
 {log_id:'first',employee_id:'a',activity_id:'edit',client_id:'c',batch_id:'x',label:'Two clips',unit:'clip',completed:false,quantity:0},
 {log_id:'finish',employee_id:'a',activity_id:'edit',client_id:'c',batch_id:'x',label:'Two clips',unit:'clip',completed:true,quantity:2},
 {log_id:'other',employee_id:'b',activity_id:'edit',client_id:'c',batch_id:'y',label:'Six clips',unit:'clip',completed:true,quantity:6},
 {log_id:'open',employee_id:'a',activity_id:'edit',client_id:'c',batch_id:'z',label:'In progress',unit:'clip',completed:false,quantity:0}
]};
let r=analyze(data,{from:'2026-10-01',to:'2026-10-31',unit:'clip'});
assert.equal(r.totalMinutes,270);assert.equal(r.averageEntry,90);assert.equal(r.averageUnit,30,'Weighted average uses all 240 lifetime batch minutes and eight completed clips');assert.equal(r.unitTotals.clip.quantity,8);assert.equal(r.openBatches,1);assert.equal(r.covered,3);assert.equal(r.unknown,0);
r=analyze(data,{from:'2026-10-01',employee:'a',position:'Scenario',unit:'clip'});assert.equal(r.totalMinutes,90);assert.equal(r.averageUnit,30);assert.equal(r.completed.length,1);
r=analyze(data,{to:'2026-09-30',unit:'clip'});assert.equal(r.averageUnit,null,'Not-yet-completed work never becomes a zero-minute unit');assert.equal(r.unknown,1);
r=analyze(data,{from:'2026-10-01',groupBy:'client'});assert.equal(r.groups.length,1);assert.equal(r.averageUnit,null,'Different units are not silently merged');
const changed=structuredClone(data);changed.logs.find(l=>l.id==='first').clientId='elsewhere';r=analyze(changed,{unit:'clip'});assert.equal(r.unitTotals.clip.quantity,6,'Changing/deleting any linked log quarantines its entire batch');assert.equal(r.invalidOutputs,1);
const duplicate=structuredClone(data);duplicate.outputs.push({...duplicate.outputs[0],log_id:'old',completed:true,quantity:4});r=analyze(duplicate,{unit:'clip'});assert.equal(r.unitTotals.clip.quantity,6,'Two completion records cannot double-count a batch');
assert.equal(median([10,30,100]),30);assert.equal(median([]),null);assert.equal(csvCell('=HYPERLINK("bad")'),'"\'=HYPERLINK(""bad"")"');assert.equal(csvCell('normal'),'"normal"');
console.log('PASS analytics: weighted completed-batch averages, cross-period full time, multi-role filters, legacy coverage, open work, corrupted/duplicate batch quarantine, and safe CSV');
