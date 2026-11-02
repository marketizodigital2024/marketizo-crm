'use strict';
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync(__dirname + '/../employee-portal.js', 'utf8');
function fn(name) { const start = source.indexOf('function ' + name + '('); assert(start >= 0); return source.slice(start, source.indexOf('\n}', start) + 2); }
const nodes = new Map(), text = {}, handlers = new Map();
function node(id) { if (!nodes.has(id)) nodes.set(id, { value: '', innerHTML: '', addEventListener(type, fn) { handlers.set(id + ':' + type, fn); } }); return nodes.get(id); }
const logs = [
  { id: 'oct', clientId:'client', employeeId: 'self', date: '2026-10-15', minutes: 80, activityName: 'Edit klipova', clientName: 'Probni klijent' },
  { id: 'nov', employeeId: 'self', date: '2026-11-02', minutes: 20, activityName: 'Metricool' },
  { id: 'old-year', employeeId: 'self', date: '2025-12-31', minutes: 30, activityName: 'Scenariji' },
  { id: 'other', employeeId: 'other', date: '2026-10-15', minutes: 999, activityName: 'Private other worker' },
];
const original = JSON.stringify(logs);
const context = {
  state:{clients:[{id:'client',name:'Legal Company',clickupName:'ClickUp brand'}]}, portalMonth: '2026-11', document: { getElementById: node },
  currentMonthKey: () => '2026-11', setText: (id, value) => text[id] = value,
  formatDate: value => value, formatHours: value => String(value), escapePortalText: value => String(value),
  workActivityCategoryLabel: value => value, window: { MarketizoCosts: { minutes: log => log.minutes } },
};
vm.createContext(context);
context.employeeWorkLogs = month => logs.filter(log => log.employeeId === 'self' && log.date.startsWith(month));
context.renderEmployeePortal = () => context.renderPortalHourRows(context.employeeWorkLogs(context.portalMonth));
context.renderLeaderPanel = () => { assert(node('leaderActivityDateFilter').value.startsWith(context.portalMonth) || !node('leaderActivityDateFilter').value); };
vm.runInContext(fn('portalWorkClientLabel'), context);
vm.runInContext(fn('renderPortalHourRows'), context);
const begin = source.indexOf('["input", "change"].forEach((type) => {\n  document.getElementById("employeePortalMonth")');
assert(begin >= 0);
vm.runInContext(source.slice(begin, source.indexOf('document.getElementById("leaderGoalForm")', begin)), context);
function date(value, event = 'input') { node('portalHoursDateFilter').value = value; handlers.get('portalHoursDateFilter:' + event)(); }
date('2026-10-15'); assert.equal(context.portalMonth, '2026-10'); assert.equal(node('employeePortalMonth').value, '2026-10');
assert.match(node('portalHoursRows').innerHTML, /ClickUp brand/);assert.match(node('portalHoursRows').innerHTML, /Edit klipova/); assert(!node('portalHoursRows').innerHTML.includes('Private other worker'));
assert.equal(text.portalHoursCount, '1 unosa · ' + String(80 / 60) + 'h');
date('2025-12-31', 'change'); assert.equal(context.portalMonth, '2025-12'); assert.match(node('portalHoursRows').innerHTML, /Scenariji/);
date('2026-10-20'); assert.match(node('portalHoursRows').innerHTML, /Nema upisanih aktivnosti za izabrani datum/);
handlers.get('portalHoursDateReset:click')(); assert.match(node('portalHoursRows').innerHTML, /Edit klipova/);
node('employeePortalMonth').value = '2026-11'; handlers.get('employeePortalMonth:change')({ target: node('employeePortalMonth') });
assert.match(node('portalHoursRows').innerHTML, /Metricool/); assert(!node('portalHoursRows').innerHTML.includes('Edit klipova'));
node('leaderActivityDateFilter').value = '2026-10-15'; handlers.get('leaderActivityDateFilter:change')();
assert.equal(context.portalMonth, '2026-10'); assert.equal(node('leaderActivityDateFilter').value, '2026-10-15');
date('2026-10-15');
node('leaderActivityDateFilter').value = '2026-11-02'; handlers.get('leaderActivityDateFilter:change')();
assert.equal(node('portalHoursDateFilter').value, '', 'Leader month switch cannot leave an invisible conflicting personal date');
assert.match(node('portalHoursRows').innerHTML, /Metricool/);
assert.equal(JSON.stringify(logs), original, 'Changing filters never modifies or deletes time entries');
console.log('PASS portal dates: cross-month/year activities and totals, empty day, reset, native change event, leader date retained, employee isolation and unchanged source records');
