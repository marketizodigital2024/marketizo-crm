(function(root){
  'use strict';
  const costs=typeof module==='object'&&module.exports?require('./cost-calculation.js'):root.MarketizoCosts;
  const monthValid=m=>/^\d{4}-(0[1-9]|1[0-2])$/.test(m);
  function capacity(employees,month){
    if(!monthValid(month))throw Error('Izaberi mesec.');
    const last=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),0)).getUTCDate();
    const end=`${month}-${last}`,start=month+'-01';
    return (employees||[]).filter(e=>!(e.startDate&&e.startDate>end)&&!(e.endDate&&e.endDate<start)&&!((e.active===false||e.status==='Neaktivan')&&!e.endDate)).map(e=>{
      const first=e.startDate&&e.startDate>start?Number(e.startDate.slice(8)):1;
      const final=e.endDate&&e.endDate<end?Number(e.endDate.slice(8)):last;
      const date=month+'-'+String(first).padStart(2,'0');
      const hours=costs.terms(e,date).weeklyHours;
      if(!Number.isFinite(hours)||hours<0||hours>168)throw Error('Proveri ugovorene sate: '+e.name);
      return {id:e.id,name:e.name,monthlyHours:hours*52/12*(final-first+1)/last};
    });
  }
  function validate(settings){
    if(settings===undefined)return true;
    if(!settings||typeof settings!=='object'||Array.isArray(settings)||Object.keys(settings).length>240)return false;
    return Object.entries(settings).every(([m,s])=>monthValid(m)&&s&&Number.isFinite(s.fixedAmount)&&s.fixedAmount>=0&&s.fixedAmount<=10000000&&Array.isArray(s.capacity)&&s.capacity.length<=2000&&new Set(s.capacity.map(e=>e.id)).size===s.capacity.length&&s.capacity.every(e=>typeof e.id==='string'&&e.id.length<=128&&typeof e.name==='string'&&e.name.length<=200&&Number.isFinite(e.monthlyHours)&&e.monthlyHours>=0&&e.monthlyHours<=750)&&s.capacity.reduce((n,e)=>n+e.monthlyHours,0)>0&&(!s.extras||typeof s.extras==='object'&&!Array.isArray(s.extras)&&Object.keys(s.extras).length<=2000&&Object.entries(s.extras).every(([id,x])=>id.length<=128&&x&&Number.isFinite(x.amount)&&x.amount>=0&&x.amount<=10000000&&typeof x.note==='string'&&x.note.length<=500)));
  }
  function rate(settings,month){
    const s=settings?.[month];if(!s||!validate({[month]:s}))return null;
    const hours=s.capacity.reduce((n,e)=>n+e.monthlyHours,0);
    return {fixedAmount:s.fixedAmount,hours,hourly:s.fixedAmount/hours};
  }
  function allocation(log,settings){const r=rate(settings,String(log.date||'').slice(0,7));return r?costs.minutes(log)/60*r.hourly:null;}
  function months(from,to){if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)||from>to)return [];let m=from.slice(0,7),out=[];while(m<=to.slice(0,7)&&out.length<240){out.push(m);let y=Number(m.slice(0,4)),n=Number(m.slice(5))+1;if(n===13){y++;n=1}m=`${y}-${String(n).padStart(2,'0')}`}return out;}
  const api={capacity,validate,rate,allocation,months};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.MarketizoOverhead=api;
})(typeof window==='object'?window:globalThis);
