const crypto = require('node:crypto');
const { employeeHasSmm } = require('./employee-roles.js');
const kinds = new Set(['business', 'accounts']);
const languages = new Set(['sr', 'de']);
const uuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '');
const active = e => !!e && e.active !== false && e.status !== 'Neaktivan';
const canManage = e => active(e) && (['emp-miljan', 'emp-ivana'].includes(e.id) || employeeHasSmm(e.position));
function verifySession(header, secret, now = Date.now()) {
  try {
    if (!secret || typeof header !== 'string' || header.length > 8000 || !header.startsWith('Bearer ')) return null;
    const parts = header.slice(7).split('.');
    if (parts.length !== 2) return null;
    const expected = crypto.createHmac('sha256', secret).update(parts[0]).digest('base64url');
    const got = Buffer.from(parts[1]); const want = Buffer.from(expected);
    if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return null;
    const session = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    return session.employeeId && Number.isFinite(session.exp) && session.exp > now && ['employee', 'operational-admin', 'full-admin'].includes(session.role) ? session : null;
  } catch { return null; }
}
function publicToken(id, secret) { return crypto.createHmac('sha256', secret).update('marketizo-questionnaire-v1:' + id).digest('hex'); }
function checkToken(id, token, secret) {
  if (!uuid(id) || !/^[a-f0-9]{64}$/.test(token || '')) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(publicToken(id, secret)));
}
function validQuestions(qs) {
  return Array.isArray(qs) && qs.length > 0 && qs.length <= 80 && qs.every(q => typeof q === 'string' && q.trim().length >= 2 && q.length <= 2000);
}
function validAnswers(qs, answers, complete) {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return false;
  if (Object.keys(answers).some(k => !/^\d+$/.test(k) || Number(k) >= qs.length)) return false;
  return qs.every((q, i) => (!complete && answers[i] === undefined) || (typeof answers[i] === 'string' && answers[i].length <= 10000 && (!complete || !!answers[i].trim())));
}
function publicView(row) {
  const p = row.payload;
  return { id: row.id, title: p.title, clientName: p.clientName, lang: p.lang, questions: p.questions, status: p.status, answers: p.status === 'Popunjen' ? {} : p.answers, revision: row.updated_at, expiresAt: p.expiresAt };
}
module.exports = { kinds, languages, uuid, active, canManage, verifySession, publicToken, checkToken, validQuestions, validAnswers, publicView };
