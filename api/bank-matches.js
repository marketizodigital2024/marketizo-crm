'use strict';
const { accessSession, readStoredState, supabaseConfig } = require('./state.js').helpers;
const { registryFrom, matches } = require('../lib/bank-matching.js');
const ACCOUNT_ID = 35111204;
const WORKSPACE = 'wQARCwM9korPtaWQCVAu';
let cache = null;
function json(res, code, body) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Vary', 'Authorization');
  res.end(JSON.stringify(body));
}
async function transactions(key) {
  if (cache && cache.key === key && Date.now() - cache.at < 30000) return cache.rows;
  const cutoff = new Intl.DateTimeFormat('en-CA', { timeZone:'Europe/Vienna',year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date());
  const rows = [], deadline = Date.now() + 20000;
  let expected = null;
  for (let offset = 0; offset < 10000; offset += 250) {
    const query = new URLSearchParams({ limit:'250',offset:String(offset),sortBy:'_id',order:'asc',bookedAfter:'2026-01-01T00:00:00.000Z',bookedBefore:cutoff+'T23:59:59.999Z' });
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error('Bank timeout');
    const response = await fetch(`https://api.kontoflux.io/v1/${WORKSPACE}/accounts/${ACCOUNT_ID}/transactions?${query}`, { method:'GET', headers:{ Authorization:'Bearer '+key },signal:AbortSignal.timeout(remaining) });
    if (!response.ok) throw new Error('Bank unavailable');
    const page = await response.json();
    if (!Array.isArray(page)) throw new Error('Invalid bank response');
    const total = Number(response.headers.get('X-Total-Count'));
    if (Number.isSafeInteger(total) && total > 0) expected = total;
    rows.push(...page);
    if (page.length < 250) {
      if (expected !== null && rows.length !== expected) throw new Error('Incomplete bank response');
      if (rows.some(t => t.accountId !== ACCOUNT_ID || t.account?.iban !== 'AT081200010034820943')) throw new Error('Unexpected bank account');
      cache = {key, at:Date.now(), rows}; return rows;
    }
  }
  throw new Error('Bank response exceeds limit');
}
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow','GET'); return json(res,405,{ok:false,error:'Ovaj prikaz dozvoljava samo čitanje bankarskih uplata.'}); }
  if (!/^Bearer\s+\S+/i.test(String(req.headers?.authorization || ''))) return json(res,401,{ok:false,error:'Prijava je obavezna.'});
  const config = supabaseConfig();
  if (!config.configured) return json(res,503,{ok:false,error:'Online provera pristupa trenutno nije dostupna.'});
  try {
    const current = await readStoredState(config);
    const access = accessSession(req,current.payload,config.key);
    if (!access) return json(res,401,{ok:false,error:'Prijava je obavezna.'});
    if (access.role !== 'full-admin') return json(res,403,{ok:false,error:'Bankarske uplate su dostupne samo vlasnicima.'});
    const url = new URL(req.url,'https://app.marketizo.com');
    const month = url.searchParams.get('month') || '';
    if (!/^2026-(0[1-9]|1[0-2])$/.test(month)) return json(res,400,{ok:false,error:'Izaberi mesec iz 2026. godine.'});
    const key = process.env.KONTOFLUX_READ_KEY, rawRegistry = process.env.BANK_DRIVE_REGISTRY;
    if (!key || !rawRegistry) return json(res,503,{ok:false,error:'Povezivanje banke i originalnih Drive računa još nije uključeno.'});
    const registry = process.env.FINANCE_GOOGLE_AUDIENCES ? await require('../lib/finance-source-store.js').loadBankRegistry(config,rawRegistry) : registryFrom(rawRegistry);
    const rows = await transactions(key);
    return json(res,200,{ok:true,readOnly:true,month,bankAccountLast4:'0943',fetchedAt:new Date().toISOString(),registryCheckedAt:registry.checkedAt,invoices:matches(registry,rows,month)});
  } catch {
    return json(res,502,{ok:false,error:'Banka ili registar originalnih računa trenutno nisu dostupni. Postojeća plaćanja nisu menjana.'});
  }
};
module.exports._test = { transactions, clearCache:()=>{cache=null;} };
