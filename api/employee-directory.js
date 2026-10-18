// Read-only operational projection. No CRM session, database key or HR rows leave CRM.
const crypto = require('node:crypto');
const AUDIENCE = 'https://app.marketizo.com/api/employee-directory';
const SERVICE = 'apolo-cloud-pilot@marketizo-agent-core.iam.gserviceaccount.com';
const SUBJECT = '101722915310559318926';
let cached = { keys: [], until: 0 };
async function authorize(header, fetcher = fetch, now = Date.now()) {
  if (typeof header !== 'string' || !header.startsWith('Bearer ') || header.length > 12000) return false;
  try {
    const parts = header.slice(7).split('.');
    if (parts.length !== 3 || parts.some(x => !/^[A-Za-z0-9_-]+$/.test(x))) return false;
    const head = JSON.parse(Buffer.from(parts[0], 'base64url'));
    const claim = JSON.parse(Buffer.from(parts[1], 'base64url'));
    if (head.alg !== 'RS256' || typeof head.kid !== 'string' || head.kid.length > 200 || claim.sub !== SUBJECT) return false;
    const seconds = now / 1000;
    if (!['https://accounts.google.com', 'accounts.google.com'].includes(claim.iss) || claim.aud !== AUDIENCE || claim.email !== SERVICE || claim.email_verified !== true || !/^\d{15,30}$/.test(claim.sub || '') || !Number.isFinite(claim.exp) || !Number.isFinite(claim.iat) || claim.exp <= seconds || claim.iat > seconds + 30 || claim.exp - claim.iat > 3700 || claim.iat < seconds - 3700) return false;
    if (cached.until <= now || !cached.keys.some(x => x.kid === head.kid)) {
      const response = await fetcher('https://www.googleapis.com/oauth2/v3/certs', { signal: AbortSignal.timeout(5000), redirect: 'error' });
      if (!response.ok) return false;
      const data = await response.json();
      if (!Array.isArray(data.keys)) return false;
      cached = { keys: data.keys, until: now + 300000 };
    }
    const jwk = cached.keys.find(x => x.kid === head.kid && x.kty === 'RSA' && x.alg === 'RS256' && x.use === 'sig');
    return !!jwk && crypto.verify('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), crypto.createPublicKey({ key: jwk, format: 'jwk' }), Buffer.from(parts[2], 'base64url'));
  } catch { return false; }
}
const text = (value, max = 200) => typeof value === 'string' ? value.slice(0, max) : '';
function project(current) {
  if (!Array.isArray(current?.payload?.employees)) throw new Error('directory_unavailable');
  const employees = current.payload.employees.map(e => ({
    id: text(e.id), name: text(e.name), email: text(e.email, 254).trim().toLowerCase(),
    position: text(e.position), status: text(e.status), active: e.active !== false && e.status !== 'Neaktivan',
    leader_id: text(e.leaderId), clickup_id: text(e.clickupUserId || e.clickupId)
  }));
  if (employees.some(e => !e.id) || new Set(employees.map(e => e.id)).size !== employees.length) throw new Error('directory_invalid');
  const ids = new Set(employees.map(e => e.id));
  const assignments = (Array.isArray(current.payload.assignments) ? current.payload.assignments : []).map(a => ({
    client_id: text(a.clientId), roles: (Array.isArray(a.roles) ? a.roles : []).filter(r => ids.has(r.employeeId)).map(r => ({ employee_id: text(r.employeeId), role: text(r.role) }))
  }));
  return { employees, assignments, source_updated_at: text(current.updatedAt), checked_at: new Date().toISOString(), read_only: true };
}
async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  if (!(await authorize(req.headers.authorization))) return res.status(401).json({ error: 'service_identity_required' });
  try {
    const { supabaseConfig, readStoredState } = require('./state.js').helpers;
    const config = supabaseConfig();
    if (!config.configured) return res.status(503).json({ error: 'directory_unavailable' });
    return res.status(200).json(project(await readStoredState(config)));
  } catch { return res.status(503).json({ error: 'directory_unavailable' }); }
}
module.exports = handler;
module.exports.helpers = { authorize, project, AUDIENCE, SERVICE };
