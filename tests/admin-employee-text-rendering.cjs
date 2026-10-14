const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const admin = fs.readFileSync(__dirname + '/../app.js', 'utf8');
const employee = fs.readFileSync(__dirname + '/../employee-portal.js', 'utf8');
function named(source, name) { const start = source.indexOf('function ' + name + '('); return source.slice(start, source.indexOf('\n}', start) + 2); }
const marker = '<b data-audit-marker>QA</b> & "quoted"';
const nodes = new Map();
const doc = { getElementById(id) { if (!nodes.has(id)) nodes.set(id, { innerHTML: '' }); return nodes.get(id); }, querySelectorAll: () => [] };
const fixture = { employeeAbsences: [{ id: 'absence', employeeId: 'qa', type: marker, note: marker, status: 'Zatraženo', startDate: '2026-10-14', endDate: '2026-10-14' }] };
const original = structuredClone(fixture);
const ctx = { document: doc, state: fixture, setText() {}, employeeById: () => ({ id: 'qa', name: marker }), formatDate: value => value,
  normalizePhone: () => '000', portalLeadStatusClass: () => 'new', normalizeLeadStatus: () => 'Novi', currency: new Intl.NumberFormat('en', { style: 'currency', currency: 'EUR' }), Date };
vm.createContext(ctx); vm.runInContext(['escapeInvoiceText', 'renderEmployeeAbsenceRequests', 'renderPortalLeads', 'renderPortalTeam'].map(name => named(admin, name)).join('\n'), ctx);
ctx.renderEmployeeAbsenceRequests();
const lead = { id: 'qa" data-audit-id="', name: marker, note: marker, lossReason: marker, phone: '000', createdAt: '2026-10-14', service: marker, location: marker, source: marker, responsible: marker };
ctx.renderPortalLeads([lead]); ctx.renderPortalTeam([{ name: marker, role: marker, email: marker, phone: marker }]);
for (const id of ['employeeAbsenceRequestRows', 'portalLeadCards', 'portalTeamList']) {
  const html = nodes.get(id).innerHTML;
  assert(!html.includes('<b data-audit-marker>'), id + ' must render submitted markup as text');
  assert(html.includes('&lt;b data-audit-marker&gt;'));
  assert(html.includes('&amp;')); assert(html.includes('&quot;quoted&quot;'));
}
assert(!nodes.get('portalLeadCards').innerHTML.includes('data-audit-id="'));
assert.deepEqual(fixture, original); assert.equal(lead.name, marker);
const esc = { }; vm.createContext(esc); vm.runInContext(named(employee, 'escapePortalText'), esc);
assert.equal(esc.escapePortalText(marker), ctx.escapeInvoiceText(marker)); assert.equal(esc.escapePortalText(0), '0'); assert.equal(ctx.escapeInvoiceText(0), '0');
assert.match(employee, /escapePortalText\(notification\.title\)/);
assert.match(employee, /escapePortalText\(String\(notification\.message/);
assert.match(admin, /escapeInvoiceText\(absentNames\.slice/);
console.log('PASS: actual admin absence, lead and team renderers escape submitted text and quoted IDs without changing data; employee text escaping matches and preserves numeric zero.');
