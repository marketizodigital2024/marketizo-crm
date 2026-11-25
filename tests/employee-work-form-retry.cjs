const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync(__dirname + '/../employee-portal.js', 'utf8');
function named(name) { const start = source.indexOf('function ' + name + '('); return source.slice(start, source.indexOf('\n}', start) + 2); }
const start = source.indexOf('document.getElementById("portalHoursForm")?.addEventListener'), end = source.indexOf('\ndocument.getElementById("closeDailyReportDialog")', start);
let handler, release, calls = 0, sequence = 0, clears = 0, renders = 0, caches = 0;
const fields = { date: '2026-10-14', activityId: 'act', clientId: 'client', minutes: '7', note: 'QA fixture' };
const button = { disabled: false }, form = { dataset: {}, inert: false, querySelector: () => button };
const queue = [{ workLog: { id: 'foreign', employeeId: 'other', date: '2026-10-14', minutes: 8, activityId: 'act', clientId: 'client', note: 'foreign draft' } }];
const received = [], notices = [];
const ctx = { state: { employees: [{ id: 'qa' }], employeeActivities: [{ id: 'act', name: 'Edit', category: 'Editori' }], clients: [{ id: 'client', name: 'QA client' }], employeeWorkLogs: [] }, activeEmployee: { id: 'qa' },
  document: { getElementById(id) { return id === 'portalHoursForm' ? { addEventListener: (_, fn) => handler = fn } : id === 'portalActivitySearch' ? { value: 'Edit' } : null; } },
  FormData: class { get(key) { return fields[key]; } }, createId: () => 'qa-' + (++sequence), normalizedActivitySearch: value => String(value || '').toLowerCase(), parseNumber: Number, cloneState: structuredClone,
  readPendingWorkLogs: () => queue, queuePendingWorkLog(log, recipientId) { const index = queue.findIndex(item => item.workLog.id === log.id); if (index !== -1) queue.splice(index, 1); queue.push({ workLog: log, recipientId }); },
  removePendingWorkLog(id) { const index = queue.findIndex(item => item.workLog.id === id); if (index !== -1) queue.splice(index, 1); },
  reportRecipientId: () => 'leader', renderEmployeePortal() { renders++; }, saveState() { caches++; }, restorePortalHoursForm(_, values) { for (const key of Object.keys(fields)) fields[key] = values[key]; },
  clearPortalHoursForm() { clears++; for (const key of Object.keys(fields)) fields[key] = ''; },
  postEmployeeWorkLog(log) { calls++; received.push(structuredClone(log)); return new Promise(resolve => release = resolve); },
  showToast: (...args) => notices.push(args), expectedMinutesForDate: () => 1, loggedMinutesForDate: () => 999, hasFinalDailyReport: () => false, openDailyReportDialog() { throw Error("Daily popup must remain disabled"); }, Date, JSON, window: { setTimeout() { throw Error("Time-entry save must not schedule a daily popup"); } }, alert() { throw Error('Unexpected validation alert'); } };
vm.createContext(ctx); vm.runInContext(['workLogIntentFingerprint', 'portalWorkLogRetryId', 'clearPortalWorkRetryId'].map(named).join('\n') + '\n' + source.slice(start, end), ctx);
const event = () => ({ currentTarget: form, preventDefault() {} });
(async () => {
  const captured = { ...fields }; const firstEvent = event(), first = handler(firstEvent); firstEvent.currentTarget = null;
  assert.equal(form.inert, true); assert.equal(button.disabled, true); assert.equal(clears, 0);
  assert.equal(renders, 0, 'The database request starts before a full portal render');
  assert.equal(caches, 0, 'Full-state cache serialization cannot delay the request');
  assert.equal(notices.length, 0, 'Normal saving does not launch a wait notification');
  assert.equal(ctx.state.employeeWorkLogs.length, 0, 'An unconfirmed write is not marked saved');
  await handler(event()); assert.equal(calls, 1);
  release({ ok: false, retryable: true, error: 'Lost acknowledgement' }); await first;
  const id = received[0].id; assert.equal(form.inert, false); assert.equal(button.disabled, false); assert.deepEqual(fields, captured);
  const retry = handler(event()); assert.equal(received[1].id, id); assert.equal(queue.filter(item => item.workLog.employeeId === 'qa').length, 1);
  release({ ok: true }); await retry;
  assert.equal(clears, 1); assert.equal(form.dataset.retryWorkId, undefined); assert.equal(queue.length, 1); assert.equal(queue[0].workLog.id, 'foreign');
  Object.assign(fields, captured); const newEntry = handler(event()); assert.notEqual(received[2].id, id);
  release({ ok: false, retryable: true }); await newEntry;
  // A page/form reset must still recognize the persisted pending intent.
  const secondId = received[2].id; form.dataset = {};
  const afterReload = handler(event()); assert.equal(received[3].id, secondId);
  ctx.activeEmployee = { id: 'other' }; release({ ok: true }); await afterReload;
  assert.equal(clears, 1, 'An old request must not clear the new actor form');
  assert.equal(queue.length, 1); assert.equal(queue[0].workLog.id, 'foreign');
  assert(!notices.some(item => item[0] === 'Slanje je u toku'));
  // Execute the real local queue with full/blocked storage, retaining history.
  ctx.PENDING_WORK_LOGS_KEY = 'fixture-pending';
  let storageError = 'QuotaExceededError';
  ctx.localStorage = {
    getItem() { return JSON.stringify(queue); },
    setItem() { throw Object.assign(new Error('Storage unavailable'), { name: storageError }); },
  };
  vm.runInContext(['readPendingWorkLogs', 'writePendingWorkLogs', 'queuePendingWorkLog'].map(named).join('\n'), ctx);
  const history = [{ id: 'already-saved', employeeId: 'qa', minutes: 55, activityId: 'act', clientId: 'client', note: 'Existing activity' }, { id: 'concurrent-other', employeeId: 'other', minutes: 30 }];
  ctx.state.employeeWorkLogs = structuredClone(history);
  ctx.activeEmployee = { id: 'qa' };
  Object.assign(fields, captured); form.dataset = {};
  const beforeQueue = structuredClone(queue), beforeClears = clears, beforeRenders = renders, beforeCaches = caches;
  const blocked = handler(event());
  const blockedId = received.at(-1).id;
  assert.equal(form.inert, true, 'A failed local backup must still start the server request');
  assert.equal(button.disabled, true);
  assert.equal(clears, beforeClears);
  await handler(event()); assert.equal(received.at(-1).id, blockedId, 'In-flight duplicate submit is blocked');
  release({ ok: false, retryable: true, error: 'Lost acknowledgement' }); await blocked;
  assert.deepEqual(fields, captured);
  assert.deepEqual(ctx.state.employeeWorkLogs, history, 'Unconfirmed fallback must not replace history or add unconfirmed hours');
  assert.equal(renders, beforeRenders); assert.equal(caches, beforeCaches);
  assert.equal(notices.at(-1)[0], 'Čuvanje nije potvrđeno');
  assert.match(notices.at(-1)[1], /Ne zatvaraj niti osvežavaj/);
  assert.equal(form.dataset.retryWorkId, blockedId);
  storageError = 'SecurityError';
  const blockedRetry = handler(event());
  assert.equal(received.at(-1).id, blockedId, 'Uncertain server commits retain the same idempotency key even without storage');
  // A concurrent refresh/append while waiting must survive server confirmation.
  const concurrent = { id: 'another-new-activity', employeeId: 'other', minutes: 12 };
  ctx.state.employeeWorkLogs.push(concurrent);
  release({ ok: true, duplicate: true }); await blockedRetry;
  assert.equal(clears, beforeClears + 1, 'Only confirmed saves clear the form');
  assert.deepEqual(ctx.state.employeeWorkLogs.filter(log => log.id !== blockedId), [...history, concurrent]);
  assert.equal(ctx.state.employeeWorkLogs.filter(log => log.id === blockedId).length, 1);
  assert.deepEqual(queue, beforeQueue, 'Other employees pending activities remain untouched');
  Object.assign(fields, captured);
  const rejected = handler(event());
  assert.notEqual(received.at(-1).id, blockedId, 'A new confirmed entry has a new ID');
  const beforeReject = structuredClone(ctx.state.employeeWorkLogs);
  release({ ok: false, retryable: false, error: 'Validation failed' }); await rejected;
  assert.deepEqual(fields, captured); assert.deepEqual(structuredClone(ctx.state.employeeWorkLogs), beforeReject);
  assert.equal(notices.at(-1)[0], 'Unos nije prihvaćen');
  // Exercise the actual reset, including stale hidden activity/quantity values.
  const resetFields = Object.fromEntries(['date', 'minutes', 'clientId', 'note', 'positive', 'negative', 'productionQuantity'].map(key => [key, { value: key === 'date' ? '2026-10-30' : 'old choice' }]));
  const search = { value: 'Edit' }, hiddenActivity = { value: 'act', dispatchEvent() {} };
  const resetForm = { elements: resetFields, reset() { Object.values(resetFields).forEach(field => field.value = 'default'); } };
  const resetContext = { currentDateKey: () => '2026-11-02', Event: class {}, document: { getElementById: id => id === 'portalActivitySearch' ? search : id === 'portalActivityId' ? hiddenActivity : null }, setPortalActivityOptionsOpen(open) { assert.equal(open, false); } };
  vm.createContext(resetContext); vm.runInContext(named('clearPortalHoursForm'), resetContext); resetContext.clearPortalHoursForm(resetForm);
  assert.equal(resetFields.date.value, '2026-10-30');
  for (const key of ['minutes', 'clientId', 'note', 'positive', 'negative', 'productionQuantity']) assert.equal(resetFields[key].value, '', key);
  assert.equal(search.value, ''); assert.equal(hiddenActivity.value, '');
  const calendar = { isAustrianWorkingDay: require('../lib/business-calendar.js').isWorkingDay, employeeWeeklyHoursForMonth: employee => employee.weeklyHours, parseNumber: Number, Date };
  vm.createContext(calendar); vm.runInContext(named('scheduledMinutesForDate') + '\n' + named('expectedMinutesForDate'), calendar);
  assert.equal(calendar.expectedMinutesForDate({ startDate: '2026-10-15', weeklyHours: 38.5 }, '2026-10-14'), 0);
  assert.equal(calendar.expectedMinutesForDate({ startDate: '2026-10-15', weeklyHours: 38.5 }, '2026-10-15'), 510);
  assert.equal(calendar.expectedMinutesForDate({ endDate: '2026-10-13', weeklyHours: 38.5 }, '2026-10-14'), 0);
  console.log('PASS: actual employee work form locks submits, preserves retry IDs/forms and other actors, survives full/blocked local storage with confirmed server append, retains uncertain input without false saved status, and preserves existing/concurrent activities.');
})().catch(error => { console.error(error); process.exitCode = 1; });
