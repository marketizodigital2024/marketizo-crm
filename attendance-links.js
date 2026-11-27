(function(){'use strict';
  const employee=/employee-login/.test(location.pathname),url='/attendance'+(employee?'?portal=employee':'');
  const link=document.createElement('a');link.href=url;link.className='secondary-button';link.textContent='Početak / kraj rada · PDF i Excel';
  const mount=()=>{const target=employee?document.getElementById('employeeHours'):document.querySelector('main')||document.querySelector('.main-content')||document.getElementById('pageTitle')?.parentElement;if(target&&!document.getElementById('attendanceLink')){link.id='attendanceLink';target.prepend(link);return true;}return false;};
  if(!mount()){document.addEventListener('DOMContentLoaded',mount,{once:true});}
})();
