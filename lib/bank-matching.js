'use strict';
const compact = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
function refs(purpose) {
  const out = new Set();
  for (const pattern of [/(?:rechnung|rehnung|invoice|re\.?\s*nr\.?|renr\.?|rnr\.?)\s*[:.#-]*\s*(?:nr\.?\s*)?0*(\d{3,6})(?!\d)/gi, /(?<!\d)0+(\d{3})(?!\d)/g, /^\s*(\d{3,6})\s*(?:,|$)/g]) {
    for (const match of String(purpose || '').matchAll(pattern)) out.add(Number(match[1]));
  }
  return [...out];
}
function registryFrom(value) {
  const r = typeof value === 'string' ? JSON.parse(value) : value;
  if (!r || r.version !== 1 || !Array.isArray(r.invoices) || r.invoices.length > 1000 || !/^\d{4}-\d{2}-\d{2}$/.test(r.checkedAt)) throw new Error('Drive registry is invalid');
  const ids = new Set();
  for (const x of r.invoices) {
    if (!x.id || ids.has(x.id) || !Number.isSafeInteger(x.number) || !Number.isSafeInteger(x.gross) || !/^\d{4}-\d{2}$/.test(x.month) || !Array.isArray(x.issues) || !Array.isArray(x.ibans) || !Array.isArray(x.aliases)) throw new Error('Drive invoice is invalid');
    ids.add(x.id);
  }
  return r;
}
function matches(registry, transactions, month) {
  const unique = new Map();
  for (const t of transactions) {
    if (t.accountId !== 35111204 || t.account?.iban !== 'AT081200010034820943') throw new Error('Unexpected bank account');
    if (!unique.has(t.id)) unique.set(t.id, t);
  }
  const invoices = registry.invoices.filter(x => x.month === month);
  const globalNumbers = new Map();
  for (const x of registry.invoices) globalNumbers.set(x.number, (globalNumbers.get(x.number) || 0) + 1);
  const assigned = new Set();
  const credits = [...unique.values()].filter(t => t.amount > 0 && t.currency === 'EUR').map(t => ({ id: String(t.id), date: t.bookingDate.slice(0, 10), cents: Math.round(t.amount * 100), purpose: String(t.purpose || ''), payer: String(t.counterpart?.name || ''), iban: t.counterpart?.iban || '', refs: refs(t.purpose) }));
  const result = invoices.map(x => {
    const confirmed = credits.filter(t => t.refs.length === 1 && t.refs[0] === x.number && globalNumbers.get(x.number) === 1 && !x.issues.length && x.printedNumber === x.number && t.date >= x.date && (!x.net || !Number.isInteger(x.vat) || x.net + x.vat === x.gross));
    confirmed.forEach(t => assigned.add(t.id));
    const paid = confirmed.reduce((s, t) => s + t.cents, 0);
    const possible = credits.filter(t => !confirmed.some(p => p.id === t.id) && (x.ibans.includes(t.iban) || x.aliases.some(a => a.length >= 5 && compact(t.payer + ' ' + t.purpose).includes(a))));
    const status = x.issues.length ? 'document-review' : paid === x.gross && confirmed.length ? 'covered' : paid > x.gross ? 'overpayment-review' : paid > 0 ? 'partial' : possible.length ? 'allocation-review' : 'not-found';
    return { invoiceId: x.id, clientId: x.clientId || null, clientShares:x.clientShares||null, source:x.source||'drive', billingInvoiceId:x.billingInvoiceId||null, clientLinkVerified: x.clientLinkVerified === true, number: x.number, client: x.client, filename: x.filename, sha256: x.sha256, issuedAt: x.date, serviceMonth: x.month, grossCents: x.gross, netCents: x.net, vatCents: x.vat, issues: x.issues, status, bankPaidCents: paid, remainingGrossCents: x.gross - paid, coveredAt: status === 'covered' ? confirmed.map(t => t.date).sort().at(-1) : '', payments: confirmed.map(publicPayment), candidates: possible.map(publicPayment) };
  });
  // A single payment can only be a confirmed match to one original document.
  const ids = result.flatMap(x => x.payments.map(p => p.id));
  if (new Set(ids).size !== ids.length) throw new Error('Ambiguous bank allocation');
  return result;
}
function publicPayment(t) { return { id: t.id, date: t.date, amountCents: t.cents, payer: t.payer, purpose: t.purpose }; }
module.exports = { registryFrom, matches, refs };
