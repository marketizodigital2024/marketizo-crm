(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MarketizoWorkAnalytics=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const units={scenario:'scenario',scenario_revision:'ispravka scenarija',clip:'klip',clip_revision:'ispravka klipa',story:'stori',post:'post',task:'zadatak',call:'poziv',shoot:'snimanje',clip_check:'proveren klip',voiceover:'voiceover',none:'Bez količine'};
 const plural={scenario:'scenarija',scenario_revision:'ispravki scenarija',clip:'klipova',clip_revision:'ispravki klipova',story:'storija',post:'postova',task:'zadataka',call:'poziva',shoot:'snimanja',clip_check:'proverenih klipova',voiceover:'voiceovera'};
 const sum=(rows,key)=>rows.reduce((n,r)=>n+(Number(r[key])||0),0);
 const median=values=>{const a=values.filter(Number.isFinite).sort((a,b)=>a-b);return a.length?(a[Math.floor((a.length-1)/2)]+a[Math.ceil((a.length-1)/2)])/2:null;};
 function analyze(data,filters={}) {
  const employees=new Map((data.employees||[]).map(e=>[e.id,e])), activities=new Map((data.activities||[]).map(a=>[a.id,a]));
  const all=(data.logs||[]).filter(l=>Number.isFinite(l.minutes)&&l.minutes>0), byId=new Map(all.map(l=>[l.id,l]));
  const matchIdentity=l=>(!filters.employee||l.employeeId===filters.employee)&&(!filters.client||l.clientId===filters.client)&&(!filters.activity||l.activityId===filters.activity)&&(!filters.position||(employees.get(l.employeeId)?.positions||[]).includes(filters.position))&&(!filters.category||(activities.get(l.activityId)?.category||l.activityCategory)===filters.category)&& (filters.includeAggregates||!l.aggregate);
  const inPeriod=date=>(!filters.from||date>=filters.from)&&(!filters.to||date<=filters.to);
  const logs=all.filter(l=>matchIdentity(l)&&inPeriod(l.date));
  const batches=new Map(),validOutputs=new Map(),badBatches=new Set();let invalidOutputs=0;
  for(const o of data.outputs||[]) {
   const log=byId.get(o.log_id);
   if(!log||log.employeeId!==o.employee_id||log.activityId!==o.activity_id||(log.clientId||'')!==o.client_id||!units[o.unit]||o.unit==='none'||!Number.isInteger(o.quantity)||o.quantity<0||(o.completed?o.quantity<1:o.quantity!==0)){invalidOutputs++;badBatches.add(o.batch_id);continue;}
   let b=batches.get(o.batch_id);
   if(!b){b={id:o.batch_id,employeeId:o.employee_id,activityId:o.activity_id,clientId:o.client_id,unit:o.unit,label:o.label,logs:[],completions:[],invalid:false};batches.set(o.batch_id,b);}
   if(b.employeeId!==o.employee_id||b.activityId!==o.activity_id||b.clientId!==o.client_id||b.unit!==o.unit)b.invalid=true;
   b.logs.push(log);if(o.completed)b.completions.push({date:log.date,quantity:o.quantity});validOutputs.set(o.log_id,o);
  }
  const completed=[...batches.values()].filter(b=>!b.invalid&&!badBatches.has(b.id)&&b.completions.length===1&&b.logs.every(l=>l.date<=b.completions[0].date)&&matchIdentity(b.logs[0])&&inPeriod(b.completions[0].date)&&(!filters.unit||b.unit===filters.unit)).map(b=>({...b,minutes:sum(b.logs,'minutes'),quantity:b.completions[0].quantity,date:b.completions[0].date,perUnit:sum(b.logs,'minutes')/b.completions[0].quantity}));
  const groupBy=filters.groupBy||'employee';
  const groupKey=l=>groupBy==='activity'?l.activityId||`legacy:${l.activityName}`:groupBy==='client'?l.clientId||'no-client':groupBy==='position'?(employees.get(l.employeeId)?.positions||['Bez pozicije']).join(' / '):l.employeeId;
  const groupName=(key,l)=>groupBy==='activity'?activities.get(l.activityId)?.name||l.activityName||'Bez aktivnosti':groupBy==='client'?(data.clients||[]).find(c=>c.id===l.clientId)?.name||l.clientName||'Bez klijenta':groupBy==='position'?key:employees.get(l.employeeId)?.name||'Obrisan zaposleni';
  const groups=new Map();
  function group(l){const key=groupKey(l);if(!groups.has(key))groups.set(key,{key,name:groupName(key,l),minutes:0,entries:0,batches:[],unitTotals:{}});return groups.get(key);}
  for(const l of logs){const g=group(l);g.minutes+=l.minutes;g.entries++;}
  for(const b of completed){const g=group(b.logs[0]);g.batches.push(b);g.unitTotals[b.unit]||={quantity:0,minutes:0,batches:0};g.unitTotals[b.unit].quantity+=b.quantity;g.unitTotals[b.unit].minutes+=b.minutes;g.unitTotals[b.unit].batches++;}
  const groupsArray=[...groups.values()].map(g=>({...g,averageEntry:g.entries?g.minutes/g.entries:null,averageUnit:filters.unit&&g.unitTotals[filters.unit]?g.unitTotals[filters.unit].minutes/g.unitTotals[filters.unit].quantity:null,medianUnit:filters.unit?median(g.batches.map(b=>b.perUnit)):null}));
  const unitTotals={};for(const b of completed){unitTotals[b.unit]||={quantity:0,minutes:0,batches:0};unitTotals[b.unit].quantity+=b.quantity;unitTotals[b.unit].minutes+=b.minutes;unitTotals[b.unit].batches++;}
  const rules=new Map((data.rules||[]).map(r=>[r.activity_id,r.unit]));
  const eligible=logs.filter(l=>(rules.get(l.activityId)&&rules.get(l.activityId)!=='none')||validOutputs.has(l.id));
  const covered=eligible.filter(l=>validOutputs.has(l.id));
  const daily=new Map(),categories=new Map(),clients=new Map();for(const l of logs){daily.set(l.date,(daily.get(l.date)||0)+l.minutes);const cat=activities.get(l.activityId)?.category||l.activityCategory||'Ostalo';categories.set(cat,(categories.get(cat)||0)+l.minutes);const client=l.clientName||'Bez klijenta';clients.set(client,(clients.get(client)||0)+l.minutes);}
  const unitSummary=filters.unit?unitTotals[filters.unit]:null;
  return {logs,groups:groupsArray,completed,unitTotals,totalMinutes:sum(logs,'minutes'),entries:logs.length,averageEntry:logs.length?sum(logs,'minutes')/logs.length:null,averageUnit:unitSummary?unitSummary.minutes/unitSummary.quantity:null,medianUnit:filters.unit?median(completed.map(b=>b.perUnit)):null,eligible:eligible.length,covered:covered.length,coverage:eligible.length?covered.length/eligible.length:null,unknown:eligible.length-covered.length,invalidOutputs,openBatches:[...batches.values()].filter(b=>!b.invalid&&!b.completions.length&&matchIdentity(b.logs[0])&&b.logs.some(l=>inPeriod(l.date))).length,daily:[...daily].sort((a,b)=>a[0].localeCompare(b[0])),categories:[...categories].sort((a,b)=>b[1]-a[1]),clients:[...clients].sort((a,b)=>b[1]-a[1]),outputByLog:validOutputs};
 }
 function csvCell(v){let s=String(v??'');if(/^[\s]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
 return {analyze,units,plural,median,csvCell};
});
