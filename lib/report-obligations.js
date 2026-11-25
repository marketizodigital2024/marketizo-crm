'use strict';
// New obligations only. Historical reports remain readable and never become blockers.
const START = '2026-11-25';
const calendar = require('./business-calendar.js');
const costs = require('../cost-calculation.js');
const add = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);
function local(now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Vienna',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(x=>[x.type,x.value]));
  return {date:`${p.year}-${p.month}-${p.day}`, time:`${p.hour}:${p.minute}`};
}
function employed(e,d) { return e && e.status !== 'Neaktivan' && e.active !== false && (!e.startDate || e.startDate <= d) && (!e.endDate || e.endDate >= d); }
function absent(p,e,d) { return (p.employeeAbsences||[]).some(a=>a.employeeId===e.id && a.status==='Odobreno' && a.startDate<=d && d<=a.endDate); }
const minuteIndexes=new WeakMap();
function logs(p,e,d) {
  let index=minuteIndexes.get(p);
  if(!index || index.source!==p.employeeWorkLogs || index.length!==(p.employeeWorkLogs||[]).length){
    const totals=new Map();for(const l of p.employeeWorkLogs||[]){const key=l.employeeId+':'+l.date;totals.set(key,(totals.get(key)||0)+costs.minutes(l));}
    index={source:p.employeeWorkLogs,length:(p.employeeWorkLogs||[]).length,totals};minuteIndexes.set(p,index);
  }
  return index.totals.get(e.id+':'+d)||0;
}
function workdays(a,b) { const out=[]; for(let d=a;d<=b;d=add(d,1)) if(calendar.isWorkingDay(d)) out.push(d); return out; }
function endTime(e,d) {
  const weekly=costs.weeklyHours(e,d.slice(0,7));
  const minutes=weekly>=38 ? (new Date(d+'T12:00:00Z').getUTCDay()===5?420:510) : Math.round(weekly*60/5);
  const end=9*60+Math.max(0,minutes);
  return `${String(Math.floor(end/60)).padStart(2,'0')}:${String(end%60).padStart(2,'0')}`;
}
function type(r) { return r.isClientWeeklyReport?'clients':r.isWeeklyQuestionnaire?'weekly':r.isFinalDailyReport?'daily':''; }
function complete(r) { return type(r)==='daily' ? r.isAutomaticRollup!==true && Boolean(r.note?.trim() && r.positive?.trim() && r.negative?.trim() && r.help?.trim()) : Boolean(r.submittedAt); }
function period(r) {
  if(type(r)==='daily') return {start:r.date,end:r.date};
  return {start:r.periodStart||r.weekKey||r.date,end:r.periodEnd||add(r.weekKey||r.date,6)};
}
function policy(p,e,r,now=new Date()) {
  const kind=type(r);if(!kind || !/^\d{4}-\d{2}-\d{2}$/.test(r.periodStart||r.weekKey||r.date||''))return null;
  const span=period(r), reference=kind==='clients'?r.date:kind==='weekly'?add(span.start,4):r.date;
  if(!kind || reference<START || !employed(e,reference) || complete(r)) return null;
  if(kind==='clients' && (e.isLeader || !r.clients?.length)) return null;
  const days=workdays(span.start,span.end).filter(d=>employed(e,d));
  if(!days.length || days.every(d=>absent(p,e,d) && !logs(p,e,d))) return null;
  let due=kind==='daily'?r.date:(r.dueDate||reference);
  // A shortened week is due on its last working day; leave on the deadline defers it.
  if(kind==='weekly') while(!calendar.isWorkingDay(due)) due=add(due,-1);
  let guard=0;
  while((!calendar.isWorkingDay(due)||absent(p,e,due)) && guard++<370) due=add(due,1);
  if(guard>=370) return null;
  const clock=endTime(e,due), current=local(now);
  return {id:r.id,employeeId:e.id,kind,periodStart:span.start,periodEnd:span.end,dueDate:due,dueTime:clock,overdue:current.date>due || (current.date===due && current.time>=clock),needsTime:kind==='daily' && logs(p,e,r.date)<=0};
}
function ensure(p,now=new Date()) {
  const today=local(now).date;
  if(today<START) return 0;
  p.employeeReports ||= [];
  let changed=0;
  const existingDaily=new Set(p.employeeReports.filter(r=>r.isFinalDailyReport).map(r=>r.employeeId+':'+r.date));
  const existingWeekly=new Set(p.employeeReports.filter(r=>r.isWeeklyQuestionnaire).map(r=>r.employeeId+':'+r.weekKey));
  for(const e of p.employees||[]) {
    if(!employed(e,today)) continue;
    for(let d=START;d<=today;d=add(d,1)) {
      if(!calendar.isWorkingDay(d) || !employed(e,d) || (absent(p,e,d)&&!logs(p,e,d))) continue;
      if(!existingDaily.has(e.id+':'+d)) {
        p.employeeReports.push({id:`daily-report-${e.id}-${d}`,employeeId:e.id,recipientId:e.leaderId||'admin',date:d,title:'Dnevni izveštaj',isFinalDailyReport:true,isAutomaticRollup:true,isReportObligation:true,createdAt:now.toISOString()});changed++;
      }
    }
    let monday=add(START,-((new Date(START+'T12:00:00Z').getUTCDay()+6)%7));
    for(;monday<=today;monday=add(monday,7)) {
      const friday=add(monday,4);
      if(friday<START || !employed(e,friday)) continue;
      if(!existingWeekly.has(e.id+':'+monday)) {
        p.employeeReports.push({id:`weekly-report-${e.id}-${monday}`,employeeId:e.id,recipientId:e.leaderId||'admin',date:friday,dueDate:friday,weekKey:monday,periodStart:monday,periodEnd:add(monday,6),title:'Nedeljni izveštaj zaposlenog',isWeeklyQuestionnaire:true,isReportObligation:true,status:'sent',createdAt:now.toISOString()});changed++;
      }
    }
  }
  return changed;
}
function pending(p,e,now=new Date()) { return (p.employeeReports||[]).filter(r=>r.employeeId===e.id).map(r=>policy(p,e,r,now)).filter(Boolean).sort((a,b)=>(a.dueDate+a.dueTime).localeCompare(b.dueDate+b.dueTime)||a.id.localeCompare(b.id)); }
module.exports={START,add,local,employed,absent,logs,endTime,type,complete,period,policy,ensure,pending};
