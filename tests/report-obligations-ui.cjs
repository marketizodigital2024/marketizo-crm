'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../report-obligations.js','utf8');
const nodes=new Map(),events={},storage=new Map();let response,fail=false,dailyOpens=[],clientOpens=[];
function node(id){if(nodes.has(id))return nodes.get(id);const n={id,value:'',textContent:'',innerHTML:'',hidden:false,open:false,dataset:{},listeners:{},elements:{},addEventListener(t,fn){this.listeners[t]=fn;},showModal(){this.open=true;},close(){this.open=false;},reset(){},};nodes.set(id,n);return n;}
const task={id:'daily-worker',employeeId:'worker',kind:'daily',periodStart:'2026-11-25',periodEnd:'2026-11-25',dueDate:'2026-11-25',dueTime:'17:30',overdue:true,needsTime:false};
response={ok:true,actorId:'worker',pending:[task],reports:[],people:[]};
const ctx={activeEmployee:{id:'worker'},formatDate:x=>x,escapePortalText:x=>String(x).replaceAll('<','&lt;'),employeeApiHeaders:()=>({}),loggedMinutesForDate:()=>60,saveWeeklyDraft(){},weeklyDraftKey:id=>'draft:'+id,openDailyReportDialog:date=>{dailyOpens.push(date);node('dailyReportForm').dataset.reportDate=date;node('dailyReportDialog').showModal();},AbortController,Date,Intl,Event:class{},localStorage:{getItem:k=>storage.get(k)},document:{hidden:false,getElementById:node,querySelector:s=>s==='dialog[open]'?[...nodes.values()].find(n=>n.open):null,querySelectorAll:()=>[],addEventListener:(t,fn)=>events[t]=fn},window:{setTimeout:()=>1,clearTimeout(){},setInterval(fn){ctx.tick=fn;},addEventListener(){},MarketizoClientReports:{open:id=>clientOpens.push(id)}},fetch:async()=>({ok:!fail,json:async()=>fail?{ok:false,error:'offline'}:structuredClone(response)})};
vm.createContext(ctx);vm.runInContext(source,ctx);const flush=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));};
(async()=>{
  await flush();assert.equal(node('reportGateDialog').open,true,'Overdue report blocks without a dismiss action');
  let prevented=false;node('reportGateDialog').listeners.cancel({preventDefault(){prevented=true;}});assert(prevented,'Escape cannot bypass gate');
  node('reportGateOpen').listeners.click();assert.deepEqual(dailyOpens,['2026-11-25']);assert(node('closeDailyReportDialog').hidden);assert(node('dailyReportLater').hidden);
  fail=true;await ctx.window.MarketizoReportGate.refresh(true);assert(node('dailyReportDialog').open,'Failed network check retains required form');assert(node('reportObligationError').hidden===false);
  fail=false;response.pending=[];node('dailyReportDialog').close();await ctx.window.MarketizoReportGate.refresh(true);assert.equal(node('reportGateDialog').open,false,'Only confirmed server completion releases gate');
  response.pending=[{...task,id:'weekly-worker',kind:'weekly',periodEnd:'2026-11-29'}];
  node('weeklyQuestionnaireForm').elements=Object.fromEntries([1,2,3,4,5].map(i=>['answer'+i,{value:''}]));
  storage.set('draft:weekly-worker',JSON.stringify(['retained answer']));
  await ctx.window.MarketizoReportGate.refresh(true);node('reportGateOpen').listeners.click();assert(node('weeklyQuestionnaireDialog').open);assert(node('weeklyQuestionnaireLater').hidden);assert.equal(node('weeklyQuestionnaireForm').elements.answer1.value,'retained answer');
  node('weeklyQuestionnaireDialog').close();response.pending=[{...task,id:'client-worker',kind:'clients'}];await ctx.window.MarketizoReportGate.refresh(true);node('reportGateOpen').listeners.click();assert.deepEqual(clientOpens,['client-worker'],'Coordinator opens the exact client obligation');
  response.actorId='other';response.pending=[{...task,employeeId:'other'}];await ctx.window.MarketizoReportGate.refresh(true);assert.match(node('reportObligationError').textContent,/Sesija/,'Cross-tab actor mismatch is rejected');
  ctx.activeEmployee=null;ctx.window.MarketizoReportGate.syncActor();assert.equal(ctx.window.MarketizoReportGate.pending().length,0);let stopped=false;events.click({target:{closest:()=>null},preventDefault(){stopped=true;},stopImmediatePropagation(){}});assert.equal(stopped,false,'Login clicks are safe before a session exists');
  console.log('PASS obligation UI: overdue gate, Escape prevention, exact report routing, retained drafts and failures, confirmed unlock, account mismatch protection');
})().catch(e=>{console.error(e);process.exitCode=1;});
