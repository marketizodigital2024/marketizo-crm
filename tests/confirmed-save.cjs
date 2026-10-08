const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync(__dirname+'/../client-portal.js','utf8');
const start=source.indexOf('document.getElementById("clientLeadForm").addEventListener');
const end=source.indexOf('document.getElementById("editLeadForm")',start);
let handler,failed=true,reset=0,success=0,notifications=0,seq=0;
const client={id:'client-a',name:'Fixture',leads:0};
const ctx={state:{clients:[client],leads:[]},activeClient:client,clientSaveInFlight:false,structuredClone,Date,Number,
 crypto:{randomUUID:()=>`fixture-${++seq}`},FormData:class{get(k){return {status:'Novi',name:'Example'}[k]||''}},
 normalizeLeadStatus:v=>v,isContactedStatus:()=>false,localStorage:{setItem(){}},
 document:{getElementById(id){return id==='clientLeadForm'?{addEventListener(event,fn){handler=fn}}:{hidden:false}}},
 saveState:async()=>({ok:!failed,error:'fixture failure'}),loadClientState:v=>v,
 renderClientApp(){},showLeadNotification(){notifications++},showToast(t,m,k){if(k==='ok')success++}
};
vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
(async()=>{
 const form={reset(){reset++}},event={preventDefault(){},currentTarget:form};
 await handler(event);assert.equal(ctx.state.leads.length,0);assert.equal(reset,0);assert.equal(success,0);assert.equal(notifications,0);
 failed=false;await handler(event);assert.equal(ctx.state.leads.length,1);assert.equal(reset,1);assert.equal(success,1);assert.equal(notifications,1);
 const app=fs.readFileSync(__dirname+'/../app.js','utf8');
 const begin=app.indexOf('  panel.querySelector("form").addEventListener("submit", async');
 const stop=app.indexOf('\n}\n\nfunction renderEmployeeHourAdjustments',begin);
 let correctionHandler,corrected=0,id=0;
 const deductionForm={dataset:{},elements:{date:{},minutes:{}},reset(){corrected++}};
 const deduction={state:{employees:[{id:'emp-a',name:'Fixture employee'}],employeeHourAdjustments:[]},panel:{querySelector(){return {addEventListener(type,fn){correctionHandler=fn}}}},
 FormData:class{get(k){return {employeeId:'emp-a',minutes:'630',date:'2026-10-08',reason:'Payout'}[k]}},
 currentDateKey:()=> '2026-10-08',parseNumber:Number,Math,String,Date,crypto:{randomUUID:()=>`adjustment-${++id}`},confirm:()=>true,
 window:{MarketizoRemote:{}},onlineHydrationComplete:true,saveState:async()=>({ok:!failed,error:'fixture failure'}),localStorage:{setItem(){}},renderAll(){},showToast(){}};
 vm.createContext(deduction);vm.runInContext(app.slice(begin,stop),deduction);
 failed=true;await correctionHandler({preventDefault(){},currentTarget:deductionForm});assert.equal(deduction.state.employeeHourAdjustments.length,0);assert.equal(corrected,0);
 failed=false;await correctionHandler({preventDefault(){},currentTarget:deductionForm});assert.equal(deduction.state.employeeHourAdjustments.length,1);assert.equal(deduction.state.employeeHourAdjustments[0].minutes,630);assert.equal(corrected,1);
 console.log('PASS: failed lead and deduction retain form; retry creates one confirmed record; success only after persistence.');
})().catch(error=>{console.error(error);process.exitCode=1});
