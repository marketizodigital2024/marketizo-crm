const db = require('../lib/database-request.js');
const core = require('../lib/client-weekly-reports.js');
const crypto = require('node:crypto');
function send(res, code, body) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); }
function sessionFor(req, secret) {
  try {
    const [data, signature] = String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '').split('.');
    const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
    if (!signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const session = JSON.parse(Buffer.from(data, 'base64url'));
    return session.exp > Date.now() && ['employee', 'operational-admin', 'full-admin'].includes(session.role) ? session : null;
  } catch { return null; }
}
function canView(actor, report) {
  return report.employeeId === actor.id || (actor.isLeader && (report.recipientId === actor.id || ['emp-miljan', 'emp-ivana'].includes(actor.id)));
}
async function handler(req, res) {
  if (require('../lib/environment.js').blockProductionFeatureInPreview(res, typeof process === 'undefined' ? {} : process.env)) return;
  if (!['GET', 'POST'].includes(req.method)) return send(res, 405, { ok: false, error: 'Metod nije podržan.' });
  const url = String(process.env.SUPABASE_URL || '').replace(/\/$/, ''), key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return send(res, 503, { ok: false, error: 'Baza nije dostupna.' });
  const cron = req.method === 'GET' && Boolean(process.env.CRON_SECRET) && req.headers?.authorization === `Bearer ${process.env.CRON_SECRET}`;
  const session = cron ? null : sessionFor(req, process.env.EMPLOYEE_SESSION_SECRET || key);
  if (!cron && !session?.employeeId) return send(res, 401, { ok: false, error: 'Prijava je obavezna.' });
  const windowInfo = core.weeklyWindow();
  if (cron && (windowInfo.today !== windowInfo.releaseDate || windowInfo.localHour !== 12)) return send(res, 200, { ok: true, skipped: true });
  const table = process.env.SUPABASE_TABLE || 'agency_crm_state', id = process.env.CRM_STATE_ID || 'marketizo-main';
  const root = `${url}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`;
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  let body = req.body || {};
  try {
    if (typeof body === 'string') body = JSON.parse(body);
    const action = cron ? 'ensure' : req.method === 'GET' ? 'read' : body.action;
    if (!['read', 'ensure', 'submit', 'acknowledge'].includes(action)) return send(res, 400, { ok: false, error: 'Nepoznata akcija.' });
    let source;
    for (let attempt = 0; attempt < 5; attempt++) {
      const response = await db.request(fetch, `${root}&select=${action === 'read' ? 'employees:payload->employees,reports:payload->employeeReports,updated_at' : 'payload,updated_at'}`, { headers });
      if (!response.ok) throw new Error('Čitanje izveštaja nije uspelo.');
      const row = (await response.json())[0];
      if (action === 'read' && row) row.payload = { employees: row.employees, employeeReports: row.reports };
      if (!row?.payload) throw new Error('Glavni zapis nije pronađen.');
      const payload = row.payload;
      const actor = cron ? null : (payload.employees || []).find(e => e.id === session.employeeId && core.active(e, windowInfo.today));
      if (!cron && !actor) return send(res, 403, { ok: false, error: 'Nalog nije aktivan.' });
      let changed = false, report;
      if (action === 'ensure') {
        source ||= await require('./kpi.js').internal.clickupRoster();
        if (!source.live) return send(res, 503, { ok: false, error: source.error || 'ClickUp nije dostupan.' });
        changed = core.ensureReports(payload, source, windowInfo, new Date().toISOString(), actor?.isLeader ? (payload.employees || []).filter(e => e.id === actor.id || e.leaderId === actor.id || ['emp-miljan', 'emp-ivana'].includes(actor.id)).map(e => e.id) : actor?.id).length > 0;
      } else if (action === 'submit' || action === 'acknowledge') {
        report = (payload.employeeReports || []).find(r => r.id === body.reportId && r.isClientWeeklyReport);
        if (!report || !canView(actor, report)) return send(res, 403, { ok: false, error: 'Izveštaj nije dodeljen ovom nalogu.' });
        if (action === 'submit') {
          if (report.employeeId !== actor.id) return send(res, 403, { ok: false, error: 'Možeš popuniti samo svoj izveštaj.' });
          const answers = core.cleanAnswers(report, body.answers);
          if (report.submittedAt && JSON.stringify(answers) !== JSON.stringify(report.clientAnswers)) return send(res, 409, { ok: false, error: 'Izveštaj je već poslat. Sačuvani odgovori nisu promenjeni.' });
          if (!report.submittedAt) { Object.assign(report, { clientAnswers: answers, submittedAt: new Date().toISOString(), status: 'completed' }); changed = true; }
        } else {
          if (!actor.isLeader || !report.submittedAt || report.employeeId === actor.id) return send(res, 403, { ok: false, error: 'Samo lider potvrđuje primljeni izveštaj.' });
          if (!report.acknowledgedAt) { Object.assign(report, { acknowledgedAt: new Date().toISOString(), acknowledgedBy: actor.id }); changed = true; }
        }
      }
      if (changed) {
        const update = await db.request(fetch, `${root}&updated_at=eq.${encodeURIComponent(row.updated_at)}&select=updated_at`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify({ payload, updated_at: new Date().toISOString() }) });
        if (!update.ok) throw new Error('Čuvanje izveštaja nije uspelo.');
        if (!(await update.json()).length) continue;
      }
      return send(res, 200, { ok: true, report, reports: (payload.employeeReports || []).filter(r => r.isClientWeeklyReport && (cron || canView(actor, r))), window: windowInfo, syncedAt: source?.syncedAt, assignmentPreview: source ? (payload.employees || []).filter(e => core.active(e, windowInfo.today) && (cron || e.id === actor.id || (actor.isLeader && (e.leaderId === actor.id || ['emp-miljan', 'emp-ivana'].includes(actor.id))))).map(e => ({ employeeId: e.id, employeeName: e.name, clients: core.assignments(e, payload.employees, source.rows) })) : undefined });
    }
    return send(res, 409, { ok: false, error: 'Baza je zauzeta. Odgovori su zadržani; pokušaj ponovo.' });
  } catch (error) { return send(res, 400, { ok: false, error: error.message || 'Izveštaj nije sačuvan.' }); }
}
module.exports = (req, res) => db.withRequestBudget(() => handler(req, res), 25000);
module.exports.helpers = { sessionFor, canView };
