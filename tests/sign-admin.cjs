'use strict';
const assert = require('node:assert/strict');
const { createHandler } = require('../api/sign-admin.js');
const { createStore } = require('../lib/sign-store.js');
const id = '783f9585-50ad-4f62-bb33-ec7cb089b716';
const commandId = 'c70ab977-6c3f-4355-8e9d-de052a0d5331';
const data = { title: 'Fixture', category: 'clients', content: { version: 1, blocks: [{ type: 'paragraph', runs: [{ text: 'Fixture text' }] }] }, recipients: [{ name: 'Tester', email: 'tester@example.com', country: 'AT' }] };
let role = 'full-admin', calls = [], saveError = false;
const doc = { id, revision: 1, status: 'draft', data };
const store = { async list(kind, filters) { calls.push({ kind, filters }); return { items: [], hasMore: false }; }, async get() { return doc; }, async events() { return []; }, async command(actor, command, action, payload) { calls.push({ actor, command, action, payload }); if (saveError) throw Error('private upstream detail'); return { ok: true, id, revision: 2 }; } };
const handler = createHandler({ helpers: { supabaseConfig() { return { configured: true, url: 'https://fixture.invalid', key: 'secret' }; }, async readStoredState() { return { payload: { employees: [{ id: 'emp-miljan', name: 'Test Owner', email: 'owner@example.com', salary: 8000, password: 'NEVER EXPOSE' }], clients: [] } }; }, accessSession() { return role ? { role, employee: { id: 'emp-miljan' } } : null; } }, createStore() { return store; } });
async function call(method = 'GET', url = '/api/sign-admin', body, headers = {}) {
  const req = { method, url, body, headers: { authorization: 'Bearer fixture', 'content-type': 'application/json', ...headers } };
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(body) { this.body = body; } };
  await handler(req, res); return { status: res.statusCode, headers: res.headers, raw: res.body, result: res.headers['Content-Type'].startsWith('application/json') ? JSON.parse(res.body) : null };
}
(async () => {
  assert.equal((await call('GET', undefined, undefined, { authorization: '' })).status, 401);
  for (const value of ['employee', 'client', 'operational-admin', null]) { role = value; assert.equal((await call()).status, 403); }
  assert.equal(calls.length, 0); role = 'full-admin';
  const boot = await call('GET', '/api/sign-admin?action=bootstrap'); assert.equal(boot.result.integration.sendingEnabled, false); assert.ok(!boot.raw.includes('salary')); assert.ok(!boot.raw.includes('NEVER EXPOSE')); assert.equal(boot.headers['Cache-Control'], 'private, no-store');
  assert.equal((await call('POST', undefined, { action: 'send' })).status, 503); assert.equal(calls.length, 0);
  assert.equal((await call('POST', undefined, { action: 'save' }, { origin: 'https://evil.example' })).status, 403);
  assert.equal((await call('GET', '/api/sign-admin?offset=-1')).status, 400);
  assert.equal((await call('GET', '/api/sign-admin?category=wrong')).status, 400);
  assert.equal((await call('POST', undefined, '{invalid')).status, 400);
  assert.equal((await call('POST', undefined, 'x'.repeat(300001))).status, 413);
  const payload = { action: 'save', kind: 'document', id, commandId, revision: 0, data: { ...data, legalReview: 'approved', signatureMethod: 'simple' } };
  assert.equal((await call('POST', undefined, payload)).status, 200);
  assert.equal(calls[0].payload.data.signatureMethod, 'qes'); assert.equal(calls[0].payload.data.legalReview, 'pending'); assert.equal(calls[0].actor, 'emp-miljan');
  saveError = true; const failed = await call('POST', undefined, payload); assert.equal(failed.status, 503); assert.ok(!failed.raw.includes('private upstream')); saveError = false;
  assert.equal((await call('POST', undefined, { action: 'freeze', kind: 'document', id, commandId, revision: 1 })).status, 200);
  const preview = await call('GET', `/api/sign-admin?action=preview&id=${id}`); assert.equal(preview.status, 200); assert.ok(preview.headers['Content-Security-Policy'].includes('sandbox')); assert.ok(preview.raw.includes('NACRT'));
  let requestUrl = '';
  const db = createStore({ url: 'https://fixture.invalid', key: 'private-key', organization: 'marketizo-main' }, async url => { requestUrl = url; return { ok: true, json: async () => [] }; });
  await db.list('document', { search: 'a*),status.eq.signed', offset: 0, archived: false });
  const q = new URL(requestUrl).searchParams; assert.equal(q.get('organization_id'), 'eq.marketizo-main'); assert.ok(!q.get('search_text').includes(')')); assert.ok(!q.get('search_text').slice(7, -1).includes('*')); assert.ok(!requestUrl.includes('private-key'));
  await assert.rejects(db.get('document', id), /nije pronađen/);
  console.log('PASS: Sign API protects all routes, minimizes CRM directory data, blocks sending, sanitizes search, preserves error confidentiality and sends only validated commands to the database.');
})().catch(e => { console.error(e); process.exitCode = 1; });
