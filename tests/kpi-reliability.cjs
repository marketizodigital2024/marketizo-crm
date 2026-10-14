const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const database = require('../lib/database-request.js');
let now = Date.now(), clickupCalls = 0, writes = 0, mode = 'ok', allow = true;
const timeouts = [];
const source = fs.readFileSync(__dirname + '/../api/kpi.js', 'utf8');
const env = { SUPABASE_URL: 'https://fixture.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fixture', KPI_ADMIN_PASSWORD: 'fixture-password', KPI_SESSION_SECRET: 'fixture-sign-key', CLICKUP_API_TOKEN: 'fixture', CLICKUP_CLIENT_LIST_ID: 'fixture' };
const reply = (status, body) => ({ ok: status < 300, status, json: async () => body, text: async () => JSON.stringify(body) });
const fixtureKpi = { questions: [], assignments: [], links: [], invites: [], responses: [] };
async function fakeFetch(input, options = {}) {
  const url = new URL(input);
  if (url.hostname === 'api.clickup.com') {
    clickupCalls++;
    if (mode === 'hang') return new Promise((resolve, reject) => {
      if (options.signal.aborted) reject(options.signal.reason);
      else options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
    });
    if (url.pathname.endsWith('/field')) return reply(200, { fields: [] });
    return reply(200, { tasks: [{ name: 'QA fixture', custom_fields: [] }] });
  }
  assert.equal(url.hostname, 'fixture.invalid', 'External network forbidden');
  if (url.pathname.endsWith('marketizo_allow_login_attempt')) return reply(200, allow);
  if (options.method && options.method !== 'GET') { writes++; return reply(200, [{ payload: fixtureKpi }]); }
  const main = url.searchParams.get('id') === 'eq.marketizo-main';
  return reply(200, [{ updated_at: '2026-10-14T00:00:00Z', payload: main ? { clients: [{ id: 'qa-client', name: 'QA fixture', contractFileData: 'private fixture', loginPassword: 'private fixture' }], employees: [{ id: 'qa-worker', name: 'QA worker', password: 'private fixture' }] } : fixtureKpi }]);
}
const bounded = {
  withRequestBudget: database.withRequestBudget,
  request(fetchImpl, input, options, milliseconds = 8000) {
    timeouts.push(milliseconds);
    return database.request(fetchImpl, input, options, milliseconds === 3500 ? 20 : milliseconds);
  },
};
const ctx = { module: { exports: {} }, process: { env }, require: name => name === '../lib/database-request.js' ? bounded : name === '../lib/login-rate.js' ? require('../lib/login-rate.js') : require(name), fetch: fakeFetch, Buffer, URL, AbortController, setTimeout, clearTimeout, Date: class extends Date { static now() { return now; } } };
vm.createContext(ctx); vm.runInContext(source, ctx);
const expiry = String(now + 3600000), mac = crypto.createHmac('sha256', env.KPI_SESSION_SECRET).update(expiry).digest('hex');
async function call(action, body, authenticated = false) {
  let result, cookie;
  const res = { status(code) { this.statusCode = code; return this; }, setHeader(key, value) { if (key === 'Set-Cookie') cookie = value; return this; }, json(body) { result = { status: this.statusCode, body, cookie }; } };
  await ctx.module.exports({ method: body ? 'POST' : 'GET', query: { action }, body, headers: { 'x-forwarded-for': '192.0.2.1', cookie: authenticated ? `marketizoKpi=${expiry}.${mac}` : '' } }, res);
  return result;
}
(async () => {
  assert.equal((await call('admin')).status, 401);
  assert.equal((await call('login', { password: 'wrong' })).status, 401);
  let result = await call('login', { password: env.KPI_ADMIN_PASSWORD });
  assert.equal(result.status, 200); assert.match(result.cookie, /HttpOnly; Secure; SameSite=Strict/);
  allow = false; assert.equal((await call('login', { password: env.KPI_ADMIN_PASSWORD })).status, 429); allow = true;
  const parallel = await Promise.all([call('clickupHealth'), call('clickupHealth')]);
  assert(parallel.every(result => result.status === 200)); assert.equal(clickupCalls, 2, 'Concurrent reads must share one field/task fetch');
  await call('clickupHealth'); assert.equal(clickupCalls, 2, 'Warm reads use successful 60-second cache');
  result = await call('admin', null, true); assert.equal(result.status, 200);
  assert.equal(result.body.clients[0].contractFileData, undefined); assert.equal(result.body.clients[0].loginPassword, undefined); assert.equal(result.body.employees[0].password, undefined);
  now += 61000; mode = 'hang'; const keepAlive = setTimeout(() => {}, 1000);
  result = await call('clickupHealth'); clearTimeout(keepAlive);
  assert.equal(result.status, 503); assert.equal(result.body.ok, false); assert(timeouts.includes(3500));
  mode = 'ok'; result = await call('clickupHealth'); assert.equal(result.status, 200, 'Failure must not become a cached success or prevent recovery');
  assert.equal(writes, 0, 'All read/login tests leave KPI and CRM business rows unchanged');
  assert(!/Å¡|Ä‡|Ä‘|Å¾/.test(source));
  console.log('PASS: actual KPI handler protects login, keeps secure cookie and private fields, coalesces/caches successful ClickUp reads, aborts stalled upstream calls, recovers without business writes.');
})().catch(error => { console.error(error); process.exitCode = 1; });
