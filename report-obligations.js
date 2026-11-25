/* Confirmed report obligations; no writes to work logs, balances or client data. */
(() => {
  const el=id=>document.getElementById(id), esc=value=>escapePortalText(String(value||''));
  const names={daily:'Dnevni izveštaj',weekly:'Nedeljni izveštaj zaposlenog',clients:'Nedeljni pregled klijenata'};
  const kind=r=>r.isClientWeeklyReport?'clients':r.isWeeklyQuestionnaire?'weekly':r.isFinalDailyReport?'daily':'';
  const done=r=>kind(r)==='daily'?r.isAutomaticRollup!==true&&Boolean(r.note&&r.positive&&r.negative&&r.help):Boolean(r.submittedAt);
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase();
  let data=null,busy=false,actor='',last=0,lockedId='',allowTime='',currentCategory='daily';
  function own(){return data && activeEmployee && data.actorId===activeEmployee.id?(data.pending||[]).filter(x=>x.employeeId===activeEmployee.id):[];}
  function title(task){return `${names[task.kind]} · ${formatDate(task.periodStart)}${task.periodEnd!==task.periodStart?' – '+formatDate(task.periodEnd):''}`;}
  function overdue(){return own().filter(x=>x.overdue);}
  function required(id){return overdue().some(x=>x.id===id);}
  function renderList(){
    const panel=el('reportObligationsPanel');if(!panel)return;
    const items=own();panel.hidden=!items.length;
    el('reportObligationList').innerHTML=items.map(t=>`<div class="report-obligation-row"><div><strong>${esc(title(t))}</strong><p>Rok: ${esc(formatDate(t.dueDate))} u ${esc(t.dueTime)} · ${t.overdue?'Kasni':'Čeka popunjavanje'}</p></div><button class="${t.overdue?'primary':'secondary'}-button" type="button" data-obligation-id="${esc(t.id)}">Popuni</button></div>`).join('');
    renderLeader();
  }
  function renderLeader(){
    const panel=el('leaderObligationsPanel');if(!panel)return;
    panel.hidden=!activeEmployee?.isLeader||data?.actorId!==activeEmployee?.id;
    if(panel.hidden)return;
    const person=el('leaderLiveReportEmployee')?.value||'',status=el('reportStatusFilter').value;
    const from=el('reportFromDate').value,to=el('reportToDate').value,search=norm(el('reportSearch')?.value);
    const pending=new Map(data.pending.map(t=>[t.id,t]));
    const rows=data.reports.filter(r=>r.employeeId!==activeEmployee.id && kind(r)===currentCategory).map(r=>{
      const task=pending.get(r.id),name=data.people.find(e=>e.id===r.employeeId)?.name||'Zaposleni';
      const submitted=done(r),read=Boolean(r.acknowledgedByViewer?.[activeEmployee.id]||(r.acknowledgedBy===activeEmployee.id&&r.acknowledgedAt));
      const label=submitted?(read?'Pročitan':'Poslat'):task?(task.overdue?'Kasni':'Čeka popunjavanje'):'Stara evidencija / bez obaveze';
      const start=r.periodStart||r.weekKey||r.date,end=r.periodEnd||(r.isWeeklyQuestionnaire?addDays(start,6):start);
      return {r,task,name,submitted,read,label,start,end};
    }).filter(x=>(!person||x.r.employeeId===person)&&(!from||x.end>=from)&&(!to||x.start<=to)&&(!search||norm([x.name,x.r.note,...(x.r.clients||[]).map(c=>c.clientName)].join(' ')).includes(search))&&(!status||(status==='late'&&x.task?.overdue)||(status==='pending'&&x.task&&!x.task.overdue)||(status==='sent'&&x.submitted&&!x.read)||(status==='read'&&x.read))).sort((a,b)=>b.start.localeCompare(a.start)||a.name.localeCompare(b.name,'sr'));
    el('leaderObligationsSummary').textContent=`${names[currentCategory]} · ${rows.length} izveštaja · ${rows.filter(x=>x.task?.overdue).length} kasni`;
    el('leaderObligationList').innerHTML=rows.map(x=>`<div class="report-obligation-row"><div><strong>${esc(x.name)}</strong><p>${esc(formatDate(x.start))} – ${esc(formatDate(x.end))} · <b>${esc(x.label)}</b>${x.task?' · rok '+esc(formatDate(x.task.dueDate))+' '+esc(x.task.dueTime):''}</p></div></div>`).join('')||'<p class="muted">Nema izveštaja za izabrane filtere.</p>';
  }
  function enforce(){
    if(!activeEmployee||data?.actorId!==activeEmployee.id||document.hidden)return;
    const task=overdue()[0];
    if(!task){lockedId='';allowTime='';el('reportTimeRequirement').hidden=true;if(el('reportGateDialog').open)el('reportGateDialog').close();return;}
    lockedId=task.id;
    if(allowTime===task.id&&task.needsTime&&loggedMinutesForDate(task.periodStart)<=0)return;
    if(document.querySelector('form[data-saving="true"], form[data-work-saving="true"]'))return;
    const open=document.querySelector('dialog[open]');
    if(open){
      if(open.id==='dailyReportDialog'&&el('dailyReportForm').dataset.reportDate===task.periodStart&&task.kind==='daily'){
        open.dataset.required='true';el('closeDailyReportDialog').hidden=true;el('dailyReportLater').hidden=true;return;
      }
      if(open.id==='weeklyQuestionnaireDialog'&&el('weeklyQuestionnaireForm').dataset.reportId===task.id){el('weeklyQuestionnaireLater').hidden=true;return;}
      if(open.id==='clientWeeklyDialog'&&el('clientWeeklyForm').dataset.reportId===task.id){el('clientWeeklyLater').hidden=true;return;}
      // Do not discard drafts or interrupt a form already being edited. Navigation is still gated.
      return;
    }
    el('reportGateTitle').textContent=title(task);
    el('reportGateDescription').textContent=`Rok je bio ${formatDate(task.dueDate)} u ${task.dueTime}. Popuni ovaj izveštaj da nastaviš. Preostalo dospelih izveštaja: ${overdue().length}.`;
    el('reportGateOpen').textContent=task.needsTime?'Prvo upiši vreme za taj dan':'Popuni izveštaj';
    el('reportGateDialog').showModal();
  }
  function openTask(id){
    const task=own().find(t=>t.id===id);if(!task)return;
    if(el('reportGateDialog').open)el('reportGateDialog').close();
    if(task.kind==='daily'&&task.needsTime&&loggedMinutesForDate(task.periodStart)<=0){
      allowTime=id;document.querySelector('[data-employee-tab="employeeHours"]')?.click();
      const field=el('portalHoursForm').elements.date;field.value=task.periodStart;field.dispatchEvent(new Event('change',{bubbles:true}));
      el('reportTimeRequirement').hidden=false;el('reportTimeRequirement').textContent=`Upiši vreme za ${formatDate(task.periodStart)}, zatim popuni dnevni izveštaj. Ostali delovi portala dostupni su nakon slanja dospelih izveštaja.`;
      return;
    }
    if(task.kind==='daily'){openDailyReportDialog(task.periodStart);enforce();return;}
    if(task.kind==='weekly'){
      const form=el('weeklyQuestionnaireForm');saveWeeklyDraft(form);
      if(form.dataset.reportId!==id){form.reset();form.dataset.reportId=id;try{const draft=JSON.parse(localStorage.getItem(weeklyDraftKey(id))||'[]');[1,2,3,4,5].forEach(i=>form.elements['answer'+i].value=draft[i-1]||'');}catch{}}
      el('weeklyQuestionnaireDeadline').textContent=`${title(task)}. Rok: ${formatDate(task.dueDate)} u ${task.dueTime}. Svih pet odgovora je obavezno.`;
      el('weeklyQuestionnaireLater').hidden=required(id);el('weeklyQuestionnaireDialog').showModal();return;
    }
    window.MarketizoClientReports?.open(id);
  }
  async function refresh(force=false){
    if(!activeEmployee?.id||document.hidden||busy||(!force&&Date.now()-last<30000))return;
    if(document.querySelector('form[data-saving="true"], form[data-work-saving="true"]'))return;
    const id=activeEmployee.id;busy=true;
    const controller=new AbortController(),timer=window.setTimeout(()=>controller.abort(),25000);
    try{
      const response=await fetch('/api/report-obligations',{method:'POST',headers:employeeApiHeaders(),cache:'no-store',signal:controller.signal});
      const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||'Provera nije uspela.');
      if(activeEmployee?.id!==id)return;
      if(result.actorId!==id){el('reportObligationError').hidden=false;el('reportObligationError').textContent='Sesija u drugom tabu je promenjena. Sačuvaj nacrt i osveži portal pre nastavka.';return;}
      actor=id;data=result;last=Date.now();el('reportObligationError').hidden=true;
      renderList();enforce();
    }catch(error){el('reportObligationError').hidden=false;el('reportObligationError').textContent='Provera izveštaja trenutno nije uspela. Odgovori ostaju u formularu. Pokušaćemo ponovo.';enforce();}
    finally{busy=false;window.clearTimeout(timer);}
  }
  function syncActor(){
    if(actor===activeEmployee?.id)return;
    data=null;actor=activeEmployee?.id||'';last=0;lockedId='';allowTime='';
    el('reportObligationsPanel').hidden=true;el('reportObligationList').innerHTML='';el('leaderObligationsPanel').hidden=true;
    el('reportTimeRequirement').hidden=true;el('reportObligationError').hidden=true;
    if(el('reportGateDialog').open)el('reportGateDialog').close();
  }
  window.MarketizoReportGate={refresh,required,openTask,pending:own,syncActor};
  el('reportGateOpen').addEventListener('click',()=>openTask(overdue()[0]?.id));
  el('reportGateLogout').addEventListener('click',()=>{data=null;actor='';lockedId='';allowTime='';el('reportGateDialog').close();document.getElementById('logoutEmployee').click();});
  el('reportGateDialog').addEventListener('cancel',event=>event.preventDefault());
  el('reportObligationList').addEventListener('click',event=>{const id=event.target.closest('[data-obligation-id]')?.dataset.obligationId;if(id)openTask(id);});
  document.addEventListener('click',event=>{
    if(!overdue().length||event.target.closest('dialog'))return;
    const nav=event.target.closest('[data-employee-tab], a, #logoutEmployee');
    if(!nav||nav.id==='logoutEmployee'||(allowTime&&nav.dataset.employeeTab==='employeeHours'))return;
    event.preventDefault();event.stopImmediatePropagation();allowTime='';enforce();
  },true);
  for(const id of ['reportStatusFilter','reportFromDate','reportToDate'])el(id).addEventListener('change',renderLeader);
  el('reportSearch')?.addEventListener('input',renderLeader);el('leaderLiveReportEmployee')?.addEventListener('change',renderLeader);
  document.querySelectorAll('[data-report-view]').forEach(button=>button.addEventListener('click',()=>{currentCategory=button.dataset.reportView;renderLeader();}));
  window.setInterval(()=>{if(actor!==activeEmployee?.id)syncActor();refresh();enforce();},5000);
  window.addEventListener('focus',()=>refresh(true));
  refresh();
})();
