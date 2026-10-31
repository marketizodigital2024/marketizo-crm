'use strict';
const comp=require('../comp-time.js'),calendar=require('./business-calendar.js');
const same=(a,b)=>a&&b&&['employeeId','type','startDate','endDate'].every(k=>a[k]===b[k]);
function sync(previous,payload,actor,now=new Date()){
 const oldRows=(previous.employeeHourAdjustments||[]).filter(comp.isAutomatic),approved=(payload.employeeAbsences||[]).filter(a=>a.type===comp.TYPE&&a.status==='Odobreno');
 if(!oldRows.length&&!approved.length)return payload;
 const today=comp.approvalDate(now),stamp=now.toISOString();
 const priorAbsences=new Map((previous.employeeAbsences||[]).map(a=>[a.id,a])),oldByAbsence=new Map();for(const row of oldRows){if(!oldByAbsence.has(row.absenceId))oldByAbsence.set(row.absenceId,[]);oldByAbsence.get(row.absenceId).push(row);}
 if(new Set(approved.map(a=>a.id)).size!==approved.length)throw Error("Dupliran zahtev za slobodno za prekovremene sate.");
 const automatic=[],occupied=new Set();
 for(const absence of approved){
  if(typeof absence.id!=='string'||!absence.id||absence.id.length>160)throw Error('Odsustvu nedostaje ispravan identifikator.');
  const oldAbsence=priorAbsences.get(absence.id),existing=oldByAbsence.get(absence.id)||[];
  // Never retrocharge an already approved legacy record on an unrelated save.
  if(oldAbsence?.type===comp.TYPE&&oldAbsence.status==='Odobreno'&&!existing.length&&same(oldAbsence,absence))continue;
  const employee=(payload.employees||[]).find(e=>e.id===absence.employeeId),chargeDate=existing[0]?.date||today;
  if(/^\d{4}-\d{2}$/.test(employee?.openingBalanceMonth||'')&&employee.openingBalanceMonth>=chargeDate.slice(0,7))throw Error('Početni saldo mora biti zaključen pre meseca zaduženja. Prvo uskladi početni saldo zaposlenog.');
  const days=oldAbsence?.status==='Odobreno'&&same(oldAbsence,absence)&&existing.length?existing.map(r=>({date:r.absenceDate,minutes:r.minutes})):comp.plan(payload,absence,calendar.isWorkingDay);
  for(const day of days){const key=absence.employeeId+'|'+day.date;if(occupied.has(key))throw Error('Preklapaju se odobrena odsustva za prekovremene sate.');occupied.add(key);
   if((payload.employeeAbsences||[]).some(a=>a.id!==absence.id&&a.employeeId===absence.employeeId&&a.status==='Odobreno'&&a.type!==comp.TYPE&&a.startDate<=day.date&&a.endDate>=day.date))throw Error('Zeitausgleich se preklapa sa drugim odobrenim odsustvom.');
  }
  if(oldAbsence?.status==='Odobreno'&&same(oldAbsence,absence)&&existing.length){automatic.push(...existing);continue;}
  for(const day of days)automatic.push({id:comp.PREFIX+encodeURIComponent(absence.id)+':'+day.date,employeeId:absence.employeeId,date:existing[0]?.date||today,minutes:day.minutes,reason:`Zeitausgleich · ${day.date}`,source:'zeitausgleich',absenceId:absence.id,absenceDate:day.date,actorId:actor.id,createdAt:stamp});
 }
 const before=new Map(oldRows.map(r=>[r.id,r])),after=new Map(automatic.map(r=>[r.id,r])),audit=[];
 for(const row of oldRows)if(!after.has(row.id)||JSON.stringify(after.get(row.id))!==JSON.stringify(row))audit.push({...row,action:'void',actorId:actor.id,recordedAt:stamp});
 for(const row of automatic)if(!before.has(row.id)||JSON.stringify(before.get(row.id))!==JSON.stringify(row))audit.push({...row,action:'deduct',actorId:actor.id,recordedAt:stamp});
 return {...payload,employeeHourAdjustments:[...(payload.employeeHourAdjustments||[]).filter(r=>!comp.isAutomatic(r)),...automatic],hourAdjustmentAudit:[...(payload.hourAdjustmentAudit||[]),...audit]};
}
module.exports={sync};
