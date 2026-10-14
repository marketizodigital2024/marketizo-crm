const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync(__dirname + '/../employee-portal.js', 'utf8');
const start = source.indexOf('document.getElementById("portalAbsenceForm")?.addEventListener');
const end = source.indexOf('\ndocument.getElementById("ackLateBtn")', start);
let handler, release, resets = 0, calls = 0, sequence = 0;
const button = { disabled: false };
const form = { dataset: {}, querySelector: () => button, reset() { resets++; } };
const fields = { type: 'Slobodan dan', startDate: '2026-10-14', endDate: '2026-10-14', note: 'QA fixture' };
const notices = [];
const ctx = {
  document: { getElementById: () => ({ addEventListener: (_, fn) => handler = fn }) },
  FormData: class { get(key) { return fields[key]; } entries() { return Object.entries(fields)[Symbol.iterator](); } },
  activeEmployee: { id: 'qa-a' }, state: { employeeAbsences: [{ id: 'coworker', employeeId: 'qa-b' }] },
  createId: () => `qa-${++sequence}`, Date, JSON,
  saveState(options) { if (options?.remote === false) return Promise.resolve({ ok: true }); calls++; return new Promise(resolve => release = resolve); },
  renderEmployeePortal() {}, showToast: (...args) => notices.push(args),
};
vm.createContext(ctx); vm.runInContext(source.slice(start, end), ctx);
const event = () => ({ currentTarget: form, preventDefault() {} });
(async () => {
  const firstEvent = event(), first = handler(firstEvent); firstEvent.currentTarget = null;
  const id = form.dataset.retryId;
  assert.equal(button.disabled, true); assert.equal(resets, 0); assert.equal(notices.length, 0);
  await handler(event()); assert.equal(calls, 1);
  release({ ok: false, error: 'Lost acknowledgement' }); await first;
  assert.equal(button.disabled, false); assert.equal(resets, 0);
  assert.equal(ctx.state.employeeAbsences.length, 1); assert.equal(form.dataset.retryId, id);
  const retry = handler(event()); assert.equal(ctx.state.employeeAbsences[0].id, id);
  // A rebase refresh discovers the first request committed on the server.
  const committed = structuredClone(ctx.state.employeeAbsences[0]);
  ctx.state.employeeAbsences = [committed, { id: 'new-coworker', employeeId: 'qa-b' }, ...ctx.state.employeeAbsences.slice(1)];
  release({ ok: false, error: 'Second uncertain acknowledgement' }); await retry;
  assert.equal(ctx.state.employeeAbsences.length, 3); assert.equal(ctx.state.employeeAbsences[0].id, id);
  const knownRetry = handler(event()); assert.equal(ctx.state.employeeAbsences.filter(item => item.id === id).length, 1);
  release({ ok: true }); await knownRetry;
  assert.equal(resets, 1); assert.equal(form.dataset.retryId, undefined);
  assert.equal(notices.filter(item => item[0] === 'Zahtev poslat').length, 1);
  const next = handler(event()); assert.notEqual(form.dataset.retryId, id); release({ ok: true }); await next;
  console.log('PASS: actual employee absence form waits for server, locks double submit, keeps failed form and request ID, preserves refreshed coworker/known committed rows and retries without duplicates.');
})().catch(error => { console.error(error); process.exitCode = 1; });
