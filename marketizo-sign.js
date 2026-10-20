'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const categories = { clients: 'Klijenti', employees: 'Zaposleni', nda: 'NDA', annexes: 'Aneksi', other: 'Ostalo' };
  const statuses = { draft: 'Nacrt', ready: 'Zaključana verzija', sent: 'Poslat', viewed: 'Pregledan', signing: 'Potpisivanje', signed: 'Potpisan', declined: 'Odbijen', expired: 'Istekao', voided: 'Poništen' };
  let deliveryMode = 'email';
  let dossierRows = [], dossierOffset = 0, selectedDossier = null, newDossierId = null;
  let people = [], templates = [], current = null, library = 'documents', offset = 0, hasMore = false;
  let preparedSha = '', sendingEnabled = false, sendPending = null;
  let dirty = false, busy = false, loading = 0, pending = null, previewUrl = null, searchTimer;
  const blank = () => ({ title: '', category: 'clients', content: { version: 1, blocks: [{ type: 'paragraph', level: 1, runs: [{ text: '', bold: false, italic: false, underline: false }] }] }, recipients: [], contractDetails: { audience: 'client', place: '', startDate: '' }, governingLaw: 'AT', signatureMethod: 'ses', legalReview: 'pending', note: '' });
  function node(tag, value, attrs = {}) { const n = document.createElement(tag); if (value !== null) n.textContent = value; Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v)); return n; }
  function message(value, error = false) { $('signMessage').textContent = value; $('signMessage').classList.toggle('error', error); }
  function session() { try { const s = JSON.parse(localStorage.getItem('marketizoAdminSession') || 'null'); return s?.token && s.expiresAt > Date.now() ? s : null; } catch { return null; } }
  async function api(params, body, raw = false) {
    const s = session(); if (!s) { location.assign('/admin-login'); throw Error('Prijava je istekla.'); }
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 90000);
    try {
      const response = await fetch('/api/sign-admin?' + new URLSearchParams(params), { method: body ? 'POST' : 'GET', cache: 'no-store', signal: controller.signal, headers: { Authorization: 'Bearer ' + s.token, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      if (raw && response.ok) return response.text();
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw Error(result.error || 'Zahtev nije potvrđen. Pokušaj ponovo.');
      return result;
    } catch (e) { if (e.name === 'AbortError') throw Error('Potvrda traje predugo. Unos je zadržan; ponovi istu radnju za proveru čuvanja.'); throw e; }
    finally { clearTimeout(timer); }
  }
  function setDirty(value = true) { dirty = value; $('dirtyLabel').textContent = value ? 'Nesačuvane izmene' : 'Izmene su sačuvane'; }
  function writable() { return current && current.status === 'draft' && !current.archived_at; }
  function updateControls() {
    const editable = writable();
    $('documentTitle').disabled = !editable || busy; $('documentCategory').disabled = !editable || busy; $('documentNote').disabled = !editable || busy; $('documentSignatureMethod').disabled = !editable || busy;
    document.querySelectorAll('#dossierDetails input, #dossierDetails select, #contractDetails input, #contractDetails select').forEach(el => el.disabled = !editable || busy);
    $('dossierDetails').hidden = current?.kind === 'template';
    $('newAnnex').disabled = busy || dirty || !current?.revision || !current?.data.dossier || !!current?.data.parentDocumentId || !!current?.archived_at;
    $('contractEditor').contentEditable = String(editable && !busy);
    document.querySelectorAll('.sign-toolbar button, #recipientRows input, #recipientRows select, #recipientRows button').forEach(el => el.disabled = !editable || busy);
    ['saveDocument', 'addRecipient', 'applyTemplate', 'templateSelect'].forEach(id => $(id).disabled = !editable || busy);
    $('freezeDocument').disabled = !editable || busy || current?.kind === 'template' || !current?.revision;
    $('previewDocument').disabled = busy || dirty || !current?.revision;
    $('showAudit').disabled = busy || !current?.revision;
    $('archiveDocument').disabled = busy || !current?.revision;
    $('saveAsTemplate').disabled = busy;
    $('duplicateDocument').disabled = busy;
    $('backToLibrary').disabled = busy;
    $('recipientsSection').hidden = current?.kind === 'template';
    $('revisionLabel').textContent = current?.revision ? `${current.kind === 'template' ? 'Šablon' : statuses[current.status] || current.status} · verzija ${current.revision}` : 'Novi nacrt';
    $('saveDocument').textContent = current?.kind === 'template' ? 'Sačuvaj šablon' : 'Sačuvaj nacrt';
    $('archiveDocument').textContent = current?.archived_at ? 'Vrati iz arhive' : 'Arhiviraj';
    $('previewPdf').disabled = busy || current?.kind === 'template' || current?.status !== 'ready';
    $('sendDocument').disabled = busy || !sendingEnabled || !preparedSha || current?.status !== 'ready' || current?.data.signatureMethod !== 'ses';
    $('generateLink').disabled = $('sendDocument').disabled;
    $('sendDocument').textContent = current?.data.signatureMethod === 'qes' ? 'Kvalifikovani potpis · poseban postupak' : 'Pošalji e-mail';
    $('downloadReceipt').disabled = busy || current?.status !== 'signed';
    $('downloadEvidence').disabled = busy || current?.status !== 'signed';
    $('voidRequest').disabled = busy || !['sent', 'viewed', 'signing'].includes(current?.status);
  }
  function renderEditor(content) {
    $('contractEditor').replaceChildren();
    for (const block of content.blocks) {
      const el = node(block.type === 'heading' ? (block.level === 2 ? 'h3' : 'h2') : block.type === 'bullet' || block.type === 'ordered' ? 'li' : 'p', null);
      for (const run of block.runs) {
        let text = document.createTextNode(run.text);
        for (const [mark, tag] of [['underline', 'u'], ['italic', 'em'], ['bold', 'strong']]) if (run[mark]) { const wrapper = node(tag, null); wrapper.append(text); text = wrapper; }
        el.append(text);
      }
      if (!el.textContent) el.append(document.createElement('br'));
      if (block.type === 'bullet' || block.type === 'ordered') {
        const tag = block.type === 'bullet' ? 'ul' : 'ol', last = $('contractEditor').lastElementChild;
        const list = last?.tagName.toLowerCase() === tag ? last : node(tag, null);
        list.append(el); if (list !== last) $('contractEditor').append(list);
      }
      else $('contractEditor').append(el);
    }
  }
  function readEditor() {
    const blocks = [], skip = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'IMG', 'SVG']);
    function runsOf(root) {
      const runs = [];
      function visit(n, marks) {
        if (n.nodeType === Node.TEXT_NODE) { if (n.textContent) runs.push({ text: n.textContent, ...marks }); return; }
        if (n.nodeType !== Node.ELEMENT_NODE || skip.has(n.tagName)) return;
        if (n.tagName === 'BR') { runs.push({ text: '\n', ...marks }); return; }
        const next = { bold: marks.bold || ['B', 'STRONG'].includes(n.tagName), italic: marks.italic || ['I', 'EM'].includes(n.tagName), underline: marks.underline || n.tagName === 'U' };
        for (const c of n.childNodes) visit(c, next);
      }
      visit(root, { bold: false, italic: false, underline: false });
      return runs;
    }
    function block(n, list = '') {
      if (n.nodeType === Node.TEXT_NODE) { if (n.textContent) blocks.push({ type: 'paragraph', level: 1, runs: [{ text: n.textContent, bold: false, italic: false, underline: false }] }); return; }
      if (n.nodeType !== Node.ELEMENT_NODE || skip.has(n.tagName)) return;
      if (['UL', 'OL'].includes(n.tagName)) { for (const child of n.children) block(child, n.tagName === 'UL' ? 'bullet' : 'ordered'); return; }
      if (n.tagName === 'DIV' && [...n.children].some(c => ['P', 'DIV', 'H2', 'H3', 'UL', 'OL'].includes(c.tagName))) { for (const child of n.childNodes) block(child); return; }
      blocks.push({ type: list || (['H1', 'H2', 'H3'].includes(n.tagName) ? 'heading' : 'paragraph'), level: n.tagName === 'H3' ? 2 : 1, runs: runsOf(n) });
    }
    for (const child of $('contractEditor').childNodes) block(child);
    return { version: 1, blocks };
  }
  function field(label, name, value, attrs = {}) {
    const wrapper = node('label', label), input = node('input', null, { 'data-field': name, ...attrs }); input.value = value || ''; wrapper.append(input); return wrapper;
  }
  function recipientRow(r = {}) {
    const row = node('div', null, { class: 'sign-recipient' }), head = node('div', null, { class: 'sign-recipient-head' }), remove = node('button', 'Ukloni', { type: 'button', class: 'sign-text-button' });
    head.append(node('span', 'Potpisnik'), remove); row.append(head);
    const chooserLabel = node('label', 'Iz CRM-a ili novi primalac'), chooser = node('select', null, { 'aria-label': 'Izbor primaoca' });
    chooser.append(node('option', 'Ručni unos · novi primalac', { value: '' }));
    people.forEach((p, i) => chooser.append(node('option', `${p.name} · ${p.kind === 'client' ? 'klijent' : 'zaposleni'}`, { value: String(i) })));
    chooserLabel.append(chooser); row.append(chooserLabel);
    const roleLabel = node('label', 'Potpisuje kao / Unterzeichnet als'), role = node('select', null, { 'data-field': 'role' });
    [['counterparty', 'Druga strana / Andere Vertragspartei'], ['marketizo', 'Marketizo / Vertretung']].forEach(([v,t]) => role.append(node('option', t, { value: v }))); role.value = r.role || 'counterparty'; roleLabel.append(role); row.append(roleLabel);
    row.append(field('Ime i prezime', 'name', r.name, { maxlength: '160', autocomplete: 'off' }), field('E-mail', 'email', r.email, { type: 'email', maxlength: '254', autocomplete: 'off' }), field('Firma', 'company', r.company, { maxlength: '180' }), field('Adresa / Anschrift', 'address', r.address, { maxlength: '300' }), field('Poreski broj / Steuernummer', 'taxId', r.taxId, { maxlength: '80' }), field('Registracioni broj / Registernummer', 'registrationId', r.registrationId, { maxlength: '80' }), field('Funkcija / ovlašćenje', 'capacity', r.capacity, { maxlength: '120' }), field('Zemlja (AT, DE, US…)', 'country', r.country, { maxlength: '2', autocomplete: 'off' }));
    const typeLabel = node('label', 'Ugovorna strana'), type = node('select', null, { 'data-field': 'partyType' });
    [['business', 'Firma / B2B'], ['consumer', 'Potrošač'], ['employee', 'Zaposleni']].forEach(([v, t]) => type.append(node('option', t, { value: v }))); type.value = r.partyType || 'business'; typeLabel.append(type); row.append(typeLabel);
    chooser.addEventListener('change', () => { const p = people[Number(chooser.value)]; if (chooser.value !== '' && p) { row.querySelector('[data-field=name]').value = p.name; row.querySelector('[data-field=email]').value = p.email; row.querySelector('[data-field=company]').value = p.company || (p.kind === 'client' ? p.name : ''); type.value = p.kind === 'employee' ? 'employee' : 'business'; setDirty(); } });
    remove.addEventListener('click', () => { row.remove(); setDirty(); });
    return row;
  }
  function dossiers() {
    const unique = new Map();
    for (const row of dossierRows) if (row.dossier && !unique.has(row.dossier.id)) unique.set(row.dossier.id, row.dossier);
    if (current?.data.dossier) unique.set(current.data.dossier.id, current.data.dossier);
    return [...unique.values()];
  }
  function renderDossiers() {
    const search = $('dossierSearch').value.trim().toLocaleLowerCase();
    $('dossierCards').replaceChildren(...dossiers().filter(d => d.name.toLocaleLowerCase().includes(search)).map(d => {
      const button = node('button', `${d.name} · ${d.type === 'employee' ? 'Zaposleni' : 'Klijent'}`, { type: 'button', class: 'secondary-button', 'aria-pressed': String(selectedDossier?.id === d.id) });
      button.addEventListener('click', () => { selectedDossier = d; offset = 0; renderDossiers(); list(); }); return button;
    }));
    $('activeDossier').textContent = selectedDossier ? 'Dosije: ' + selectedDossier.name : 'Prikaz svih dokumenata';
    $('clearDossier').hidden = !selectedDossier;
  }
  async function loadDossiers(reset = false) {
    if (reset) { dossierOffset = 0; dossierRows = []; }
    const r = await api({ action: 'dossiers', offset: String(dossierOffset) });
    dossierRows.push(...r.items); dossierOffset += r.items.length; $('moreDossiers').hidden = !r.hasMore; renderDossiers();
  }
  function renderParents(value = '') {
    const id = $('documentDossier').value;
    const rows = dossierRows.filter(r => r.dossier?.id === id && !r.parentDocumentId && r.id !== current?.id);
    $('parentDocument').replaceChildren(node('option', 'Samostalan dokument / osnovni ugovor', { value: '' }), ...rows.map(r => node('option', r.title + (r.archived_at ? ' · arhiviran' : ''), { value: r.id })));
    if (value && !rows.some(r => r.id === value)) $('parentDocument').append(node('option', 'Osnovni ugovor · ' + value, { value }));
    $('parentDocument').value = value;
    $('parentDocumentLabel').replaceChildren();
    if (value) { const open = node('button', 'Otvori osnovni ugovor', { type: 'button', class: 'sign-text-button' }); open.addEventListener('click', async () => { if (!leaveAllowed()) return; try { const r = await api({ action: 'get', id: value }); openDocument(r.document); } catch (e) { message(e.message, true); } }); $('parentDocumentLabel').append(open); }
  }
  function setupDossier(dossier, parent = '') {
    newDossierId = null;
    $('documentDossier').replaceChildren(node('option', 'Bez dosijea', { value: '' }), ...dossiers().map(d => node('option', `${d.name} · ${d.type === 'employee' ? 'Zaposleni' : 'Klijent'}`, { value: d.id })), node('option', '+ Novi dosije', { value: 'new' }));
    $('documentDossier').value = dossier?.id || ''; $('newDossierFields').hidden = true; $('dossierName').value = ''; renderParents(parent);
  }
  function readDossier() {
    const id = $('documentDossier').value;
    if (id === 'new') { newDossierId ||= crypto.randomUUID(); return { id: newDossierId, name: $('dossierName').value, type: $('dossierType').value }; }
    return dossiers().find(d => d.id === id) || null;
  }
  function updateContractFields() { $('contractStartLabel').hidden = $('contractAudience').value !== 'client'; }
  $('contractAudience').addEventListener('change', updateContractFields);
  $('documentCategory').addEventListener('change', () => { $('contractAudience').value = $('documentCategory').value === 'employees' ? 'employee' : $('documentCategory').value === 'clients' ? 'client' : 'other'; updateContractFields(); });
  function readDraft() {
    return { ...blank(), dossier: current.kind === 'template' ? null : readDossier(), parentDocumentId: $('parentDocument').value || null, title: $('documentTitle').value, category: $('documentCategory').value, note: $('documentNote').value, signatureMethod: $('documentSignatureMethod').value, contractDetails: { audience: $('contractAudience').value, place: $('contractPlace').value, startDate: $('contractAudience').value === 'client' ? $('contractStartDate').value : '' }, content: readEditor(), recipients: current.kind === 'template' ? [] : [...$('recipientRows').children].map(row => Object.fromEntries([...row.querySelectorAll('[data-field]')].map(el => [el.dataset.field, el.value]))) };
  }
  function leaveAllowed() { return !dirty || confirm('Postoje nesačuvane izmene. Napustiti ovaj nacrt?'); }
  function openDocument(doc, kind = 'document', isNew = false) {
    current = { ...doc, kind }; pending = null; preparedSha = ''; sendPending = null;
    $('documentTitle').value = doc.data.title; $('documentCategory').value = doc.data.category; $('documentNote').value = doc.data.note || '';
    setupDossier(doc.data.dossier, doc.data.parentDocumentId || '');
    renderEditor(doc.data.content); $('recipientRows').replaceChildren(...doc.data.recipients.map(recipientRow));
    $('documentSignatureMethod').value = doc.data.signatureMethod || 'ses';
    $('contractAudience').value = doc.data.contractDetails?.audience === 'contractor' ? 'contractor' : doc.data.category === 'employees' || doc.data.dossier?.type === 'employee' ? 'employee' : doc.data.contractDetails?.audience || (doc.data.category === 'clients' ? 'client' : 'other');
    $('contractPlace').value = doc.data.contractDetails?.place || ''; $('contractStartDate').value = doc.data.contractDetails?.startDate || ''; updateContractFields();
    $('templateSelect').value = ''; $('workspace').hidden = false; $('library').hidden = true; setDirty(isNew); updateControls(); message('');
    $('workspace').scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  async function list() {
    const sequence = ++loading;
    const params = { action: 'list', kind: library === 'templates' || (library === 'archive' && $('archiveType').value === 'template') ? 'template' : 'document', category: $('categoryFilter').value, status: $('statusFilter').value, archived: String(library === 'archive'), search: $('signSearch').value, ...(selectedDossier && library !== 'templates' ? { dossier: selectedDossier.id } : {}), offset: String(offset) };
    $('refreshList').disabled = true;
    try {
      const r = await api(params); if (sequence !== loading) return;
      hasMore = r.hasMore; $('documentRows').replaceChildren();
      for (const doc of r.items) {
        const tr = node('tr', null), title = node('td', null), recipients = node('td', null), status = node('td', null), action = node('td', null), open = node('button', 'Otvori →', { type: 'button', class: 'sign-open', 'aria-label': 'Otvori ' + doc.title });
        title.append(node('strong', doc.title), node('small', 'Verzija ' + doc.revision)); recipients.append(node('span', doc.recipient_names || 'Još nema potpisnika'), node('small', doc.recipient_emails || ''));
        status.append(node('span', statuses[doc.status] || doc.status, { class: 'sign-status ' + doc.status }));
        open.addEventListener('click', async () => { open.disabled = true; try { const r = await api({ action: 'get', id: doc.id, kind: params.kind }); openDocument(r.document, params.kind); } catch (e) { message(e.message, true); } finally { open.disabled = false; } });
        action.append(open); tr.append(title, recipients, node('td', categories[doc.category]), status, node('td', new Date(doc.updated_at).toLocaleDateString('sr-Latn-RS', { timeZone: 'Europe/Vienna' })), action); $('documentRows').append(tr);
      }
      $('signEmpty').hidden = r.items.length !== 0;
      $('emptyText').textContent = library === 'archive' ? 'Arhivirani dokumenti će se prikazati ovde.' : 'Kreiraj prvi dokument ili promeni filtere pretrage.';
      $('previousPage').disabled = offset === 0; $('nextPage').disabled = !hasMore; $('pageLabel').textContent = r.items.length ? `${offset + 1}–${offset + r.items.length}` : '';
    } catch (e) { if (sequence === loading) { message(e.message, true); $('signEmpty').hidden = true; } }
    finally { if (sequence === loading) $('refreshList').disabled = false; }
  }
  async function loadTemplates() {
    const r = await api({ action: 'list', kind: 'template', offset: '0' }); templates = r.items;
    $('templateSelect').replaceChildren(node('option', 'Prazan dokument', { value: '' }), ...templates.map(t => node('option', t.title, { value: t.id })));
  }
  async function mutate(action, extra = {}) {
    if (!current || busy) return;
    const body = { action, kind: current.kind, id: current.id, revision: current.revision, ...extra };
    const fingerprint = JSON.stringify(body);
    if (!pending || pending.fingerprint !== fingerprint) pending = { fingerprint, commandId: crypto.randomUUID() };
    busy = true; updateControls(); message('Čekam potvrdu čuvanja…');
    try {
      const r = await api({}, { ...body, commandId: pending.commandId });
      current.revision = r.revision;
      if (action === 'save') {
        current.data = structuredClone(extra.data);
        if (current.kind !== 'template') {
          dossierRows = dossierRows.filter(r => r.id !== current.id);
          dossierRows.unshift({ id: current.id, title: current.data.title, dossier: current.data.dossier, parentDocumentId: current.data.parentDocumentId, archived_at: current.archived_at });
          setupDossier(current.data.dossier, current.data.parentDocumentId || ''); renderDossiers();
        }
      }
      if (action === 'freeze') { current.status = 'ready'; preparedSha = ''; }
      if (action === 'archive') current.archived_at = new Date().toISOString();
      if (action === 'restore') current.archived_at = null;
      pending = null; setDirty(false);
      message(action === 'freeze' ? 'Verzija je zaključana. Dokument još nije poslat niti potpisan.' : 'Izmena je potvrđena u bazi.');
      if (current.kind === 'template') await loadTemplates().catch(() => {});
      return true;
    } catch (e) { message(e.message, true); return false; }
    finally { busy = false; updateControls(); }
  }
  document.querySelectorAll('[data-new-audience]').forEach(button => button.addEventListener('click', () => {
    if (busy || !leaveAllowed()) return;
    const audience = button.dataset.newAudience;
    const data = { ...blank(), category: audience === 'client' ? 'clients' : 'employees', contractDetails: { audience, place: '', startDate: '' }, dossier: null };
    openDocument({ id: crypto.randomUUID(), revision: 0, status: 'draft', archived_at: null, data }, library === 'templates' ? 'template' : 'document', true);
  }));
  $('newDocument').addEventListener('click', () => { if (!busy && leaveAllowed()) openDocument({ id: crypto.randomUUID(), revision: 0, status: 'draft', archived_at: null, data: { ...blank(), dossier: selectedDossier } }, library === 'templates' ? 'template' : 'document', true); });
  $('backToLibrary').addEventListener('click', () => { if (leaveAllowed()) { current = null; setDirty(false); $('workspace').hidden = true; $('library').hidden = false; list(); } });
  $('saveDocument').addEventListener('click', () => mutate('save', { data: readDraft() }));
  $('freezeDocument').addEventListener('click', async () => {
    if (dirty) { message('Prvo sačuvaj izmene, pa pregledaj i zaključaj verziju.', true); return; }
    if (confirm('Zaključati ovu verziju? Tekst i potpisnici više neće moći da se menjaju. Za promene ćeš napraviti novi nacrt. Dokument se ovim ne šalje.')) await mutate('freeze');
  });
  $('archiveDocument').addEventListener('click', () => { if (dirty) return message('Prvo sačuvaj izmene.', true); mutate(current.archived_at ? 'restore' : 'archive'); });
  $('addRecipient').addEventListener('click', () => { if ($('recipientRows').children.length >= 10) return message('Dozvoljeno je najviše deset potpisnika.', true); $('recipientRows').append(recipientRow()); setDirty(); });
  $('applyTemplate').addEventListener('click', async () => {
    if (!$('templateSelect').value) return;
    if (!confirm('Zameniti tekst i naziv trenutnog nacrta izabranim šablonom?')) return;
    try { const r = await api({ action: 'get', id: $('templateSelect').value, kind: 'template' }); renderEditor(r.document.data.content); $('documentTitle').value = r.document.title; $('documentCategory').value = r.document.category; $('contractAudience').value = r.document.data.contractDetails?.audience || (r.document.category === 'employees' ? 'employee' : r.document.category === 'clients' ? 'client' : 'other'); $('contractPlace').value = r.document.data.contractDetails?.place || ''; $('contractStartDate').value = r.document.data.contractDetails?.startDate || ''; updateContractFields(); setDirty(); } catch (e) { message(e.message, true); }
  });
  function copy(kind) { const data = readDraft(); if (kind === 'template') { data.recipients = []; data.dossier = null; data.parentDocumentId = null; } data.title = (data.title || 'Novi dokument') + (kind === 'template' ? ' — šablon' : ' — kopija'); openDocument({ id: crypto.randomUUID(), revision: 0, status: 'draft', archived_at: null, data }, kind, true); }
  $('duplicateDocument').addEventListener('click', () => copy('document'));
  $('saveAsTemplate').addEventListener('click', () => { if (dirty && !confirm('Nesačuvan unos preneti u novi šablon? Original se neće promeniti.')) return; copy('template'); message('Šablon je pripremljen. Klikni „Sačuvaj šablon” da ga sačuvaš u bazi.'); });
  $('previewDocument').addEventListener('click', async () => {
    if (dirty || !current?.revision) return message('Prvo sačuvaj nacrt za pregled.', true);
    try { const html = await api({ action: 'preview', id: current.id, kind: current.kind }, null, true); if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' })); $('previewFrame').setAttribute('sandbox', ''); $('previewFrame').src = previewUrl; $('previewDialog').showModal(); } catch (e) { message(e.message, true); }
  });
  function clearPreview() { $('previewFrame').removeAttribute('src'); if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = null; }
  $('closePreview').addEventListener('click', () => $('previewDialog').close()); $('previewDialog').addEventListener('close', clearPreview);
  $('closeAudit').addEventListener('click', () => $('auditDialog').close());
  $('showAudit').addEventListener('click', async () => {
    try { const r = await api({ action: 'audit', id: current.id, kind: current.kind }), labels = { save: 'Nacrt sačuvan', freeze: 'Verzija zaključana', archive: 'Arhivirano', restore: 'Vraćeno iz arhive' };
      $('auditRows').replaceChildren(...r.events.map(e => { const li = node('li', null); li.append(node('strong', labels[e.action] || e.action), node('div', `${new Date(e.created_at).toLocaleString('sr-Latn-RS', { timeZone: 'Europe/Vienna', timeZoneName: 'short' })} · ${e.actor_id}`), node('code', 'SHA-256: ' + e.content_sha256)); return li; })); $('auditDialog').showModal();
    } catch (e) { message(e.message, true); }
  });
  $('workspace').addEventListener('input', () => { if (writable()) { setDirty(); updateControls(); } });
  $('workspace').addEventListener('change', e => { if (writable() && e.target.id !== 'templateSelect') { setDirty(); updateControls(); } });
  document.querySelectorAll('[data-edit], [data-block]').forEach(button => {
    button.addEventListener('mousedown', e => e.preventDefault());
    button.addEventListener('click', () => { if (!writable() || busy) return; $('contractEditor').focus(); document.execCommand(button.dataset.edit || 'formatBlock', false, button.dataset.block || null); setDirty(); updateControls(); });
  });
  $('contractEditor').addEventListener('paste', e => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); });
  $('contractEditor').addEventListener('drop', e => e.preventDefault());
  window.addEventListener('beforeunload', e => { if (dirty || busy) { e.preventDefault(); e.returnValue = ''; } });
  document.querySelectorAll('[data-library]').forEach(button => button.addEventListener('click', () => {
    if (busy || !leaveAllowed()) return; library = button.dataset.library; current = null; offset = 0; $('archiveTypeLabel').hidden = library !== 'archive'; setDirty(false); $('workspace').hidden = true; $('library').hidden = false;
    document.querySelectorAll('[data-library]').forEach(b => { b.classList.toggle('selected', b === button); b.setAttribute('aria-pressed', String(b === button)); }); list();
  }));
  $('documentDossier').addEventListener('change', () => { $('newDossierFields').hidden = $('documentDossier').value !== 'new'; newDossierId = null; renderParents(); });
  $('parentDocument').addEventListener('change', () => renderParents($('parentDocument').value));
  $('dossierSearch').addEventListener('input', renderDossiers);
  $('clearDossier').addEventListener('click', () => { selectedDossier = null; offset = 0; renderDossiers(); list(); });
  $('moreDossiers').addEventListener('click', async () => { $('moreDossiers').disabled = true; try { await loadDossiers(); } catch (e) { message(e.message, true); } finally { $('moreDossiers').disabled = false; } });
  $('newAnnex').addEventListener('click', () => {
    if (busy || dirty || !current?.revision || !current.data.dossier || current.data.parentDocumentId) return;
    const original = current;
    const data = { ...blank(), title: 'Aneks — ' + original.data.title, category: 'annexes', dossier: structuredClone(original.data.dossier), parentDocumentId: original.id, recipients: structuredClone(original.data.recipients), contractDetails: structuredClone(original.data.contractDetails || blank().contractDetails) };
    openDocument({ id: crypto.randomUUID(), revision: 0, status: 'draft', archived_at: null, data }, 'document', true);
  });
  $('refreshList').addEventListener('click', list);
  ['categoryFilter', 'statusFilter', 'archiveType'].forEach(id => $(id).addEventListener('change', () => { offset = 0; list(); }));
  $('signSearch').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { offset = 0; list(); }, 300); });
  $('previousPage').addEventListener('click', () => { offset = Math.max(0, offset - 40); list(); });
  $('nextPage').addEventListener('click', () => { if (hasMore) { offset += 40; list(); } });
  function pdfBlob(base64) { return new Blob([Uint8Array.from(atob(base64.replace(/\s/g, '')), c => c.charCodeAt(0))], { type: 'application/pdf' }); }
  $('previewPdf').addEventListener('click', async () => {
    if (busy || !current) return; busy = true; updateControls(); message('Priprema tačnog PDF-a…');
    try {
      const r = await api({}, { action: 'preparePdf', id: current.id, revision: current.revision }); preparedSha = r.pdfSha256;
      if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = URL.createObjectURL(pdfBlob(r.pdfBase64));
      $('previewFrame').removeAttribute('sandbox'); $('previewFrame').src = previewUrl; $('previewDialog').showModal(); message('Pripremljeni PDF je zaključan. Svi potpisnici dobijaju ovu istu verziju.');
    } catch (e) { message(e.message, true); } finally { busy = false; updateControls(); }
  });
  function deliveryDialog(mode) { if (busy || !preparedSha || !sendingEnabled) return; deliveryMode = mode; $('deliveryTitle').textContent = mode === 'link' ? 'Generisanje linkova za potpisivanje' : 'Slanje poziva e-mailom'; $('confirmSend').textContent = mode === 'link' ? 'Potvrdi i generiši linkove' : 'Potvrdi i pošalji pozive'; $('sendDialog').showModal(); }
  $('sendDocument').addEventListener('click', () => deliveryDialog('email'));
  $('generateLink').addEventListener('click', () => deliveryDialog('link'));
  $('closeLinks').addEventListener('click', () => { $('generatedLinks').replaceChildren(); $('linksDialog').close(); });
  $('closeSend').addEventListener('click', () => { if (!busy) $('sendDialog').close(); });
  $('sendDialog').addEventListener('cancel', e => { if (busy) e.preventDefault(); });
  $('sendForm').addEventListener('submit', async e => {
    e.preventDefault(); if (busy || !current || !preparedSha) return;
    const body = { action: 'send', ...(deliveryMode === 'link' ? { delivery: 'link' } : {}), id: current.id, revision: current.revision, review: { decision: $('confirmForm').checked ? 'ses_allowed' : 'unknown', reviewedBy: $('reviewerName').value, reference: $('reviewReference').value, pdfSha256: preparedSha, pdfReviewed: $('confirmPdf').checked } };
    const fingerprint = JSON.stringify(body); if (!sendPending || sendPending.fingerprint !== fingerprint) sendPending = { fingerprint, commandId: crypto.randomUUID() };
    busy = true; updateControls(); $('confirmSend').disabled = true;
    try { const deliveryResult = await api({}, { ...body, commandId: sendPending.commandId }); sendPending = null; const r = await api({ action: 'get', id: current.id }); current = { ...r.document, kind: 'document' }; preparedSha = ''; $('sendDialog').close(); if (deliveryMode === 'link') {
      $('generatedLinks').replaceChildren(...(deliveryResult.links || []).map(link => { const label = node('label', link.name + ' · ' + link.email), input = node('input', null, { readonly: '', type: 'text', 'aria-label': 'Link za ' + link.name }); input.value = link.url; label.append(input); return label; })); $('linksDialog').showModal(); message('Linkovi su generisani. Pozivni e-mail nije poslat.');
     } else message('Zahtev je sačuvan. Pozivi se šalju iz evidencije poslova; prihvatanje mail servera nije dokaz da je poruka pročitana.'); }
    catch (error) { message(error.message, true); }
    finally { busy = false; $('confirmSend').disabled = false; updateControls(); }
  });
  async function download(action) {
    const s = session(); if (!s || !current) return;
    try {
      const r = await fetch('/api/sign-admin?' + new URLSearchParams({ action, id: current.id }), { headers: { Authorization: 'Bearer ' + s.token }, cache: 'no-store' });
      if (!r.ok) { const err = await r.json(); throw Error(err.error); }
      const blob = await r.blob(), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = action === 'evidence' ? 'Marketizo-evidencija.json' : 'Marketizo-ugovor.pdf'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (e) { message(e.message, true); }
  }
  $('downloadReceipt').addEventListener('click', () => download('receipt'));
  $('downloadEvidence').addEventListener('click', () => download('evidence'));
  $('voidRequest').addEventListener('click', async () => {
    if (busy || !confirm('Poništiti ovaj otvoren zahtev? Već zabeležene potvrde ostaju sačuvane, a novi potpisi se blokiraju.')) return;
    busy = true; updateControls();
    try { await api({}, { action: 'void', id: current.id }); const r = await api({ action: 'get', id: current.id }); current = { ...r.document, kind: 'document' }; message('Otvoren zahtev je poništen.'); } catch (e) { message(e.message, true); } finally { busy = false; updateControls(); }
  });
  async function init() {
    $('newDocument').disabled = true;
    try { const r = await api({ action: 'bootstrap' }); people = r.people; sendingEnabled = r.integration.sendingEnabled; $('connectionStatus').textContent = r.integration.message;
      await loadDossiers(true); await loadTemplates(); $('newDocument').disabled = false; await list();
    } catch (e) { $('connectionStatus').textContent = 'Marketizo Sign nije spreman za rad.'; message(e.message, true); }
  }
  init();
})();
