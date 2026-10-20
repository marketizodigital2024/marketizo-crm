'use strict';
const { withRequestBudget } = require('../lib/database-request.js');
const { CATEGORIES, SignError, validateDraft, assertReady, renderHtml } = require('../lib/sign-content.js');
const { createStore } = require('../lib/sign-store.js');
const { createWorkflow, readiness, hash } = require('../lib/sign-workflow.js');
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const STATUSES = ['draft', 'ready', 'sent', 'viewed', 'signing', 'signed', 'declined', 'expired', 'voided'];
function requireId(value) { if (!UUID.test(String(value || ''))) throw new SignError(400, 'Neispravan identifikator.'); return value; }
function json(res, status, body) { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(body)); }
async function readBody(req) {
  if (!String(req.headers?.['content-type'] || '').toLowerCase().startsWith('application/json')) throw new SignError(415, 'Potreban je JSON zahtev.');
  if (req.body !== undefined) {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (Buffer.byteLength(raw) > 300000) throw new SignError(413, 'Dokument je prevelik.');
    try { return JSON.parse(raw); } catch { throw new SignError(400, 'Zahtev nije ispravan.'); }
  }
  const parts = []; let size = 0;
  for await (const part of req) { const chunk = Buffer.from(part); size += chunk.length; if (size > 300000) throw new SignError(413, 'Dokument je prevelik.'); parts.push(chunk); }
  try { return JSON.parse(Buffer.concat(parts).toString('utf8')); } catch { throw new SignError(400, 'Zahtev nije ispravan.'); }
}
function createHandler(deps = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      if (!['GET', 'POST'].includes(req.method)) { res.setHeader('Allow', 'GET, POST'); return json(res, 405, { ok: false, error: 'Metod nije podržan.' }); }
      if (!/^Bearer\s+\S+/i.test(req.headers?.authorization || '')) throw new SignError(401, 'Prijavi se u Marketizo.');
      if (req.method === 'POST' && req.headers.origin && req.headers.origin !== (process.env.SIGN_APP_ORIGIN || 'https://app.marketizo.com')) throw new SignError(403, 'Poreklo zahteva nije dozvoljeno.');
      const helpers = deps.helpers || require('./state.js').helpers;
      const config = helpers.supabaseConfig();
      if (!config.configured) throw new SignError(503, 'Online baza nije povezana.');
      const current = await helpers.readStoredState(config);
      const access = helpers.accessSession(req, current.payload, config.key);
      if (access?.role !== 'full-admin') throw new SignError(403, 'Marketizo Sign je dostupan vlasnicima aplikacije.');
      const store = (deps.createStore || createStore)({ ...config, organization: process.env.CRM_STATE_ID || 'marketizo-main' });
      const query = new URL(req.url, 'https://app.marketizo.com').searchParams;
      if (req.method === 'GET') {
        const action = query.get('action') || 'list';
        const kind = query.get('kind') === 'template' ? 'template' : 'document';
        if (action === 'bootstrap') return json(res, 200, { ok: true, categories: CATEGORIES, signatureMethod: 'ses',
          integration: readiness(),
          people: [...(current.payload.clients || []).filter(c => c.status !== 'Arhiviran').map(c => ({ id: c.id, kind: 'client', name: c.name, email: c.email || '' })), ...(current.payload.employees || []).filter(e => e.active !== false && e.status !== 'Neaktivan').map(e => ({ id: e.id, kind: 'employee', name: e.name, email: e.email || '' }))] });
        if (['original', 'receipt', 'evidence', 'requestStatus'].includes(action)) {
          const id = requireId(query.get('id')); await store.get('document', id);
          const flow = (deps.createWorkflow || createWorkflow)({ ...config, organization: process.env.CRM_STATE_ID || 'marketizo-main' });
          const data = await flow.adminArtifact(id, action === 'requestStatus' ? 'status' : action);
          if (action === 'evidence' || action === 'requestStatus') return json(res, 200, data);
          if (hash(data.bytes) !== data.sha256) throw new SignError(503, 'PDF integritet nije potvrđen.');
          res.statusCode = 200; res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', 'inline; filename="Marketizo-ugovor.pdf"'); return res.end(data.bytes);
        }
        if (action === 'get' || action === 'preview' || action === 'audit') {
          const id = requireId(query.get('id')), doc = await store.get(kind, id);
          if (action === 'audit') return json(res, 200, { ok: true, events: await store.events(id) });
          if (action === 'preview') {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'; sandbox");
            res.statusCode = 200; return res.end(renderHtml(validateDraft(doc.data, kind)));
          }
          return json(res, 200, { ok: true, document: doc });
        }
        if (action !== 'list') throw new SignError(400, 'Nepoznata akcija.');
        const category = query.get('category') || '', status = query.get('status') || '';
        if ((category && !CATEGORIES.includes(category)) || (status && !STATUSES.includes(status))) throw new SignError(400, 'Proveri filtere.');
        const offset = Number(query.get('offset') || 0);
        if (!Number.isInteger(offset) || offset < 0 || offset > 100000) throw new SignError(400, 'Proveri stranicu rezultata.');
        return json(res, 200, { ok: true, ...await store.list(kind, { category, status, offset, archived: query.get('archived') === 'true', search: String(query.get('search') || '').slice(0, 120) }) });
      }
      const body = await readBody(req);
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new SignError(400, 'Zahtev nije ispravan.');
      if (body.action === 'preparePdf') {
        const doc = await store.get('document', requireId(body.id));
        const flow = (deps.createWorkflow || createWorkflow)({ ...config, organization: process.env.CRM_STATE_ID || 'marketizo-main' });
        return json(res, 200, await flow.preparePdf(access.employee.id, doc));
      }
      if (body.action === 'send' || body.action === 'void') {
        const id = requireId(body.id), doc = await store.get('document', id);
        const flow = (deps.createWorkflow || createWorkflow)({ ...config, organization: process.env.CRM_STATE_ID || 'marketizo-main' });
        if (body.action === 'void') {
          const status = await flow.adminArtifact(id, 'status'); return json(res, 200, await flow.rpc('void', { actor: access.employee.id, requestId: status.request.id }));
        }
        if (!Number.isInteger(body.revision) || body.revision < 1) throw new SignError(400, 'Proveri verziju dokumenta.');
        requireId(body.commandId);
        const result = await flow.prepare(access.employee.id, body, doc); await flow.drain(3).catch(() => {}); return json(res, 200, result);
      }
      if (!['save', 'freeze', 'archive', 'restore'].includes(body.action)) throw new SignError(400, 'Nepoznata akcija.');
      const kind = body.kind === 'template' ? 'template' : 'document';
      const payload = { id: requireId(body.id), kind, revision: body.revision };
      if (!Number.isInteger(payload.revision) || payload.revision < 0) throw new SignError(400, 'Proveri verziju dokumenta.');
      if (body.action === 'save') payload.data = validateDraft(body.data, kind);
      if (body.action === 'freeze') {
        if (kind !== 'document') throw new SignError(400, 'Šablon se ne zaključava za potpis.');
        const doc = await store.get(kind, payload.id);
        assertReady(validateDraft(doc.data));
      }
      return json(res, 200, await store.command(access.employee.id, requireId(body.commandId), body.action, payload));
    } catch (error) {
      return json(res, error instanceof SignError ? error.status : 503, { ok: false, error: error instanceof SignError ? error.message : 'Marketizo Sign trenutno nije dostupan. Pokušaj ponovo; unos nije izgubljen.' });
    }
  };
}
module.exports = (req, res) => withRequestBudget(() => createHandler()(req, res), 90000);
module.exports.createHandler = createHandler;
