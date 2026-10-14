const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync(__dirname + '/../employee-portal.js', 'utf8');
function named(name) { const start = source.indexOf('function ' + name + '('); return source.slice(start, source.indexOf('\n}', start) + 2); }
const start = source.indexOf('document.getElementById("portalHoursForm")?.addEventListener'), end = source.indexOf('\ndocument.getElementById("closeDailyReportDialog")', start);
let handler, release, calls = 0, sequence = 0, clears = 0;
const fields = { date: '2026-10-14', activityId: 'act', clientId: 'client', minutes: '7', note: 'QA fixture' };
const button = { disabled: false }, form = { dataset: {}, inert: false, querySelector: () => button };
const queue = [{ workLog: { id: 'foreign', employeeId: 'other', date: '2026-10-14', minutes: 8, activityId: 'act', clientId: 'client', note: 'foreign draft' } }];
const received = [], notices = [];
const ctx = { state: { employees: [{ id: 'qa' }], employeeActivities: [{ id: 'act', name: 'Edit', category: 'Editori' }], clients: [{ id: 'client', name: 'QA client' }], employeeWorkLogs: [] }, activeEmployee: { id: 'qa' },
  document: { getElementById(id) { return id === 'portalHoursForm' ? { addEventListener: (_, fn) => handler = fn } : id === 'portalActivitySearch' ? { value: 'Edit' } : null; } },
  FormData: class { get(key) { return fields[key]; } }, createId: () => 'qa-' + (++sequence), normalizedActivitySearch: value => String(value || '').toLowerCase(), parseNumber: Number, cloneState: structuredClone,
  readPendingWorkLogs: () => queue, queuePendingWorkLog(log, recipientId) { const index = queue.findIndex(item => item.workLog.id === log.id); if (index !== -1) queue.splice(index, 1); queue.push({ workLog: log, recipientId }); },
  removePendingWorkLog(id) { const index = queue.findIndex(item => item.workLog.id === id); if (index !== -1) queue.splice(index, 1); },
  reportRecipientId: () => 'leader', renderEmployeePortal() {}, saveState() {}, restorePortalHoursForm(_, values) { for (const key of Object.keys(fields)) fields[key] = values[key]; },
  clearPortalHoursForm() { clears++; for (const key of Object.keys(fields)) fields[key] = ''; },
  postEmployeeWorkLog(log) { calls++; received.push(structuredClone(log)); return new Promise(resolve => release = resolve); },
  showToast: (...args) => notices.push(args), expectedMinutesForDate: () => 0, Date, JSON, window: { setTimeout() {} }, alert() { throw Error('Unexpected validation alert'); } };
vm.createContext(ctx); vm.runInContext(['workLogIntentFingerprint', 'portalWorkLogRetryId', 'clearPortalWorkRetryId'].map(named).join('\n') + '\n' + source.slice(start, end), ctx);
const event = () => ({ currentTarget: form, preventDefault() {} });
(async () => {
  const captured = { ...fields }; const firstEvent = event(), first = handler(firstEvent); firstEvent.currentTarget = null;
  assert.equal(form.inert, true); assert.equal(button.disabled, true); assert.equal(clears, 0);
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
  const calendar = { isAustrianWorkingDay: require('../lib/business-calendar.js').isWorkingDay, employeeWeeklyHoursForMonth: employee => employee.weeklyHours, parseNumber: Number, Date };
  vm.createContext(calendar); vm.runInContext(named('scheduledMinutesForDate') + '\n' + named('expectedMinutesForDate'), calendar);
  assert.equal(calendar.expectedMinutesForDate({ startDate: '2026-10-15', weeklyHours: 38.5 }, '2026-10-14'), 0);
  assert.equal(calendar.expectedMinutesForDate({ startDate: '2026-10-15', weeklyHours: 38.5 }, '2026-10-15'), 510);
  assert.equal(calendar.expectedMinutesForDate({ endDate: '2026-10-13', weeklyHours: 38.5 }, '2026-10-14'), 0);
  console.log('PASS: actual employee work form locks an in-flight submit, retains failed input and ID, retries/reloads pending intent without duplicates, starts a new confirmed entry and preserves other actor drafts/views.');
})().catch(error => { console.error(error); process.exitCode = 1; });
