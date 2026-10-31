'use strict';
// Production-only features must fail before reading or writing any real domain.
// The state/auth/questionnaire modules retain their separately scoped preview data.
function blockProductionFeatureInPreview(res, env = process.env) {
  if (env.VERCEL_ENV !== 'preview') return false;
  res.statusCode = 409;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({ ok: false, error: 'Ova radnja nije dostupna u probnoj verziji.' }));
  return true;
}
function sessionSecret(base,env=process.env){return env.VERCEL_ENV==='preview'?require('node:crypto').createHmac('sha256',base).update('marketizo-preview-session-v1').digest('hex'):base;}
module.exports = { blockProductionFeatureInPreview, sessionSecret };
