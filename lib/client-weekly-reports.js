// Client assignments are a dated ClickUp snapshot; answers remain in employeeReports/backups.
const roles = ['Scenarista', 'Voice Over', 'Editor', 'Social Media Manager', 'Snimatelj', 'Paid Ads', 'Checking'];
const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
function weeklyWindow(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Vienna', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(now).map(x => [x.type, x.value]));
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  const day = new Date(`${today}T12:00:00Z`), offset = (day.getUTCDay() + 6) % 7;
  day.setUTCDate(day.getUTCDate() - offset);
  // Before Monday noon the most recent released cycle is still last Monday's.
  if (!offset && Number(parts.hour) < 12) day.setUTCDate(day.getUTCDate() - 7);
  const date = delta => new Date(day.getTime() + delta * 86400000).toISOString().slice(0, 10);
  return { releaseDate: date(0), periodStart: date(-7), periodEnd: date(-1), dueDate: date(0), today, localHour: Number(parts.hour) };
}
function active(employee, date) {
  return employee && employee.status !== 'Neaktivan' && employee.active !== false && (!employee.startDate || employee.startDate <= date) && (!employee.endDate || employee.endDate >= date);
}
function assignments(employee, employees, rows) {
  const name = norm(employee.name);
  if (!name || employees.filter(e => e.status !== 'Neaktivan' && e.active !== false && norm(e.name) === name).length > 1) throw new Error('Ime zaposlenog nije jednoznačno u raspodeli.');
  const found = new Map();
  for (const row of rows) {
    if (row.archived || row.statusType === 'closed' || (row.clientStatus && norm(row.clientStatus) !== 'aktivan')) continue;
    const ownRoles = roles.filter(role => String(row[role] || '').split(/\s*;\s*/).some(person => norm(person) === name));
    if (!ownRoles.length) continue;
    if (!row.taskId) throw new Error('ClickUp klijent nema stabilan ID.');
    found.set(row.taskId, { clientId: row.taskId, clientName: row.Klijent, roles: ownRoles });
  }
  return [...found.values()].sort((a, b) => a.clientName.localeCompare(b.clientName, 'sr'));
}
function ensureReports(payload, source, windowInfo, now, onlyEmployeeId = '') {
  if (!source.live || !source.syncedAt) throw new Error(source.error || 'ClickUp raspodela nije dostupna.');
  const reports = payload.employeeReports ||= [], created = [];
  if (windowInfo.releaseDate < '2026-11-02') return created;
  for (const employee of payload.employees || []) {
    if (onlyEmployeeId && employee.id !== onlyEmployeeId) continue;
    if (!active(employee, windowInfo.today)) continue;
    const recipientId = employee.leaderId || (employee.isLeader ? (employee.id === 'emp-miljan' ? 'emp-ivana' : 'emp-miljan') : '');
    const leader = (payload.employees || []).find(e => e.id === recipientId && e.isLeader && active(e, windowInfo.today));
    if (!leader) continue;
    const clients = assignments(employee, payload.employees, source.rows);
    if (!clients.length) continue;
    const id = `client-weekly-${employee.id}-${windowInfo.releaseDate}`;
    if (reports.some(r => r.id === id)) continue;
    const report = { id, employeeId: employee.id, employeeName: employee.name, recipientId: leader.id, isClientWeeklyReport: true, title: 'Nedeljni pregled klijenata', date: windowInfo.releaseDate, weekKey: windowInfo.periodStart, periodStart: windowInfo.periodStart, periodEnd: windowInfo.periodEnd, dueDate: windowInfo.dueDate, clients, source: 'ClickUp Raspodela klijenata', assignmentSyncedAt: source.syncedAt, status: 'sent', createdAt: now };
    reports.unshift(report); created.push(report);
  }
  return created;
}
function cleanAnswers(report, input) {
  if (!Array.isArray(input) || input.length !== report.clients.length) throw new Error('Popuni sva tri polja za svakog klijenta.');
  const ids = new Set();
  return report.clients.map(client => {
    const matches = input.filter(answer => answer.clientId === client.clientId);
    if (matches.length !== 1 || ids.has(client.clientId)) throw new Error('Spisak klijenata nije potpun ili sadrži duplikate.');
    ids.add(client.clientId);
    const result = { clientId: client.clientId };
    for (const field of ['positive', 'negative', 'help']) {
      if (typeof matches[0][field] !== 'string' || !matches[0][field].trim() || matches[0][field].length > 1600) throw new Error('Za svakog klijenta obavezno upiši pozitivno, negativno i da li treba pomoć (do 1600 znakova po polju).');
      result[field] = matches[0][field].trim();
    }
    return result;
  });
}
module.exports = { weeklyWindow, active, assignments, ensureReports, cleanAnswers };
