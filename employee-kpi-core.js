(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MarketizoEmployeeKpi=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const statuses={pending:'Za proveru',confirmed:'Potvrđen',resolved:'Rešen',dismissed:'Nije propust',active:'Važeća ocena',void:'Poništena ocena'};
 function empty(employeeId){return {employeeId,incidents:0,points:0,serious:0,pending:0,open:0,ratingCount:0,ratingTotal:0,average:null};}
 function add(s,e){if(e.kind==='rating'&&e.status==='active'){s.ratingCount++;s.ratingTotal+=Number(e.score);}else if(e.kind==='incident'){if(e.status==='pending')s.pending++;if(['confirmed','resolved'].includes(e.status)){s.incidents++;s.points+=Number(e.severity);if(Number(e.severity)>=4)s.serious++;if(e.status==='confirmed')s.open++;}}s.average=s.ratingCount?s.ratingTotal/s.ratingCount:null;return s;}
 function week(date){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);}
 function aggregate(entries,ids,from,to,group='employee'){
  const allowed=new Set(ids),map=new Map();if(group==='employee')for(const id of ids)map.set(id,empty(id));
  for(const e of entries||[]){if(!allowed.has(e.employeeId)||e.date<from||e.date>to)continue;
   const period=group==='day'?e.date:group==='week'?week(e.date):group==='month'?e.date.slice(0,7):'';const key=period?e.employeeId+'|'+period:e.employeeId;
   if(!map.has(key))map.set(key,{...empty(e.employeeId),period});add(map.get(key),e);
  }return [...map.values()].sort((a,b)=>(b.period||'').localeCompare(a.period||'')||a.employeeId.localeCompare(b.employeeId));
 }
 return {aggregate,empty,statuses,week};
});
