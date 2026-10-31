'use strict';
const { createHash } = require('node:crypto');
const { matches } = require('./bank-matching.js');
const cents = n => Math.round(Number(n) * 100);
const digest = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
function plan(payload, registry, transactions, now = new Date()) {
  const currentMonth = new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Vienna',year:'numeric',month:'2-digit'}).format(now).slice(0,7);
  const months = [...new Set(registry.invoices.map(x=>x.month))].filter(m=>m>='2026-10'&&m<=currentMonth);
  const proofs = months.flatMap(m=>matches(registry, transactions, m));
  const originals = new Map(registry.invoices.map(x=>[x.id,x]));
  const used = require('./finance-payment-actions.js').reviewedIds(payload);
  for (const client of payload.clients || []) for (const invoice of Object.values(client.invoices || {})) for (const p of invoice.payments || []) {
    for(const id of p.bankTransactionIds || []) used.add(String(id));
    for(const t of transactions) if(String(p.note||'').includes('Bank ID '+t.id)) used.add(String(t.id));
  }
  const clients=structuredClone(payload.clients||[]), posted=[];
  for(const x of proofs) {
    const source=originals.get(x.invoiceId);
    if(x.status!=='covered'||!x.clientLinkVerified||x.issues.length||x.payments.length!==1||!/^[a-f0-9]{64}$/i.test(source.sha256||'')) continue;
    if(!Number.isSafeInteger(x.netCents)||!Number.isSafeInteger(x.vatCents)||x.netCents<=0||x.vatCents<0||x.netCents+x.vatCents!==x.grossCents)continue;
    const p=x.payments[0], transaction=transactions.find(t=>String(t.id)===p.id);
    if(!/(?:rechnung|rehnung|invoice|re\.?\s*nr\.?|renr\.?|rnr\.?)\s*[:.#-]*\s*(?:nr\.?\s*)?0*\d{3,6}(?!\d)/i.test(p.purpose))continue;
    const normalizePayer=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
    const crmPayer=source.source==='crm'&&normalizePayer(source.client).length>=5&&normalizePayer(source.client)===normalizePayer(transaction?.counterpart?.name);
    if(!transaction||!(source.ibans.includes(transaction.counterpart?.iban)||crmPayer)||p.amountCents!==x.grossCents||used.has(p.id))continue;
    if(registry.invoices.filter(i=>i.month===x.serviceMonth&&i.clientId===x.clientId).length!==1)continue;
    const matchingClients=clients.filter(c=>c.id===x.clientId);if(matchingClients.length!==1)continue;
    const client=matchingClients[0], invoice=client.invoices?.[x.serviceMonth];
    if(!invoice||client.status!=='Aktivan'||client.invoiceExcludedMonths?.includes(x.serviceMonth))continue;
    // Never replace legacy/manual payment history, cash, partials, or a paid card.
    if((invoice.payments||[]).length||Number(invoice.paidAmount||0)!==0||invoice.paidAt||['Plaćeno','Delimično'].includes(invoice.paymentStatus)|| (invoice.paymentMethod||client.paymentMethod)==='Keš')continue;
    const amount=invoice.amount===undefined||invoice.amount===null||invoice.amount===''?client.revenue:invoice.amount;
    // Marketizo revenue is net. A gross card with VAT needs explicit review.
    if(cents(amount)!==x.netCents)continue;
    const payment={id:'bank-'+p.id,date:p.date,amount:x.netCents/100,note:`Automatski: račun ${x.number}; Bank ID ${p.id}; bruto EUR ${(x.grossCents/100).toFixed(2)}`,createdAt:now.toISOString(),source:'bank-austria-kontoflux',bankTransactionIds:[p.id],bankGrossCents:x.grossCents,invoiceNumber:x.number,originalInvoiceId:x.invoiceId,originalSha256:source.sha256};
    invoice.payments=[payment];invoice.paidAmount=x.netCents/100;invoice.paymentStatus='Plaćeno';invoice.paidAt=p.date+'T12:00:00.000Z';
    if(x.serviceMonth===currentMonth)client.paymentStatus='Plaćeno';
    used.add(p.id);posted.push({clientId:client.id,client:client.name,month:x.serviceMonth,invoiceNumber:x.number,bankTransactionId:p.id,date:p.date,netCents:x.netCents,grossCents:x.grossCents});
  }
  return {payload:posted.length?{...payload,clients}:payload,posted,unchangedDigest:digest(Object.fromEntries(Object.entries(payload).filter(([k])=>k!=='clients')))};
}
module.exports={plan,digest};
