'use strict';
const { request } = require('./database-request.js');
const { SignError } = require('./sign-content.js');
function createStore(config, fetchImpl = fetch) {
  const headers = { apikey: config.key, Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json' };
  async function call(path, options = {}) {
    const r = await request(fetchImpl, `${config.url}/rest/v1/${path}`, { ...options, headers: { ...headers, ...options.headers } });
    if (!r.ok) {
      // Neither upstream error text nor request bodies contain safe public diagnostics.
      if (r.status === 404) throw new SignError(503, 'Marketizo Sign baza još nije pripremljena. Obrati se administratoru.');
      throw new SignError(503, 'Marketizo Sign baza trenutno nije dostupna. Sačuvani podaci nisu potvrđeni; pokušaj ponovo.');
    }
    return r.json();
  }
  const org = encodeURIComponent(config.organization);
  function table(kind) { return kind === 'template' ? 'marketizo_sign_templates' : 'marketizo_sign_documents'; }
  return {
    async list(kind, filters) {
      const query = new URLSearchParams({ select: 'id,title,category,status,revision,archived_at,updated_at,recipient_names,recipient_emails', organization_id: `eq.${config.organization}`, order: 'updated_at.desc,id.asc', limit: '41', offset: String(filters.offset) });
      if (filters.category) query.set('category', `eq.${filters.category}`);
      if (filters.status) query.set('status', `eq.${filters.status}`);
      query.set('archived_at', filters.archived ? 'not.is.null' : 'is.null');
      // Literal substring search: strip PostgREST wildcard/filter metacharacters.
      if (filters.search) query.set('search_text', `ilike.*${filters.search.replace(/[^\p{L}\p{N}\s@.\-_]/gu, ' ').trim()}*`);
      const rows = await call(`${table(kind)}?${query}`);
      return { items: rows.slice(0, 40), hasMore: rows.length > 40, offset: filters.offset };
    },
    async get(kind, id) {
      const rows = await call(`${table(kind)}?organization_id=eq.${org}&id=eq.${encodeURIComponent(id)}&select=*`);
      if (rows.length !== 1) throw new SignError(404, 'Dokument nije pronađen.');
      return rows[0];
    },
    events: id => call(`marketizo_sign_events?organization_id=eq.${org}&document_id=eq.${encodeURIComponent(id)}&select=sequence,action,actor_id,created_at,content_sha256,event_sha256,previous_sha256&order=sequence.asc&limit=1000`),
    async command(actor, commandId, action, payload) {
      const result = await call('rpc/marketizo_sign_command', { method: 'POST', body: JSON.stringify({ p_organization: config.organization, p_actor: actor, p_command: commandId, p_action: action, p_payload: payload }) });
      if (!result.ok) throw new SignError(result.status || 400, result.error || 'Izmena nije potvrđena.');
      return result;
    }
  };
}
module.exports = { createStore };
