const assert=require('assert/strict');const harness=require('./crm-regression.cjs');
const crypto=require('crypto');
const state=harness.getCurrent();state.payload.employees.find(e=>e.id==='emp-a').isOperationalAdmin=true;
const encoded=Buffer.from(JSON.stringify({employeeId:'emp-a',role:'operational-admin',exp:Date.now()+3600000})).toString('base64url');
const token=encoded+'.'+crypto.createHmac('sha256','local-fixture').update(encoded).digest('base64url');
const payload=structuredClone(state.payload);payload.employeeHourAdjustments=[{id:'fixture-deduction',employeeId:'emp-b',date:'2026-10-08',minutes:630,reason:'fixture'}];
let result;const res={statusCode:200,setHeader(){},end(s){result={status:this.statusCode,...JSON.parse(s)}}};
(async()=>{await harness.state({method:'PUT',body:{payload,baseUpdatedAt:state.updated_at},headers:{authorization:'Bearer '+token}},res);const saved=harness.getCurrent().payload.employeeHourAdjustments||[];assert.equal(result.status,200);assert.equal(saved.length,1);assert.equal(saved[0].minutes,630);assert.equal(saved[0].actorId,'emp-a');assert.equal(result.payload.employeeHourAdjustments[0].minutes,630);assert.equal(harness.getCurrent().payload.hourAdjustmentAudit.length,1);console.log(JSON.stringify({httpStatus:result.status,submittedMinutes:630,savedAdjustments:saved.length,actorRecorded:true,canonicalResponse:true}));})();
