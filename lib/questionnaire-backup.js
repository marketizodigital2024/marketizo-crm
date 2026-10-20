'use strict';
const FORMAT = 'marketizo-questionnaires-v1';
function validSnapshot(snapshot) {
  return !!snapshot && snapshot.format === FORMAT && snapshot.namespace === 'production'
    && (!snapshot.defaultTemplates || (typeof snapshot.defaultTemplates === 'object' && !Array.isArray(snapshot.defaultTemplates)
      && Object.entries(snapshot.defaultTemplates).every(([key,t]) => /^(business|accounts)-(sr|de)$/.test(key) && t && Array.isArray(t.questions) && t.questions.every(q=>typeof q === 'string'))))
    && Array.isArray(snapshot.rows) && new Set(snapshot.rows.map(r => r?.id)).size === snapshot.rows.length
    && snapshot.rows.every(r => r && typeof r.id === 'string' && r.id.length > 0
      && r.payload && typeof r.payload === 'object' && !Array.isArray(r.payload)
      && (r.payload.recordType === 'invite' || (r.id.startsWith('template:') && Array.isArray(r.payload.questions)))
      && typeof r.updated_at === 'string' && Number.isFinite(Date.parse(r.updated_at)));
}
function summary(snapshot) {
  if (snapshot == null) return { included: false, records: 0, templates: 0, invitations: 0, completed: 0 };
  if (!validSnapshot(snapshot)) throw new Error('Backup upitnika nije prošao proveru strukture.');
  return { included: true, records: snapshot.rows.length,
    templates: new Set([...Object.keys(snapshot.defaultTemplates || {}).map(k=>'template:'+k),...snapshot.rows.filter(r=>r.id.startsWith('template:')).map(r=>r.id)]).size,
    invitations: snapshot.rows.filter(r => r.payload.recordType === 'invite').length,
    completed: snapshot.rows.filter(r => r.payload.recordType === 'invite' && r.payload.status === 'Popunjen').length };
}
async function readSnapshot(url, key) {
  const response = await fetch(`${url}/rest/v1/rpc/marketizo_questionnaire_snapshot`, {
    method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: '{}',
  });
  if (!response.ok) throw new Error(`Čitanje upitnika za backup nije uspelo (${response.status}).`);
  const snapshot = await response.json();
  summary(snapshot);
  snapshot.defaultTemplates = require('./questionnaire-templates.json');
  return snapshot;
}
function equal(a,b) {
  const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(k => [k,stable(value[k])])) : value;
  return JSON.stringify(stable(a)) === JSON.stringify(stable(b));
}
module.exports = { validSnapshot, summary, readSnapshot, equal };
