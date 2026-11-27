(function(){'use strict';
  let loading;
  function open(mode){
    if(!document.getElementById('attendanceStyle')){const css=document.createElement('link');css.id='attendanceStyle';css.rel='stylesheet';css.href='/attendance.css?v=20261127-4';document.head.append(css);}
    if(!loading)loading=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/attendance-ui.js?v=20261127-4';script.onload=resolve;script.onerror=()=>{loading=null;reject(Error('Učitavanje nije uspelo.'));};document.body.append(script);});
    loading.then(()=>window.MarketizoAttendance.open(mode)).catch(e=>alert(e.message));
  }
  function button(target,text,mode,id){if(!target||document.getElementById(id))return;const b=document.createElement('button');b.id=id;b.type='button';b.className='secondary-button';b.textContent=text;b.addEventListener('click',()=>open(mode));target.append(b);}
  const employee=/employee-login/.test(location.pathname);
  function mount(){
    if(employee){button(document.querySelector('#portalHoursForm')?.closest('.panel')?.querySelector('.panel-head'),'Početak, kraj i pauze','day','attendanceDayButton');button(document.querySelector('#portalHoursRows')?.closest('.panel')?.querySelector('.panel-head'),'Izvoz PDF / Excel','hours','attendanceHoursExportButton');button(document.querySelector('#employeeVacations .panel-head'),'Izvoz odmora','absences','attendanceAbsenceExportButton');}
    else{button(document.querySelector('#employeeWorkForm')?.closest('.panel')?.querySelector('.panel-head'),'Početak, kraj i pauze','day','attendanceDayButton');button(document.querySelector('#employeeWorkRows')?.closest('.panel')?.querySelector('.panel-head'),'Izvoz PDF / Excel','hours','attendanceHoursExportButton');if(/employees-absences/.test(location.pathname))button(document.querySelector('#employeeAbsenceRequestRows')?.closest('.panel')?.querySelector('.panel-head')||document.querySelector('#employees > .panel-head'),'Izvoz odmora','absences','attendanceAbsenceExportButton');}
  }
  mount();document.addEventListener('DOMContentLoaded',mount,{once:true});
})();
