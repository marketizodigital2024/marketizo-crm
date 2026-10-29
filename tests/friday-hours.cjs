const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
function extract(file, name) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0);
  return source.slice(start, source.indexOf('\n}', start) + 2);
}
const quotas = [];
for (const file of ['app.js', 'employee-portal.js']) {
  const ctx = { Date, Math, parseNumber: Number };
  vm.createContext(ctx);
  vm.runInContext(extract(file, 'scheduledMinutesForDate'), ctx);
  quotas.push((hours, date) => ctx.scheduledMinutesForDate(hours, date));
}
const rollup = { Date, Math, require: id => require(path.join(root, 'api', id)) };
vm.createContext(rollup);
vm.runInContext(extract('api/daily-report-rollup.js', 'expectedMinutes'), rollup);
quotas.push((hours, date) => rollup.expectedMinutes({ weeklyHours: hours }, date));
const state = { require: id => require(path.join(root, 'api', id)) };
vm.createContext(state);
vm.runInContext(extract('api/state.js', 'refreshWorkSummaries'), state);
for (const quota of quotas) {
  assert.equal(quota(38.5, '2026-10-23'), 390, 'Historical Friday preserved');
  assert.equal(quota(38.5, '2026-10-29'), 510);
  assert.equal(quota(38.5, '2026-10-30'), 420, 'New Friday starts on effective date');
  assert.equal(quota(38.5, '2026-11-06'), 420);
  assert.equal(quota(30, '2026-10-30'), 360, 'Part time unchanged');
  assert.equal(quota(20, '2026-10-30'), 240);
  assert.equal(quota(38.5, '2026-10-31'), 0);
  const attendance = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'].reduce((n, date) => n + quota(38.5, date), 0);
  assert.equal(attendance, 2460);
  assert.equal((attendance - 5 * 30) / 60, 38.5);
}
for (const [date, expected] of [['2026-10-23', 390], ['2026-10-30', 420]]) {
  const payload = {
    employees: [{ id: 'test', name: 'Test', weeklyHours: 38.5 }],
    employeeWorkLogs: [{ employeeId: 'test', date, minutes: 390 }],
    notifications: [{ key: `employee-hours-shortage-test-${date}` }],
  };
  const before = JSON.stringify(payload);
  const result = state.refreshWorkSummaries(payload);
  assert.equal(result.notifications.length, expected === 390 ? 0 : 1);
  if (expected === 420) assert.match(result.notifications[0].message, /390\/420 min.*30 min/);
  assert.equal(JSON.stringify(payload), before, 'Saved logs remain unchanged');
}
console.log('PASS: Friday effective date, frontend/server parity, net weekly hours, part time and historical preservation');
