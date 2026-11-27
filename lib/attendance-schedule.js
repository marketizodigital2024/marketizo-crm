'use strict';
const costs=require('../cost-calculation.js'),calendar=require('./business-calendar.js');
const effectiveFrom='2026-11-27';
function forEmployee(e,date){
  if(!e||typeof date!=='string'||!/^20\d\d-\d\d-\d\d$/.test(date)||date<effectiveFrom||!calendar.isWorkingDay(date)||e.startDate&&date<e.startDate||e.endDate&&date>e.endDate||e.status==='Neaktivan'||/snimatelj/i.test(String(e.position||'')))return null;
  const hours=costs.weeklyHours(e,date.slice(0,7));if(hours!==30&&hours!==38.5)return null;
  const end=hours===30?'15:00':new Date(date+'T12:00:00Z').getUTCDay()===5?'16:00':'17:30';
  const breakMinutes=hours===30?0:30,netMinutes=(Number(end.slice(0,2))*60+Number(end.slice(3))-540)-breakMinutes;
  return{version:'office-20261127',effectiveFrom,weeklyHours:hours,start:'09:00',end,breakMinutes,breakFrom:breakMinutes?'12:00':null,breakTo:breakMinutes?'12:30':null,netMinutes};
}
function summary(s){return s?`${s.start}–${s.end}; pauza ${s.breakMinutes} min${s.breakMinutes?' 12:00–12:30':''}`:'';}
function warning(r){return r&&r.netMinutes>360&&r.breakMinutes<30?'Rad preko 6 sati uz pauzu kraću od 30 min':'';}
module.exports={forEmployee,summary,warning,effectiveFrom};
