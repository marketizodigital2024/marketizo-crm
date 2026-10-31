(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./cost-calculation.js'):root.MarketizoCosts);if(typeof module==='object'&&module.exports)module.exports=api;else root.MarketizoCompTime=api;})(typeof window==='object'?window:globalThis,function(costs){
 'use strict';
 const TYPE='Slobodno za prekovremene sate',PREFIX='comp-time:';
 const isAutomatic=row=>String(row?.id||'').startsWith(PREFIX)||row?.source==='zeitausgleich';
 function validDate(date){return /^\d{4}-\d{2}-\d{2}$/.test(String(date||''))&&Number.isFinite(Date.parse(date+'T12:00:00Z'))&&new Date(date+'T12:00:00Z').toISOString().slice(0,10)===date;}
 function scheduledMinutes(hours,date){const day=new Date(date+'T12:00:00Z').getUTCDay();if(day===0||day===6)return 0;return hours>=38?(day===5?(date>='2026-10-30'?420:390):510):Math.round(hours*60/5);}
 function plan(payload,absence,isWorkingDay){
  if(absence?.type!==TYPE)return [];
  if(!validDate(absence.startDate)||!validDate(absence.endDate)||absence.startDate>absence.endDate)throw Error('Izaberi ispravan period slobodnog za prekovremene sate.');
  const employee=(payload.employees||[]).find(e=>e.id===absence.employeeId);if(!employee)throw Error('Zaposleni nije pronađen.');
  const from=Date.parse(absence.startDate+'T12:00:00Z'),to=Date.parse(absence.endDate+'T12:00:00Z');if((to-from)/86400000>365)throw Error('Period odsustva ne može biti duži od godinu dana.');
  const days=[];for(let t=from;t<=to;t+=86400000){const date=new Date(t).toISOString().slice(0,10);if(!isWorkingDay(date)||(employee.startDate&&date<employee.startDate)||(employee.endDate&&date>employee.endDate))continue;const hours=costs.weeklyHours(employee,date.slice(0,7));if(!Number.isFinite(hours)||hours<=0)throw Error('Nedostaje ispravan raspored sati za period odsustva.');const minutes=scheduledMinutes(hours,date);if(minutes>0)days.push({date,minutes});}
  if(!days.length)throw Error('Izabrani period nema planiranih radnih sati.');return days;
 }
 function total(payload,absenceId){return (payload.employeeHourAdjustments||[]).filter(row=>isAutomatic(row)&&row.absenceId===absenceId).reduce((n,row)=>n+Number(row.minutes||0),0);}
 return {TYPE,PREFIX,isAutomatic,validDate,scheduledMinutes,plan,total};
});
