(async function(){'use strict';
  const $=id=>document.getElementById(id),filters=$('attendanceFilters'),form=$('attendanceForm'),employeeMode=new URLSearchParams(location.search).get('portal')==='employee';
  const now=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Vienna',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  filters.elements.from.value=now.slice(0,7)+'-01';filters.elements.to.value=now;form.elements.date.value=now;form.elements.date.max=now;
  $('attendanceBack').href=employeeMode?'/employee-login#employeeHours':'/employees-hours#work/history';
  let report=null,revision=null,saving=false;
  function message(text,error=false){$('attendanceMessage').textContent=text;$('attendanceMessage').dataset.error=String(error);}
  function session(){try{return JSON.parse(localStorage.getItem(employeeMode?'marketizoEmployeeSession':'marketizoAdminSession')||'null');}catch{return null;}}
  function headers(){const s=session();if(!s?.token||Number(s.expiresAt||0)<=Date.now())throw Error('Sesija je istekla. Vratite se u CRM i prijavite se.');return{Authorization:`Bearer ${s.token}`,'Content-Type':'application/json'};}
  async function request(params={},options={}){const r=await fetch('/api/attendance?'+new URLSearchParams(params),{cache:'no-store',...options,headers:headers()});if(!r.ok){let d;try{d=await r.json();}catch{}throw Error(d?.error||'Zahtev nije uspeo.');}return r;}
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cells=row=>'<tr>'+row.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>';
  function params(){return Object.fromEntries(new FormData(filters));}
  function addBreak(value={}){const row=document.createElement('div');row.className='break-row';row.innerHTML='<label>Početak pauze<input data-break-start type="datetime-local" required></label><label>Kraj pauze<input data-break-end type="datetime-local" required></label><button type="button">Ukloni pauzu</button>';row.querySelector('[data-break-start]').value=value.start||'';row.querySelector('[data-break-end]').value=value.end||'';row.querySelector('button').addEventListener('click',()=>row.remove());$('attendanceBreaks').append(row);}
  function reset(){form.reset();form.elements.date.value=now;form.elements.employeeId.value=filters.elements.employeeId.value||session()?.employeeId||report?.employees?.[0]?.id||'';$('attendanceBreaks').replaceChildren();revision=null;}
  function loadRecord(employeeId,date){const record=report.records.find(r=>r.employeeId===employeeId&&r.date===date);reset();form.elements.employeeId.value=employeeId;form.elements.date.value=date;
    if(record){form.elements.start.value=record.start;form.elements.end.value=record.end;form.elements.note.value=record.note;record.breaks.forEach(addBreak);revision=record.revision;message('Učitana evidencija. Prethodna verzija će ostati sačuvana pri izmeni.');}else message('Nema početka i kraja za ovaj dan. Unesite samo stvarna, poznata vremena.');form.scrollIntoView({behavior:'smooth'});}
  function syncRevision(){const r=report?.records.find(r=>r.employeeId===form.elements.employeeId.value&&r.date===form.elements.date.value);if(r)loadRecord(r.employeeId,r.date);else{revision=null;form.elements.start.value='';form.elements.end.value='';form.elements.note.value='';form.elements.confirmed.checked=false;$('attendanceBreaks').replaceChildren();}}
  async function refresh(){const data=await(await request(params())).json();report=data;
    if(!$('attendanceEmployee').options.length){const options=data.employees.map(e=>`<option value="${esc(e.id)}">${esc(e.name)}</option>`).join('');$('attendanceEmployee').innerHTML=(data.canSelectEmployee?'<option value="">Svi zaposleni</option>':'')+options;$('attendanceFormEmployee').innerHTML=options;reset();}
    $('attendanceRows').innerHTML=data.hours.map(row=>{const employee=data.employees.find(e=>e.name===row[0]);return '<tr>'+[row[0],row[1],row[2],row[3],row[4],row[7],row[8],row[11]].map(v=>'<td>'+esc(v)+'</td>').join('')+`<td>${employee?`<button type="button" data-edit-person="${esc(employee.id)}" data-edit-date="${esc(row[1])}">Unesi / izmeni</button>`:''}</td></tr>`;}).join('')||'<tr><td colspan="9">Nema zapisa u periodu.</td></tr>';
    $('attendanceRows').querySelectorAll('[data-edit-person]').forEach(b=>b.addEventListener('click',()=>loadRecord(b.dataset.editPerson,b.dataset.editDate)));
    $('attendanceAbsences').innerHTML=data.absences.map(cells).join('')||'<tr><td colspan="6">Nema odsustava.</td></tr>';$('attendanceVacation').innerHTML=data.vacations.map(cells).join('');message('Podaci su učitani. Pregled i izvoz ne menjaju postojeće podatke.');
  }
  filters.addEventListener('submit',e=>{e.preventDefault();refresh().catch(e=>message(e.message,true));});
  $('attendanceAddBreak').addEventListener('click',()=>{if($('attendanceBreaks').children.length<12)addBreak();});$('attendanceReset').addEventListener('click',reset);
  form.elements.date.addEventListener('change',syncRevision);form.elements.employeeId.addEventListener('change',syncRevision);
  form.addEventListener('submit',async e=>{e.preventDefault();if(saving)return;saving=true;$('attendanceSave').disabled=true;
    const body=Object.fromEntries(new FormData(form));body.revision=revision;body.breaks=[...$('attendanceBreaks').children].map(row=>({start:row.querySelector('[data-break-start]').value,end:row.querySelector('[data-break-end]').value}));
    try{const saved=await(await request({}, {method:'POST',body:JSON.stringify(body)})).json();revision=saved.record.revision;await refresh();message('Sačuvano u online bazi. Postojeće aktivnosti, odmori i saldo nisu menjani.');}
    catch(e){message(e.message,true);}finally{saving=false;$('attendanceSave').disabled=false;}
  });
  document.querySelectorAll('[data-format]').forEach(button=>button.addEventListener('click',async()=>{button.disabled=true;try{const r=await request({...params(),type:button.dataset.report,format:button.dataset.format}),blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=/filename="([^"]+)"/.exec(r.headers.get('Content-Disposition')||'')?.[1]||'marketizo-izvoz.'+button.dataset.format;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);message('Izveštaj je preuzet.');}catch(e){message(e.message,true);}finally{button.disabled=false;}}));
  try{await refresh();}catch(e){message(e.message,true);}
})();
