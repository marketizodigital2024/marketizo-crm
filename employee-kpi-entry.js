(()=>{
 'use strict';
 const app=document.getElementById('employeeApp'),anchor=document.getElementById('leaderReportsNav');
 if(!app||!anchor)return;
 const link=document.createElement('a');link.href='/employee-kpi?portal=employee';link.className='nav-item';link.textContent='KPI zaposleni';link.hidden=true;anchor.after(link);
 function sync(){const person=typeof activeEmployee==='object'?activeEmployee:null;link.hidden=app.hidden||!person||!(person.isLeader===true||['emp-miljan','emp-ivana'].includes(person.id));}
 new MutationObserver(sync).observe(app,{attributes:true,attributeFilter:['hidden']});
 new MutationObserver(sync).observe(anchor,{attributes:true,attributeFilter:['hidden']});
 sync();
})();
