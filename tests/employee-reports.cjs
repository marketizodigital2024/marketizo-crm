const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../employee-portal.js'), 'utf8');
const apiSource = fs.readFileSync(path.join(__dirname, '../api/employee-report.js'), 'utf8');
const clone = value => structuredClone(value);
const env = { SUPABASE_URL: 'https://fixture.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fixture', EMPLOYEE_SESSION_SECRET: 'fixture' };
let row = { updated_at: 'initial', payload: {
  employees: [{ id: 'leader', name: 'Lead', isLeader: true, status: 'Aktivan' }, { id: 'worker', name: 'Worker', leaderId: 'leader', status: 'Aktivan' }, { id: 'other', name: 'Other', leaderId: 'elsewhere', status: 'Aktivan' }, { id: 'inactive', status: 'Neaktivan', isLeader: true }],
  employeeWorkLogs: [{ id: 'existing', employeeId: 'worker', date: '2026-10-23', minutes: 60 }],
  employeeReports: [{ id: 'weekly', employeeId: 'worker', recipientId: 'leader', isWeeklyQuestionnaire: true, status: 'sent', weekKey: '2026-10-19' }, { id: 'foreign', employeeId: 'other', isWeeklyQuestionnaire: true }],
  unrelated: { preserve: 'exactly' }
} };
let dbCalls = [], race = false, patches = 0;
async function fakeFetch(input, options = {}) {
  const url = new URL(input); assert.equal(url.hostname, 'fixture.invalid');
  dbCalls.push({ method: options.method || 'GET', select: url.searchParams.get('select') });
  if (options.method === 'PATCH') {
    patches++;
    if (race) { race = false; row.payload.employeeWorkLogs.push({ id: 'coworker-new', employeeId: 'other', minutes: 20 }); row.updated_at = 'concurrent'; return reply(200, []); }
    assert.equal(url.searchParams.get('updated_at'), `eq.${row.updated_at}`);
    const body = JSON.parse(options.body); row = { payload: body.payload, updated_at: body.updated_at }; return reply(200, [{ updated_at: row.updated_at }]);
  }
  if (url.searchParams.get('select').includes('employees:')) return reply(200, [{ employees: row.payload.employees, reports: row.payload.employeeReports, workLogs: row.payload.employeeWorkLogs, updated_at: row.updated_at }]);
  return reply(200, [clone(row)]);
}
function reply(status, data) { return { ok: status < 300, status, json: async () => clone(data) }; }
const apiCtx = { module: { exports: {} }, require: id => require(require.resolve(id, { paths: [path.join(__dirname, '../api')] })), process: { env }, fetch: fakeFetch, Buffer, Date, console };
vm.createContext(apiCtx); vm.runInContext(apiSource, apiCtx);
function token(id) { const encoded = Buffer.from(JSON.stringify({ employeeId: id, role: 'employee', exp: Date.now() + 3600000 })).toString('base64url'); return encoded + '.' + crypto.createHmac('sha256', 'fixture').update(encoded).digest('base64url'); }
async function call(method, actor, body = {}) { let result; await apiCtx.module.exports({ method, body, headers: { authorization: actor ? `Bearer ${token(actor)}` : '' } }, { setHeader() {}, end(text) { result = { status: this.statusCode, body: JSON.parse(text) }; } }); return result; }
function named(name) { const start = source.indexOf(`function ${name}(`); assert.ok(start >= 0, name); const asyncStart = source.slice(start - 6, start) === 'async ' ? start - 6 : start; return source.slice(asyncStart, source.indexOf('\n}', start) + 2); }
(async () => {
  assert.equal((await call('GET', '')).status, 401); assert.equal(dbCalls.length, 0);
  assert.deepEqual((await call('GET', 'worker')).body.reports.map(r => r.id), ['weekly']);
  assert.deepEqual((await call('GET', 'leader')).body.reports.map(r => r.id), ['weekly']);
  assert.equal((await call('GET', 'inactive')).status, 403);
  assert.ok(dbCalls.every(c => c.method !== 'GET' || !c.select.includes('select=payload')));
  const answers = ['one', 'two', 'three', 'four', 'five'];
  assert.equal((await call('POST','worker',{action:'submitWeeklyQuestionnaire',employeeId:'worker',reportId:'weekly',answers:['one','two','three','four','  ']})).status,400,'Server refuses incomplete questionnaires');
  assert.equal((await call('POST', 'other', { action: 'submitWeeklyQuestionnaire', employeeId: 'other', reportId: 'weekly', answers })).status, 403);
  race = true;
  let r = await call('POST', 'worker', { action: 'submitWeeklyQuestionnaire', employeeId: 'worker', reportId: 'weekly', answers });
  assert.equal(r.status, 200); assert.equal(r.body.report.status, 'completed'); assert.ok(row.payload.employeeWorkLogs.some(l => l.id === 'coworker-new')); assert.deepEqual(row.payload.unrelated, { preserve: 'exactly' });
  assert.equal((await call('POST', 'other', { action: 'acknowledgeWeeklyQuestionnaire', leaderId: 'other', reportId: 'weekly' })).status, 403);
  r = await call('POST', 'leader', { action: 'acknowledgeWeeklyQuestionnaire', leaderId: 'leader', reportId: 'weekly' }); const ack = r.body.report.acknowledgedAt, submitted = r.body.report.submittedAt, beforePatches = patches;
  r = await call('POST', 'worker', { action: 'submitWeeklyQuestionnaire', employeeId: 'worker', reportId: 'weekly', answers });
  assert.equal(r.body.duplicate, true); assert.equal(r.body.report.acknowledgedAt, ack); assert.equal(r.body.report.submittedAt, submitted); assert.equal(patches, beforePatches);
  r = await call('POST', 'worker', { action: 'submitWeeklyQuestionnaire', employeeId: 'worker', reportId: 'weekly', answers: [...answers.slice(0, 4), 'edited'] }); assert.equal(r.body.report.acknowledgedAt, null);
  row.payload.employeeReports.push({ id: 'auto', employeeId: 'worker', recipientId: 'leader', date: '2026-10-23', isFinalDailyReport: true, isAutomaticRollup: true, acknowledgedAt: 'old', acknowledgedBy: 'leader', minutes: 0, note: 'automatic' });
  r = await call('POST', 'worker', { employeeId: 'worker', recipientId: 'other', date: '2026-10-23', note: 'manual summary', positive: 'good', negative: 'blocked' });
  assert.equal(r.body.report.recipientId, 'leader'); assert.equal(r.body.report.minutes, 60); assert.equal(r.body.report.isAutomaticRollup, false); assert.equal(r.body.report.acknowledgedAt, null);
  r = await call('POST', 'leader', { action: 'acknowledge', leaderId: 'leader', reportId: 'auto' }); const dailyAck = r.body.report.acknowledgedAt;
  r = await call('POST', 'worker', { employeeId: 'worker', date: '2026-10-23', note: 'manual summary', positive: 'good', negative: 'blocked' }); assert.equal(r.body.duplicate, true); assert.equal(r.body.report.acknowledgedAt, dailyAck);
  // Run the real report renderer with today/old/other/already-read records.
  let inbox;
  const elements = { leaderReportsNav: {}, employeeReportsTab: {}, leaderLiveReportDate: { value: '2026-10-23' }, leaderLiveReportEmployee: { value: '' } };
  const ui = { state: { employees: row.payload.employees, employeeWorkLogs: [], employeeReports: [ { id: 'today', employeeId: 'worker', date: '2026-10-23', isFinalDailyReport: true }, { id: 'old', employeeId: 'worker', date: '2026-10-22', isFinalDailyReport: true }, { id: 'read', employeeId: 'worker', isFinalDailyReport: true, acknowledgedAt: 'yes' }, { id: 'foreign', employeeId: 'other', isFinalDailyReport: true } ] }, activeEmployee: row.payload.employees[0], document: { getElementById: id => elements[id], querySelectorAll: () => [] }, window: { MarketizoCosts: { minutes: l => l.minutes } }, Date, Intl, setText() {}, formatNumber: String, formatDate: String, escapePortalText: String, currentDateKey: () => '2026-10-23', renderLeaderReportInbox: reports => inbox = reports, renderWeeklyQuestionnaires() {} };
  vm.createContext(ui); vm.runInContext(named('leaderReportPeople') + '\n' + named('weeklyReportsForLeader') + '\n' + named('renderLeaderReportStatus') + '\n' + named('renderLeaderReportsPage'), ui); ui.renderLeaderReportsPage(); assert.equal(inbox, undefined, 'Daily reports never populate or open the leader inbox'); assert.equal(elements.leaderReportsNav.textContent, 'Izveštaji');
  ui.state.employeeReports.push({id:'weekly-new',employeeId:'worker',isWeeklyQuestionnaire:true,submittedAt:'now'});
  ui.renderLeaderReportsPage(); assert.equal(elements.leaderReportsNav.textContent,'Izveštaji (1)','Weekly answers retain their unread badge');
  let dailyOpens=0,scheduled=0;
  const dailyUi={document:{getElementById:id=>id==='leaderReportsDialog'?{showModal(){dailyOpens++}}:{innerHTML:''}},window:{setTimeout(){scheduled++}},state:{employees:row.payload.employees},formatDate:String,escapePortalText:String,formatNumber:String};
  vm.createContext(dailyUi);vm.runInContext(named('renderLeaderReportInbox'),dailyUi);dailyUi.renderLeaderReportInbox([{id:'daily',employeeId:'worker',minutes:60,date:'2026-10-23'}]);
  assert.equal(dailyOpens,0);assert.equal(scheduled,0,'Daily inbox never schedules a popup');
  // Exercise required weekly tasks with real renderers and dialog cancel handlers.
  let day='2026-11-05', editingWeekly=false;
  const dialog=()=>({open:false,listeners:{},showModal(){this.open=true;},close(){this.open=false;this.listeners.close?.();},addEventListener(type,fn){this.listeners[type]=fn;}});
  const sendDialog=dialog(),answerDialog=dialog(),draftValues=Object.fromEntries([1,2,3,4,5].map(i=>[`answer${i}`,{value:''}]));
  const draftForm={dataset:{},elements:draftValues,reset(){Object.values(draftValues).forEach(f=>f.value='');}};
  const weeklyElements={weeklySendDialog:sendDialog,weeklyQuestionnaireDialog:answerDialog,weeklyQuestionnaireForm:draftForm,closeWeeklySendDialog:{}};
  const storage=new Map();
  const requiredUi={state:{employees:[{id:'leader',isLeader:true},{id:'worker',leaderId:'leader'},{id:'second',leaderId:'leader'}],employeeReports:[]},activeEmployee:{id:'leader',isLeader:true},currentDateKey:()=>day,currentWeeklyWindow:()=>({weekKey:'2026-11-02',dueDate:'2026-11-05',fridayDate:'2026-11-06'}),document:{hidden:false,activeElement:{matches:()=>editingWeekly},getElementById:id=>weeklyElements[id],querySelector:selector=>selector==='dialog[open]'?[sendDialog,answerDialog].find(d=>d.open):null},localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},setText(){},formatDate:String};
  vm.createContext(requiredUi);vm.runInContext(['leaderReportPeople','weeklyReportsForLeader','requiredWeeklyTask','weeklyDraftKey','saveWeeklyDraft','renderRequiredWeeklyTask'].map(named).join('\n'),requiredUi);
  day='2026-11-04';assert.equal(requiredUi.requiredWeeklyTask(),null);
  day='2026-11-05';editingWeekly=true;requiredUi.renderRequiredWeeklyTask();assert.equal(sendDialog.open,false);
  editingWeekly=false;requiredUi.renderRequiredWeeklyTask();assert.equal(sendDialog.open,true);assert.equal(weeklyElements.closeWeeklySendDialog.hidden,true);
  requiredUi.state.employeeReports.push({id:'w1',isWeeklyQuestionnaire:true,employeeId:'worker',weekKey:'2026-11-02'});assert.equal(requiredUi.requiredWeeklyTask().kind,'send','Partial team sends remain required');
  requiredUi.state.employeeReports.push({id:'w2',isWeeklyQuestionnaire:true,employeeId:'second',weekKey:'2026-11-02'});assert.equal(requiredUi.requiredWeeklyTask(),null);
  sendDialog.open=false;requiredUi.activeEmployee={id:'worker',isLeader:true};requiredUi.renderRequiredWeeklyTask();assert.equal(answerDialog.open,true,'Leader recipients must also answer');
  draftValues.answer1.value='Draft retained';requiredUi.saveWeeklyDraft(draftForm);draftForm.dataset={};draftForm.reset();answerDialog.open=false;requiredUi.renderRequiredWeeklyTask();assert.equal(draftValues.answer1.value,'Draft retained');
  const guardStart=source.indexOf('for (const [dialogId, kind]'),guardEnd=source.indexOf('document.getElementById("confirmSendWeeklyQuestionnaire")?.addEventListener',guardStart);
  vm.runInContext(source.slice(guardStart,guardEnd),requiredUi);
  requiredUi.activeEmployee={id:'leader',isLeader:true};requiredUi.state.employeeReports.pop();let senderPrevented=false;sendDialog.listeners.cancel({preventDefault(){senderPrevented=true;}});assert.equal(senderPrevented,true,'Escape cannot dismiss required team sending');
  requiredUi.activeEmployee={id:'worker',isLeader:true};let prevented=false;answerDialog.listeners.cancel({preventDefault(){prevented=true;}});assert.equal(prevented,true);
  answerDialog.open=false;answerDialog.listeners.close();assert.equal(answerDialog.open,true);
  requiredUi.state.employeeReports[0].submittedAt='confirmed';assert.equal(requiredUi.requiredWeeklyTask(),null);prevented=false;answerDialog.listeners.cancel({preventDefault(){prevented=true;}});assert.equal(prevented,false);
  requiredUi.activeEmployee={id:'leader',isLeader:true};requiredUi.state.employeeReports=[];sendDialog.open=false;answerDialog.open=false;
  day='2026-11-06';assert.equal(requiredUi.requiredWeeklyTask().kind,'send','Friday keeps the missed Thursday reminder');requiredUi.renderRequiredWeeklyTask();assert.equal(sendDialog.open,true);
  day='2026-11-07';requiredUi.renderRequiredWeeklyTask();assert.equal(requiredUi.requiredWeeklyTask(),null);assert.equal(sendDialog.open,false,'A required send popup does not stay trapped over the weekend');assert.equal(weeklyElements.closeWeeklySendDialog.hidden,false);
  day='2026-11-08';requiredUi.renderRequiredWeeklyTask();assert.equal(sendDialog.open,false);
  requiredUi.activeEmployee={id:'worker'};requiredUi.state.employeeReports=[{id:'weekend-answer',isWeeklyQuestionnaire:true,employeeId:'worker',weekKey:'2026-11-02'}];draftForm.dataset.reportId='weekend-answer';draftValues.answer1.value='Keep weekend draft';answerDialog.open=true;requiredUi.renderRequiredWeeklyTask();assert.equal(answerDialog.open,false);assert.equal(requiredUi.state.employeeReports[0].submittedAt,undefined);assert.match(storage.get('marketizoWeeklyDraft:worker:weekend-answer'),/Keep weekend draft/);
  day='2026-11-09';assert.equal(requiredUi.requiredWeeklyTask().kind,'answer','Unanswered reports remain due on the next workday');requiredUi.renderRequiredWeeklyTask();assert.equal(answerDialog.open,true);assert.equal(draftValues.answer1.value,'Keep weekend draft');
  // The exact reported Saturday must never force the team-send popup.
  day='2026-10-31';requiredUi.currentWeeklyWindow=()=>({weekKey:'2026-10-26',dueDate:'2026-10-29',fridayDate:'2026-10-30'});requiredUi.activeEmployee={id:'leader',isLeader:true};requiredUi.state.employeeReports=[];assert.equal(requiredUi.requiredWeeklyTask(),null);
  requiredUi.activeEmployee={id:'other'};assert.equal(requiredUi.requiredWeeklyTask(),null);
  assert.ok(!fs.readFileSync(path.join(__dirname,'../employee-login.html'),'utf8').includes('id="closeWeeklyQuestionnaireDialog"'));
  // Actual form handler: failed submission retains answers; double clicks issue one request.
  let submit, release, calls = 0, resets = 0, toasts = [];
  const fields = Object.fromEntries(answers.map((a, i) => [`answer${i + 1}`, a]));
  const button = {}, form = { dataset: { reportId: 'weekly' }, querySelector: () => button, reset() { resets++; } };
  const formUi = { weeklyDraftKey: () => 'draft', localStorage: { removeItem() {} }, renderRequiredWeeklyTask() {}, state: { employeeReports: [] }, activeEmployee: { id: 'worker' }, document: { getElementById: id => id === 'weeklyQuestionnaireForm' ? { addEventListener(type, fn) { submit = fn; } } : { close() {} } }, FormData: class { get(key) { return fields[key]; } }, postEmployeeReport() { calls++; return new Promise(resolve => release = resolve); }, saveState() {}, showToast: (...args) => toasts.push(args) };
  vm.createContext(formUi); const start = source.indexOf('document.getElementById("weeklyQuestionnaireForm")?.addEventListener("submit"'); const end = source.indexOf('\ndocument.getElementById("leaderLiveReportEmployee")', start); vm.runInContext(source.slice(start, end), formUi);
  const event = { currentTarget: form, preventDefault() {} }; const sending = submit(event); assert.equal(form.inert, true); await submit(event); assert.equal(calls, 1); release({ ok: false, error: 'busy' }); await sending; assert.equal(resets, 0); assert.equal(form.inert, false); assert.equal(button.disabled, false); assert.equal(fields.answer5, 'five');
  const retry = submit(event); release({ ok: true, report: { id: 'weekly', submittedAt: 'now' } }); await retry; assert.equal(resets, 1); assert.equal(formUi.state.employeeReports.length, 1);
  // A slow inbox read cannot overlap, overwrite other collections or undo a new confirmation.
  let readRelease, reads = 0, renders = 0, editing = false;
  const refreshUi = { activeEmployee: { id: 'leader', isLeader: true }, state: { employeeReports: [], employeeWorkLogs: [{ id: 'keep' }] }, reportRefreshInFlight: false, reportInboxRevision: 0, document: { hidden: false, activeElement: { matches: () => editing }, querySelector: () => null }, window: { setTimeout: () => 1, clearTimeout() {} }, AbortController, employeeApiHeaders: () => ({}), renderLeaderReportStatus: () => renders++, showToast() {}, fetch: () => { reads++; return new Promise(resolve => readRelease = resolve); } };
  vm.createContext(refreshUi); vm.runInContext(named('refreshReportInbox'), refreshUi);
  const pendingRead = refreshUi.refreshReportInbox(); await refreshUi.refreshReportInbox(); assert.equal(reads, 1);
  readRelease(reply(200, { ok: true, reports: [{ id: 'new' }] })); await pendingRead; assert.equal(renders, 1); assert.equal(refreshUi.state.employeeWorkLogs[0].id, 'keep');
  const staleRead = refreshUi.refreshReportInbox(); refreshUi.reportInboxRevision++; refreshUi.state.employeeReports = [{ id: 'new', acknowledgedAt: 'confirmed' }]; readRelease(reply(200, { ok: true, reports: [{ id: 'new' }] })); await staleRead; assert.equal(refreshUi.state.employeeReports[0].acknowledgedAt, 'confirmed');
  const beforeEditing = refreshUi.refreshReportInbox(); editing = true; readRelease(reply(200, { ok: true, reports: [{ id: 'later' }] })); await beforeEditing; assert.equal(refreshUi.state.employeeReports[0].id, 'new');
  await refreshUi.refreshReportInbox(); assert.equal(reads, 3, 'No read while a form is being edited');
  // The bounded request returns control on a network timeout, without a false success.
  let abortRequest;
  const postUi = { reportInboxRevision: 0, window: { setTimeout: fn => { abortRequest = fn; return 1; }, clearTimeout() {} }, AbortController, employeeApiHeaders: () => ({}), fetch: (url, options) => new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(Object.assign(new Error(), { name: 'AbortError' })))) };
  vm.createContext(postUi); vm.runInContext(named('postEmployeeReport'), postUi); const timedPost = postUi.postEmployeeReport({}); abortRequest(); const timedResult = await timedPost; assert.equal(timedResult.ok, false); assert.match(timedResult.error, /zadržani/);
  // Completed reports cannot be dismissed; failed/duplicate requests do not mark them read.
  const html = fs.readFileSync(path.join(__dirname, '../employee-login.html'), 'utf8');
  assert.ok(!html.includes('id="closeWeeklyCompletedDialog"'));
  let receiptCancel;
  const receipt = { open: true, dataset: { reportId: 'receipt' }, close() { this.open = false; }, addEventListener(type, fn) { receiptCancel = fn; } };
  const receiptButton = {};
  let ackRelease, ackCalls = 0, ackRenders = 0;
  const ackUi = { activeEmployee: { id: 'leader' }, weeklyCompletionShown: true, weeklyAcknowledgementInFlight: false, state: { employeeReports: [{ id: 'receipt' }] }, document: { getElementById: id => id === 'weeklyCompletedDialog' ? receipt : receiptButton }, postEmployeeReport() { ackCalls++; return new Promise(resolve => ackRelease = resolve); }, saveState() {}, showToast() {}, renderLeaderReportStatus() { ackRenders++; } };
  vm.createContext(ackUi); vm.runInContext(named('acknowledgeWeeklyQuestionnaire'), ackUi);
  const cancelStart = source.indexOf('document.getElementById("weeklyCompletedDialog")?.addEventListener("cancel"');
  vm.runInContext(source.slice(cancelStart, source.indexOf('\n', cancelStart)), ackUi);
  let receiptPrevented = false; receiptCancel({ preventDefault() { receiptPrevented = true; } }); assert.equal(receiptPrevented, true);
  const failedAck = ackUi.acknowledgeWeeklyQuestionnaire(); await ackUi.acknowledgeWeeklyQuestionnaire(); assert.equal(ackCalls, 1); assert.equal(receiptButton.disabled, true);
  ackRelease({ ok: false, error: 'offline' }); await failedAck; assert.equal(receipt.open, true); assert.equal(ackUi.state.employeeReports[0].acknowledgedAt, undefined); assert.equal(receiptButton.disabled, false);
  const falseSuccess = ackUi.acknowledgeWeeklyQuestionnaire(); ackRelease({ ok: true, report: { id: 'receipt' } }); await falseSuccess; assert.equal(receipt.open, true);
  const confirmedAck = ackUi.acknowledgeWeeklyQuestionnaire(); ackRelease({ ok: true, report: { id: 'receipt', acknowledgedAt: 'confirmed' } }); await confirmedAck;
  assert.equal(receipt.open, false); assert.equal(ackUi.state.employeeReports[0].acknowledgedAt, 'confirmed'); assert.equal(ackUi.weeklyCompletionShown, false); assert.equal(ackRenders, 1);
  // Refresh never replaces an open report with a different unread report.
  assert.match(named('renderWeeklyQuestionnaires'), /if \(completedDialog\?\.open\) return;/);
  console.log('PASS: same-day leader inbox, team isolation, live report read without writes, concurrent staff-entry preservation, safe/idempotent retries, changed report unread status, bounded forms retain failed answers, and explicit-only read confirmations.');
})().catch(error => { console.error(error); process.exitCode = 1; });
