/* Weekly client review: isolated report API, scoped drafts, no work-log writes. */
(() => {
  let revision = 0;
  let reports = [], busy = false, saving = false, lastEnsure = 0, lastRead = 0, loadedActor = '', sourceError = '', assignmentPreview = [], assignmentSyncedAt = '';
  const el = id => document.getElementById(id);
  const escape = value => escapePortalText(String(value || ''));
  const draftKey = report => `marketizoClientWeekly:${activeEmployee?.id}:${report.id}`;
  const ownPending = () => reports.filter(r => r.employeeId === activeEmployee?.id && !r.submittedAt).sort((a, b) => a.date.localeCompare(b.date))[0];
  const receivedUnread = () => reports.filter(r => r.recipientId === activeEmployee?.id && r.submittedAt && !r.acknowledgedAt).sort((a, b) => a.date.localeCompare(b.date))[0];
  async function request(body) {
    const controller = new AbortController(), timer = window.setTimeout(() => controller.abort(), 28000);
    try {
      const response = await fetch('/api/client-weekly-report', { method: body ? 'POST' : 'GET', headers: { ...employeeApiHeaders(), ...(body ? { 'Content-Type': 'application/json' } : {}) }, cache: 'no-store', signal: controller.signal, ...(body ? { body: JSON.stringify(body) } : {}) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || 'Izveštaji nisu dostupni.');
      return result;
    } finally { window.clearTimeout(timer); }
  }
  function collect(form, report) {
    return report.clients.map((client, index) => ({ clientId: client.clientId, ...Object.fromEntries(['positive', 'negative', 'help'].map(field => [field, form.elements[`${field}-${index}`]?.value || ''])) }));
  }
  function saveDraft() {
    const form = el('clientWeeklyForm'), report = reports.find(r => r.id === form?.dataset.reportId && r.employeeId === activeEmployee?.id);
    if (!report) return;
    try { localStorage.setItem(draftKey(report), JSON.stringify(collect(form, report))); } catch { el('clientWeeklyFormStatus').textContent = 'Nacrt nije sačuvan na uređaju. Ostavi ovaj prozor otvoren do slanja.'; }
  }
  function answerHtml(report) {
    return report.clients.map(client => {
      const answer = (report.clientAnswers || []).find(a => a.clientId === client.clientId) || {};
      return `<section class="client-weekly-card"><h3>${escape(client.clientName)}</h3><p><strong>Šta je pozitivno?</strong><br>${escape(answer.positive)}</p><p><strong>Šta je negativno?</strong><br>${escape(answer.negative)}</p><p><strong>Da li treba pomoć?</strong><br>${escape(answer.help)}</p></section>`;
    }).join('');
  }
  function renderHistory() {
    const panel = el('clientWeeklyLeaderPanel'); if (!panel) return;
    panel.hidden = !activeEmployee?.isLeader;
    if (!activeEmployee?.isLeader) return;
    const team = reports.filter(r => r.recipientId === activeEmployee.id || (['emp-miljan', 'emp-ivana'].includes(activeEmployee.id) && r.employeeId !== activeEmployee.id));
    const select = el('clientWeeklyPeriod'), previous = select.value;
    const periods = [...new Set(team.map(r => r.periodStart))].sort().reverse();
    select.innerHTML = periods.map(period => `<option value="${escape(period)}">${escape(formatDate(period))}–${escape(formatDate(team.find(r => r.periodStart === period).periodEnd))}</option>`).join('');
    if (periods.includes(previous)) select.value = previous;
    const visible = team.filter(r => r.periodStart === select.value);
    const submitted = visible.filter(r => r.submittedAt).length;
    el('clientWeeklyTeamStatus').textContent = team.length ? `${submitted}/${visible.length} izveštaja popunjeno · ${visible.filter(r => !r.submittedAt).length} čeka odgovor` : 'Prvi izveštaji stižu od ponedeljka u 12h. Izvor: ClickUp raspodela klijenata.';
    el('clientWeeklyAssignmentStatus').textContent = assignmentSyncedAt ? `ClickUp raspodela proverena: ${new Date(assignmentSyncedAt).toLocaleString('sr-RS')}. Merodavna su osnovna polja (Scenarista, Editor, SMM…).` : 'Proveravamo ClickUp raspodelu…';
    el('clientWeeklyAssignmentList').innerHTML = assignmentPreview.filter(e => e.clients.length).map(e => `<details class="client-weekly-card"><summary>${escape(e.employeeName)} · ${e.clients.length} klijenata</summary><p>${e.clients.map(c => escape(c.clientName)).join(' · ')}</p></details>`).join('');
    const grouped = new Map();
    for (const report of visible) for (const client of report.clients) {
      if (!grouped.has(client.clientId)) grouped.set(client.clientId, { name: client.clientName, rows: [] });
      const answer = (report.clientAnswers || []).find(a => a.clientId === client.clientId);
      grouped.get(client.clientId).rows.push(`<section class="client-weekly-person"><h4>${escape(report.employeeName)} · ${escape(client.roles.join(', '))}</h4>${answer ? `<p><strong>Pozitivno:</strong> ${escape(answer.positive)}</p><p><strong>Negativno:</strong> ${escape(answer.negative)}</p><p><strong>Pomoć:</strong> ${escape(answer.help)}</p><p class="muted">${report.acknowledgedAt ? 'Pročitano' : 'Popunjeno · čeka čitanje'}</p>` : '<p class="muted">Čeka odgovor zaposlenog.</p>'}</section>`);
    }
    el('clientWeeklyTeamList').innerHTML = [...grouped.values()].sort((a,b) => a.name.localeCompare(b.name, 'sr')).map(group => `<details class="client-weekly-card"><summary><strong>${escape(group.name)}</strong></summary>${group.rows.join('')}</details>`).join('');
  }
  function render() {
    if (loadedActor !== activeEmployee?.id) {
      for (const id of ['clientWeeklyDialog', 'clientWeeklyReadDialog']) if (el(id)?.open) el(id).close();
      el('clientWeeklyNotice').hidden = true;
      el('clientWeeklyLeaderPanel').hidden = true;
      return;
    }
    renderHistory();
    const notice = el('clientWeeklyNotice');
    const pending = ownPending();
    notice.hidden = !pending && !sourceError;
    notice.textContent = sourceError ? `Pregled klijenata: ${sourceError} Pokušaćemo ponovo; spisak nije označen kao prazan.` : pending ? `Obavezno: pregled klijenata za ${formatDate(pending.periodStart)}–${formatDate(pending.periodEnd)}. Popuni do kraja radnog vremena u ponedeljak; ako je rok prošao, popuni sada.` : '';
    if (saving || document.querySelector('dialog[open]')) return;
    if (pending) {
      const form = el('clientWeeklyForm');
      if (form.dataset.reportId !== pending.id || form.dataset.actorId !== activeEmployee.id) {
        form.dataset.reportId = pending.id; form.dataset.actorId = activeEmployee.id;
        el('clientWeeklyPeriodLabel').textContent = `${formatDate(pending.periodStart)}–${formatDate(pending.periodEnd)} · stanje raspodele: ${new Date(pending.assignmentSyncedAt).toLocaleString('sr-RS')}`;
        el('clientWeeklyFields').innerHTML = pending.clients.map((client, index) => `<section class="client-weekly-card"><h3>${escape(client.clientName)}</h3>${[['positive', 'Šta je pozitivno?'], ['negative', 'Šta je negativno?'], ['help', 'Da li ti treba pomoć sa nečim?']].map(([field,label]) => `<label>${label}<textarea name="${field}-${index}" rows="2" maxlength="1600" required placeholder="Kratak odgovor je dovoljan."></textarea></label>`).join('')}</section>`).join('');
        try {
          const draft = JSON.parse(localStorage.getItem(draftKey(pending)) || '[]');
          pending.clients.forEach((client, index) => { const answer = draft.find(a => a.clientId === client.clientId); for (const field of ['positive','negative','help']) if (answer) form.elements[`${field}-${index}`].value = answer[field] || ''; });
        } catch { /* Keep the blank form usable if local draft storage is unavailable. */ }
        el('clientWeeklyFormStatus').textContent = '';
      }
      el('clientWeeklyDialog').showModal();
    } else {
      const unread = receivedUnread();
      if (unread) {
        const dialog = el('clientWeeklyReadDialog'); dialog.dataset.reportId = unread.id;
        el('clientWeeklyReadTitle').textContent = `${unread.employeeName} · pregled klijenata`;
        el('clientWeeklyReadPeriod').textContent = `${formatDate(unread.periodStart)}–${formatDate(unread.periodEnd)}`;
        el('clientWeeklyReadContent').innerHTML = answerHtml(unread);
        dialog.showModal();
      }
    }
  }
  async function refresh(force = false) {
    if (!activeEmployee?.id || busy || saving || document.hidden) return;
    const actor = activeEmployee.id;
    if (loadedActor !== actor) { reports = []; assignmentPreview = []; assignmentSyncedAt = ''; loadedActor = actor; lastEnsure = lastRead = 0; sourceError = ''; }
    if (!force && Date.now() - lastRead < 30000) return render();
    if (document.activeElement?.matches?.('input,textarea,select,[contenteditable="true"]')) return;
    busy = true;
    const readRevision = revision;
    try {
      const result = await request();
      if (activeEmployee?.id !== actor || saving || revision !== readRevision) return;
      reports = result.reports; lastRead = Date.now();
      if (Date.now() - lastEnsure > 300000) {
        try {
          const ensured = await request({ action: 'ensure' });
          if (activeEmployee?.id !== actor || saving || revision !== readRevision) return;
          reports = ensured.reports; assignmentPreview = ensured.assignmentPreview || []; assignmentSyncedAt = ensured.syncedAt || ''; lastEnsure = Date.now(); sourceError = '';
        } catch (error) { sourceError = error.message; }
      }
      render();
    } catch (error) { sourceError = error.name === 'AbortError' ? 'Veza nije odgovorila na vreme.' : error.message; render(); }
    finally { busy = false; }
  }
  el('clientWeeklyForm').addEventListener('input', saveDraft);
  el('clientWeeklyForm').addEventListener('submit', async event => {
    event.preventDefault(); if (saving) return;
    const form = event.currentTarget, actor = activeEmployee?.id;
    const report = reports.find(r => r.id === form.dataset.reportId && r.employeeId === actor);
    if (!report || !form.reportValidity()) return;
    saveDraft(); revision += 1; saving = true; form.dataset.saving = 'true'; form.inert = true;
    const button = el('clientWeeklySubmit'); button.disabled = true; button.textContent = 'Slanje…';
    try {
      const result = await request({ action: 'submit', reportId: report.id, answers: collect(form, report) });
      if (activeEmployee?.id !== actor) return;
      if (!result.report?.submittedAt || result.report.id !== report.id) throw new Error('Slanje nije potvrđeno. Pokušaj ponovo.');
      reports = result.reports;
      try { localStorage.removeItem(draftKey(report)); } catch {}
      el('clientWeeklyDialog').close(); form.dataset.reportId = ''; form.reset();
    } catch (error) { el('clientWeeklyFormStatus').textContent = `Nije poslato. Odgovori su zadržani. ${error.message}`; }
    finally { revision += 1; saving = false; delete form.dataset.saving; form.inert = false; button.disabled = false; button.textContent = 'Pošalji lideru'; render(); }
  });
  el('clientWeeklyReadAck').addEventListener('click', async () => {
    if (saving) return;
    const dialog = el('clientWeeklyReadDialog'), id = dialog.dataset.reportId, actor = activeEmployee?.id, button = el('clientWeeklyReadAck');
    revision += 1; saving = true; button.disabled = true; button.textContent = 'Čuvanje potvrde…';
    try {
      const result = await request({ action: 'acknowledge', reportId: id });
      if (activeEmployee?.id !== actor) return;
      if (result.report?.id !== id || !result.report.acknowledgedAt) throw new Error('Potvrda nije sačuvana.');
      reports = result.reports; dialog.close();
    } catch (error) { showToast('Nije potvrđeno', error.message, 'danger'); }
    finally { revision += 1; saving = false; button.disabled = false; button.textContent = 'Pročitao/la sam izveštaj'; render(); }
  });
  for (const id of ['clientWeeklyDialog', 'clientWeeklyReadDialog']) {
    el(id).addEventListener('cancel', event => event.preventDefault());
    el(id).addEventListener('close', () => window.setTimeout(render, 0));
  }
  el('clientWeeklyPeriod').addEventListener('change', renderHistory);
  window.setInterval(() => { if (!activeEmployee) return; render(); refresh(); }, 10000);
  window.addEventListener('focus', () => refresh(true));
  refresh();
})();
