const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const source = fs.readFileSync(__dirname + '/../employee-portal.js', 'utf8');
const start = source.indexOf('let employeePreferenceSaveInFlight = false;'), end = source.indexOf('\nfunction leaderTeam()', start);
let release, calls = 0; const notices = [];
const own = { id: 'own', scope: 'employee', targetId: 'emp-a', hiddenUntil: '' };
const foreign = { id: 'foreign', scope: 'employee', targetId: 'emp-b', hiddenUntil: '' };
const ctx = { state: { notifications: [own, foreign] }, activeEmployee: { id: 'emp-a' }, addDays: () => '2026-10-21', currentDateKey: () => '2026-10-14',
  saveState(options) { if (options?.remote === false) return Promise.resolve({ ok: true }); calls++; return new Promise(resolve => release = resolve); },
  renderEmployeePortal() {}, showToast: (...args) => notices.push(args), Date };
vm.createContext(ctx); vm.runInContext(source.slice(start, end), ctx);
(async () => {
  const first = ctx.hideNotification('own'); assert.equal(notices.length, 0);
  await ctx.hideNotification('foreign'); assert.equal(calls, 1);
  await ctx.unhideNotification('own'); assert.equal(calls, 1);
  release({ ok: false, error: 'fixture failure' }); await first;
  assert.equal(own.hiddenUntil, ''); assert.equal(notices.some(item => item[0] === 'Sakriveno'), false);
  const retry = ctx.hideNotification('own'); release({ ok: true }); await retry;
  assert.equal(own.hiddenUntil, '2026-10-21');
  const unhide = ctx.unhideNotification('own'); release({ ok: true }); await unhide;
  assert.equal(own.hiddenUntil, '');
  const late = { acknowledgedAt: '' }; const ack = ctx.confirmEmployeeFieldChange(late, 'acknowledgedAt', '2026-10-14T21:00:00Z');
  release({ ok: false }); assert.equal(await ack, false); assert.equal(late.acknowledgedAt, '');

  const h = require('./crm-regression.cjs'); h.reset();
  h.getCurrent().payload.notifications = [{ ...own, title: 'Original title', key: 'original-key' }, foreign, { id: 'admin', scope: 'admin', title: 'Admin', hiddenUntil: '' }];
  const encoded = Buffer.from(JSON.stringify({ employeeId: 'emp-a', role: 'employee', exp: Date.now() + 3600000 })).toString('base64url');
  const token = encoded + '.' + crypto.createHmac('sha256', 'local-fixture').update(encoded).digest('base64url');
  const desired = structuredClone(h.getCurrent().payload);
  desired.notifications = desired.notifications.map(item => ({ ...item, title: 'Forged', scope: 'admin', hiddenUntil: '2026-10-21' }));
  desired.notifications.push({ id: 'injected', scope: 'admin', title: 'Injected' });
  let result; const res = { setHeader() {}, end(text) { result = { status: this.statusCode, body: JSON.parse(text) }; } };
  await h.state({ method: 'PUT', body: { payload: desired, baseUpdatedAt: h.getCurrent().updated_at }, headers: { authorization: 'Bearer ' + token } }, res);
  assert.equal(result.status, 200);
  const saved = h.getCurrent().payload.notifications;
  assert.equal(saved.length, 3); assert.equal(saved[0].hiddenUntil, '2026-10-21');
  assert.equal(saved[0].scope, 'employee'); assert.equal(saved[0].title, 'Original title'); assert.equal(saved[0].key, 'original-key');
  assert.equal(saved[1].hiddenUntil, ''); assert.equal(saved[2].hiddenUntil, '');
  console.log('PASS: actual employee hide/unhide/ack helper waits for server and restores failed changes; actual API saves only owned notification visibility and rejects foreign/admin metadata injection.');
})().catch(error => { console.error(error); process.exitCode = 1; });
