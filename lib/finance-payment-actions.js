'use strict';
const {createHash}=require('node:crypto');
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const cents=x=>Math.round(Number(x)*100);
const fail=s=>{throw Error(s)};
function entries(payload){return(payload.clients||[]).flatMap(c=>Object.entries(c.invoices||{}).flatMap(([month,i])=>(i.payments||[]).map(p=>({client:c,month,invoice:i,payment:p}))));}
function allocations(payload,id){return entries(payload).filter(e=>e.payment.bankTransactionIds?.map(String).includes(String(id)));}
const revision=(payload,id)=>hash(allocations(payload,id).map(e=>[e.client.id,e.month,e.payment]));
function targets(payload,registry,id){
 const x=registry.invoices.find(x=>x.id===id);if(!x||!x.clientLinkVerified||x.issues.length||!x.clientId||!Number.isSafeInteger(x.net)||x.net<=0||x.net+x.vat!==x.gross||!x.sha256)fail('Izaberi provereni originalni račun.');
 return require('./billing-routing.js').shares(x).map(share=>{
  if(registry.invoices.filter(y=>y.month===x.month&&(y.clientShares||[{clientId:y.clientId}]).some(s=>s.clientId===share.clientId)).length!==1)fail('Više računa za istog klijenta i mesec zahteva zasebnu proveru.');
  const client=payload.clients.find(c=>c.id===share.clientId),invoice=client?.invoices?.[x.month];
  if(!invoice||client.invoiceExcludedMonths?.includes(x.month)||cents(invoice.amount??client.revenue)!==share.net)fail('Kartica i neto iznos originala se ne poklapaju.');
  if(!(invoice.payments||[]).length&&(Number(invoice.paidAmount||0)>0||invoice.paymentStatus==='Plaćeno'))fail('Postoji ranija uplata bez pojedinačne evidencije. Prvo proveri tu evidenciju.');
  return{x:{...x,...share},client,invoice,month:x.month};
 });
}
function target(payload,registry,id){const list=targets(payload,registry,id);if(list.length!==1)fail('Zajednički račun evidentiraj kroz bankarsku raspodelu kao celinu.');return list[0];}

function recalc(client,month,now){const i=client.invoices[month],sum=(i.payments||[]).reduce((s,p)=>s+cents(p.amount),0),amount=cents(i.amount??client.revenue);i.paidAmount=sum/100;i.paymentStatus=sum>=amount&&amount>0?'Plaćeno':sum>0?'Delimično':'Nije plaćeno';i.paidAt=i.paymentStatus==='Plaćeno'?(i.payments||[]).map(p=>p.date).sort().at(-1)+'T12:00:00.000Z':'';if(month===new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Vienna',year:'numeric',month:'2-digit'}).format(now))client.paymentStatus=i.paymentStatus;}
function archive(e,action){e.invoice.paymentCorrections=e.invoice.paymentCorrections||[];e.invoice.paymentCorrections.push({...action,previousPayment:structuredClone(e.payment)});e.invoice.payments=e.invoice.payments.filter(p=>p.id!==e.payment.id);}
function plan(payload,registry,bank,body,actor,now=new Date()){
 if(!/^[a-zA-Z0-9_-]{8,100}$/.test(body.actionId||''))fail('Nedostaje oznaka zahteva.');
 if((payload.clients||[]).some(c=>c.financePaymentActions?.some(a=>a.actionId===body.actionId)))return{payload,duplicate:true};
 const next=structuredClone(payload),reason=String(body.reason||'').trim();if(reason.length<3||reason.length>300)fail('Upiši razlog ili napomenu (3–300 znakova).');
 const action={actionId:body.actionId,kind:body.kind,reason,actor,at:now.toISOString()},changed=new Map();let owner;
 const touch=(c,m)=>{owner=owner||c;changed.set(c.id+':'+m,{client:c,month:m});};
 if(body.kind==='allocate'||body.kind==='dismiss'){
  const id=String(body.bankTransactionId),t=bank.find(t=>String(t.id)===id);if(!t||t.currency!=='EUR'||!Number.isFinite(t.amount)||t.amount<=0)fail('Izaberi ulaznu EUR bankarsku uplatu.');
  if(body.expectedRevision!==revision(next,id))fail('Veza uplate je u međuvremenu promenjena. Osveži prikaz.');
  action.bankTransactionId=id;
  if(body.kind==='dismiss'){
   const x=registry.invoices.find(x=>x.id===body.invoiceId),c=next.clients.find(c=>c.id===x?.clientId),i=c?.invoices?.[x.month];if(!i)fail('Kartica računa nije pronađena.');
   i.bankReviewDismissals=[...new Set([...(i.bankReviewDismissals||[]),id])];owner=c;
  }else{
   if(!Array.isArray(body.allocations)||!body.allocations.length||body.allocations.length>20)fail('Dodaj 1–20 računa u raspodelu.');
   if(new Set(body.allocations.map(a=>a.invoiceId)).size!==body.allocations.length)fail('Isti račun je naveden više puta.');
   const total=body.allocations.reduce((s,a)=>s+a.grossCents,0);if(!body.allocations.every(a=>Number.isSafeInteger(a.grossCents)&&a.grossCents>0)||total>cents(t.amount))fail('Raspodela prelazi iznos bankarske uplate.');
   // Unstructured legacy Bank ID notes cannot be moved silently.
   if(entries(next).some(e=>!e.payment.bankTransactionIds?.length&&String(e.payment.note||'').includes('Bank ID '+id)))fail('Postoji starija ručna evidencija ovog Bank ID-a. Prvo poništi tu evidenciju.');
   for(const e of allocations(next,id)){if(e.payment.bankTransactionIds.length!==1)fail('Stara objedinjena evidencija zahteva pojedinačnu proveru.');archive(e,action);touch(e.client,e.month);e.invoice.bankReviewDismissals=[...new Set([...(e.invoice.bankReviewDismissals||[]),id])];}
   for(const {client,month}of changed.values())recalc(client,month,now);
   action.allocations=[];
   for(const a of body.allocations){
    const list=targets(next,registry,a.invoiceId),parts=require('./billing-routing.js').portions(a.grossCents,list.map(t=>t.x));
    for(let j=0;j<list.length;j++){
     const {x,client,invoice,month}=list[j],grossPart=parts[j];if(!grossPart)continue;
     const grossUsed=(invoice.payments||[]).reduce((s,p)=>s+(Number.isSafeInteger(p.bankGrossCents)?p.bankGrossCents:Number.isSafeInteger(p.cashGrossCents)?p.cashGrossCents:Math.round(cents(p.amount)*x.gross/x.net)),0);
     if(grossUsed+grossPart>x.gross)fail('Raspodela bi preplatila račun '+x.number+'.');
     const paid=(invoice.payments||[]).reduce((s,p)=>s+cents(p.amount),0),net=grossUsed+grossPart===x.gross?x.net-paid:Math.round(grossPart*x.net/x.gross);if(net<=0||paid+net>x.net)fail('Proveri neto raspodelu računa.');
     const p={id:'allocation-'+body.actionId+'-'+x.number+'-'+client.id,date:String(t.bookingDate).slice(0,10),amount:net/100,note:reason+'; Bank ID '+id,createdAt:action.at,source:'bank-manual-allocation',bankTransactionIds:[id],bankGrossCents:grossPart,invoiceNumber:x.number,originalInvoiceId:x.id,originalSha256:x.sha256,...(list.length>1?{groupPaymentId:'group-'+body.actionId+'-'+x.id}:{} )};
     invoice.payments=invoice.payments||[];invoice.payments.push(p);touch(client,month);action.allocations.push({clientId:client.id,month,invoiceNumber:x.number,grossCents:grossPart,netCents:net});
    }
   }
  }
 }else if(body.kind==='cash'){
  const client=next.clients.find(c=>c.id===body.clientId);if(!client)fail('Klijent nije pronađen.');owner=client;
  if(!Number.isSafeInteger(body.grossCents)||body.grossCents<=0||body.grossCents>100000000||!/^\d{4}-\d{2}-\d{2}$/.test(body.date||'')||!Number.isFinite(Date.parse(body.date))||new Date(body.date).toISOString().slice(0,10)!==body.date||body.date>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Vienna',year:'numeric',month:'2-digit',day:'2-digit'}).format(now))fail('Proveri iznos i datum keša.');
  const receipt={id:'cash-'+body.actionId,date:body.date,grossCents:body.grossCents,note:reason,createdAt:action.at,invoiceNumber:null};
  if(body.invoiceId){const {x,invoice,month,client:c}=target(next,registry,body.invoiceId);if(c.id!==client.id)fail('Račun pripada drugom klijentu.');const paid=(invoice.payments||[]).reduce((s,p)=>s+cents(p.amount),0),grossUsed=(invoice.payments||[]).reduce((s,p)=>s+(p.bankGrossCents??p.cashGrossCents??Math.round(cents(p.amount)*x.gross/x.net)),0),net=grossUsed+body.grossCents===x.gross?x.net-paid:Math.round(body.grossCents*x.net/x.gross);if(net<=0||paid+net>x.net||grossUsed+body.grossCents>x.gross)fail('Keš prelazi preostali iznos računa.');receipt.invoiceNumber=x.number;invoice.payments=invoice.payments||[];invoice.payments.push({id:receipt.id,date:body.date,amount:net/100,note:'Keš; '+reason,createdAt:action.at,source:'cash',cashGrossCents:body.grossCents,invoiceNumber:x.number,originalInvoiceId:x.id});touch(client,month);}
  client.cashReceipts=client.cashReceipts||[];client.cashReceipts.push(receipt);action.receipt=receipt;
 }else if(body.kind==='reverse'){
  const e=entries(next).find(e=>e.client.id===body.clientId&&e.month===body.month&&e.payment.id===body.paymentId);
  if(!e||hash(e.payment)!==body.expectedPaymentHash)fail('Evidencija je promenjena. Osveži prikaz.');
  action.bankTransactionIds=e.payment.bankTransactionIds||[...String(e.payment.note||'').matchAll(/Bank ID (\d+)/g)].map(m=>m[1]);const related=e.payment.groupPaymentId?entries(next).filter(x=>x.payment.groupPaymentId===e.payment.groupPaymentId):[e];for(const item of related){archive(item,action);touch(item.client,item.month);}
  if(e.payment.source==='cash'){const r=e.client.cashReceipts?.find(r=>r.id===e.payment.id);if(r){r.reversedAt=action.at;r.reason=reason;}}
 }else if(body.kind==='reverse-cash'){
  const c=next.clients.find(c=>c.id===body.clientId),r=c?.cashReceipts?.find(r=>r.id===body.receiptId&&!r.reversedAt);if(!r||r.invoiceNumber!==null)fail('Izaberi nepovezani keš zapis.');r.reversedAt=action.at;r.reason=reason;owner=c;action.receiptId=r.id;
 }else fail('Nepoznata radnja.');
 for(const {client,month}of changed.values())recalc(client,month,now);
 owner.financePaymentActions=owner.financePaymentActions||[];owner.financePaymentActions.push(action);
 return{payload:next,action};
}
function reviewedIds(payload){return new Set((payload.clients||[]).flatMap(c=>(c.financePaymentActions||[]).flatMap(a=>[...(a.bankTransactionIds||[]),...(a.bankTransactionId?[a.bankTransactionId]:[])]).concat(Object.values(c.invoices||{}).flatMap(i=>(i.paymentCorrections||[]).flatMap(a=>a.previousPayment?.bankTransactionIds||[])))).map(String));}
function reviewMatches(payload,rows,bank){const reviewed=reviewedIds(payload);return rows.map(x=>{
 const payments=x.payments.filter(p=>!reviewed.has(String(p.id))),candidates=x.candidates.filter(p=>!reviewed.has(String(p.id)));
 for(const e of entries(payload).filter(e=>e.payment.originalInvoiceId===x.invoiceId&&e.payment.source==='bank-manual-allocation'))for(const id of e.payment.bankTransactionIds||[]){const t=bank.find(t=>String(t.id)===String(id));if(t)payments.push({id:String(id),date:e.payment.date,amountCents:e.payment.bankGrossCents,payer:t.counterpart?.name||'',purpose:t.purpose||'',manual:true});}
 const bankPaidCents=payments.reduce((s,p)=>s+p.amountCents,0),status=x.issues.length?'document-review':bankPaidCents>x.grossCents?'overpayment-review':bankPaidCents===x.grossCents?'covered':bankPaidCents>0?'partial':candidates.length?'allocation-review':'not-found';
 return{...x,payments,candidates,bankPaidCents,status,coveredAt:bankPaidCents>=x.grossCents?payments.map(p=>p.date).sort().at(-1):null};
 });}
module.exports={plan,hash,revision,entries,allocations,reviewedIds,reviewMatches,targets};
