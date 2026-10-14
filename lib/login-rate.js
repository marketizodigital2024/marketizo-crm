const crypto = require('node:crypto');
async function allowLogin(req, fetchImpl, url, key, secret) {
  const ip = String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '').split(',')[0].trim();
  if (!ip) return process.env.VERCEL !== '1'; // Production must carry a platform client-IP header.
  const response = await require('./database-request.js').request(fetchImpl, `${url}/rest/v1/rpc/marketizo_allow_login_attempt`, {
    method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_key_hash: crypto.createHmac('sha256', secret).update(ip).digest('hex') }),
  });
  if (!response.ok) throw new Error('Provera zaštite prijave nije dostupna. Pokušaj ponovo.');
  return (await response.json()) === true;
}
module.exports = { allowLogin };
