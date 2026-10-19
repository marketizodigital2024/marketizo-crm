'use strict';
const {norm}=require('./finance-document-parser.js');
const email=s=>String(s||'').trim().toLowerCase();
function recipientsFor(payload,client,approved=[]){
 const list=[client.email,client.billingEmail,client.invoiceEmail,client.loginEmail,...approved];
 for(const c of payload.contacts||[])if(c.clientId===client.id||c.client===client.name)list.push(c.email);
 return[...new Set(list.map(email).filter(s=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)&&!/@(?:marketizo\.com|marketizo\.local)$/i.test(s)))];
}
function evidenceFor(x,data,payload){
 const client=payload.clients?.find(c=>c.id===x.clientId),variants=x.variants||[{sha256:x.sha256,fileId:x.fileId}];
 const proofs=Object.values(data.messages||{}).filter(m=>m.sent===true&&m.labels?.includes('SENT')&&['office@marketizo.com','buchhaltung@marketizo.com'].includes(m.account)&&m.attachments?.some(a=>a.number===x.number&&variants.some(v=>v.sha256===a.sha256))&&Date.parse(m.sentAt)>=Date.parse(x.date+'T00:00:00Z'));
 const addresses=client?recipientsFor(payload,client,data.approvedRecipients?.[client.id]||[]):[];
 const verified=proofs.filter(m=>m.to.some(t=>addresses.includes(email(t))));
 verified.sort((a,b)=>a.sentAt.localeCompare(b.sentAt));
 return{status:x.issues.length?'document-review':!client||!x.clientLinkVerified?'client-review':verified.length?'sent-confirmed':proofs.length?'recipient-review':'not-found',proof:verified[0]?{...verified[0],matchingAttachmentSha256:verified[0].attachments.find(a=>a.number===x.number&&variants.some(v=>v.sha256===a.sha256)).sha256}:null,candidates:proofs.map(m=>({id:m.id,account:m.account,to:m.to,sentAt:m.sentAt,url:m.url})),checkedAt:data.mailCheckedAt||null};
}
function planSources(payload,registry,data,now=new Date()){
 const clients=structuredClone(payload.clients||[]),changes=[];
 for(const x of registry.invoices){
  if(x.month<'2026-10'||!x.clientLinkVerified||!x.clientId||x.issues.length||x.net+x.vat!==x.gross||!Number.isSafeInteger(x.net))continue;
  if(registry.invoices.filter(v=>v.clientId===x.clientId&&v.month===x.month).length!==1)continue;
  const client=clients.find(c=>c.id===x.clientId);if(!client||client.status!=='Aktivan'||client.invoiceExcludedMonths?.includes(x.month)||String(client.invoiceStartMonth||client.startDate||'').slice(0,7)>x.month)continue;
  client.invoices=client.invoices||{};let invoice=client.invoices[x.month],created=false;
  if(!invoice){invoice={amount:x.net/100,invoiceStatus:'Nije poslat',paymentStatus:'Nije plaćeno',paymentMethod:client.paymentMethod||'Firma',sentAt:'',paidAt:''};created=true;}
  const amount=invoice.amount===undefined||invoice.amount===null||invoice.amount===''?client.revenue:invoice.amount;
  if(Math.round(Number(amount)*100)!==x.net)continue;
  const before=JSON.stringify(invoice),ev=evidenceFor(x,data,payload);
  invoice={...invoice,originalInvoice:{number:x.number,fileId:x.fileId||null,filename:x.filename,sha256:x.sha256,netCents:x.net,vatCents:x.vat,grossCents:x.gross}};
  if(ev.status==='sent-confirmed'){
   // Existing manual sent status/date are retained; evidence is an additional source.
   invoice.invoiceStatus='Poslat';invoice.sentAt=invoice.sentAt||ev.proof.sentAt;
   invoice.sentEvidence={account:ev.proof.account,messageId:ev.proof.id,url:ev.proof.url,sentAt:ev.proof.sentAt,to:ev.proof.to,invoiceNumber:x.number,attachmentSha256:ev.proof.matchingAttachmentSha256,verifiedAt:ev.proof.checkedAt};
  }
  if(created||JSON.stringify(invoice)!==before){client.invoices[x.month]=invoice;changes.push({clientId:client.id,month:x.month,number:x.number,created,sent:ev.status==='sent-confirmed'});}
 }
 return{payload:changes.length?{...payload,clients}:payload,changes};
}
module.exports={evidenceFor,planSources,recipientsFor};
