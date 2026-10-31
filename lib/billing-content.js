'use strict';
const crypto=require('node:crypto'),brand=require('./billing-brand.js');
const hash=x=>crypto.createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:canonical(x)).digest('hex');
function canonical(x){return Array.isArray(x)?'['+x.map(canonical).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);}
const fields={legalName:'Naziv firme',street:'Ulica i broj',postalCode:'Poštanski broj',city:'Grad',country:'Država (dvoslovna oznaka)',email:'E-mail za račune',taxMode:'Poreski tretman'};
function profile(input={}){
 const p={};for(const k of [...Object.keys(fields),'vatId','taxNote']){const v=input[k];p[k]=typeof v==='string'?v.normalize('NFC').trim():'';if(p[k].length>(k==='taxNote'?500:k==='email'?254:180)||/[\x00-\x1f\x7f<>]/.test(p[k]))throw Error('Proveri polje: '+(fields[k]||k));}
 p.country=p.country.toUpperCase();p.email=p.email.toLowerCase();p.vatId=p.vatId.replace(/\s/g,'').toUpperCase();p.confirmed=input.confirmed===true;
 return p;
}
function missing(p,netCents=0){
 p=profile(p);const errors=Object.entries(fields).filter(([k])=>!p[k]).map(([,v])=>v);
 if(p.country&&!/^[A-Z]{2}$/.test(p.country))errors.push('Država mora imati dva slova, npr. AT ili RS');
 if(p.email&&!/^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/.test(p.email))errors.push('Ispravan e-mail za račune');
 if(/@[^@]*\.local$/i.test(p.email))errors.push('Stvarni e-mail klijenta umesto privremene .local adrese');
 if(p.vatId&&!/^[A-Z]{2}[A-Z0-9.-]{5,18}$/.test(p.vatId))errors.push('Ispravan UID / PDV broj klijenta');
 if(p.taxMode&&!['standard20','reverse-charge','exempt'].includes(p.taxMode))errors.push('Potvrđen poreski tretman');
 if((p.taxMode==='reverse-charge'||p.country==='AT'&&netCents>833333)&&!p.vatId)errors.push('UID / PDV broj klijenta');
 if(['reverse-charge','exempt'].includes(p.taxMode)&&!p.taxNote)errors.push('Obrazloženje računa bez PDV-a');
 if(!p.confirmed)errors.push('Potvrda tačnosti podataka i poreskog tretmana');
 return [...new Set(errors)];
}
function clientMissing(client,net){
 const p=profile(client?.billingProfile), errors=missing(p,net), shared=require('../client-billing-defaults.js')({name:client?.billingName||client?.name,country:client?.country,email:client?.email,loginEmail:client?.loginEmail});
 if([['legalName','name'],['country','country'],['email','email']].some(([key,source])=>(source==='email'?typeof client?.email==='string':Boolean(client?.[source]))&&String(shared[key]||'').trim().toLowerCase()!==String(p[key]||'').trim().toLowerCase()))errors.push('Sačuvaj usklađen naziv, državu i e-mail u profilu klijenta');
 return errors;
}
function ready(client,net){const p=profile(client?.billingProfile);const errors=clientMissing(client,net);if(errors.length){const e=Error('Dopuni profil klijenta: '+errors.join(', ')+'.');e.missing=errors;e.clientId=client?.id;throw e;}return p;}
function today(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Vienna',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
function snapshot(client,input,now=new Date()){
 const quantity=Number(input.quantity),unitCents=Number(input.unitCents),month=String(input.serviceMonth||''),description=String(input.description||'').normalize('NFC').trim();
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>10000||!Number.isSafeInteger(unitCents)||unitCents<1||unitCents>100000000)throw Error('Proveri količinu i jediničnu cenu.');
 if(!/^20\d\d-(0[1-9]|1[0-2])$/.test(month)||!description||description.length>500||/[\x00-\x1f\x7f]/.test(description))throw Error('Upiši opis usluge i ispravan mesec usluge.');
 const billingFrequency=client.billingFrequency==='once'?'once':'monthly',billingPeriod=billingFrequency==='once'?String(client.invoiceStartMonth||client.startDate||'').slice(0,7):'';if(billingFrequency==='once'&&month!==billingPeriod)throw Error('Jednokratni račun može se izdati samo za početni mesec iz profila klijenta.');
 const netCents=quantity*unitCents;if(!Number.isSafeInteger(netCents)||netCents>100000000)throw Error('Iznos računa je prevelik.');const p=ready(client,netCents),vatCents=p.taxMode==='standard20'?Math.round(netCents*.2):0;
 return{clientId:client.id,clientName:client.name,billingFrequency,billingPeriod,profile:p,profileHash:hash(p),email:p.email,issueDate:today(now),serviceMonth:month,description,quantity,unitCents,netCents,vatCents,grossCents:netCents+vatCents,currency:'EUR',brandVersion:brand.version};
}
function assertCurrent(client,s){const p=ready(client,s.netCents);if((client.billingFrequency==='once'?'once':'monthly')!==(s.billingFrequency||'monthly')||(client.billingFrequency==='once'&&String(client.invoiceStartMonth||client.startDate||'').slice(0,7)!==s.serviceMonth))throw Error('Način ili mesec izdavanja računa je promenjen. Pripremi novi pregled.');if(hash(p)!==s.profileHash)throw Error('Profil klijenta je promenjen. Pripremi novi pregled računa.');return p;}
function verifyPdf(pdf){const b=Buffer.from(pdf.base64||'','base64');if(b.length<100||b.length>1300000||b.subarray(0,5).toString()!=='%PDF-'||hash(b)!==pdf.sha256)throw Error('Sadržaj PDF-a nije potvrđen.');return b;}
function snapshotFor(payload,input,now=new Date()){
 const routes=require('./billing-routing.js'),ctx=routes.context(payload,input.clientId),r=ctx.recipient;
 let entries=input.items;if(!entries)entries=ctx.members.length===1?[{clientId:ctx.primary.id,...input}]:null;
 if(!Array.isArray(entries)||entries.length!==ctx.members.length||new Set(entries.map(x=>x.clientId)).size!==entries.length)throw Error('Dodaj tačno jednu stavku za svakog klijenta zajedničkog računa.');
 const parts=ctx.members.map(c=>{const line=entries.find(x=>x.clientId===c.id);if(!line)throw Error('Nedostaje klijent na zajedničkom računu.');const s=snapshot({...c,name:r.billingName||r.name,billingName:r.billingName||'',country:r.country,email:r.email,billingProfile:r.billingProfile},{...line,serviceMonth:input.serviceMonth},now);return{clientId:c.id,clientName:c.name,description:s.description,quantity:s.quantity,unitCents:s.unitCents,netCents:s.netCents,vatCents:s.vatCents,grossCents:s.grossCents};});
 const totals=Object.fromEntries(['netCents','vatCents','grossCents'].map(k=>[k,parts.reduce((s,x)=>s+x[k],0)]));if(totals.netCents>100000000)throw Error('Iznos računa je prevelik.');ready(r,totals.netCents);
 const s=snapshot({...ctx.primary,name:r.billingName||r.name,billingName:r.billingName||'',country:r.country,email:r.email,billingProfile:r.billingProfile},{quantity:1,unitCents:totals.netCents,description:parts.length===1?parts[0].description:brand.defaults.description,serviceMonth:input.serviceMonth},now);
 return{...s,...totals,clientName:ctx.primary.name,quantity:parts.length===1?parts[0].quantity:1,unitCents:parts.length===1?parts[0].unitCents:totals.netCents,items:parts,routing:routes.routing(ctx)};
}
function assertSnapshot(payload,s){
 if(!s.routing){const c=payload.clients?.find(c=>c.id===s.clientId);if(c?.billingGroupId||c?.billingRecipientId)throw Error('Primalac računa je promenjen. Pripremi novi pregled.');return assertCurrent(c,s);}
 const ctx=require('./billing-routing.js').context(payload,s.clientId),actual=require('./billing-routing.js').routing(ctx);if(hash(actual)!==hash(s.routing))throw Error('Primalac ili članovi računa su promenjeni. Pripremi novi pregled.');
 const p=ready(ctx.recipient,s.netCents);if(hash(p)!==s.profileHash)throw Error('Profil primaoca je promenjen. Pripremi novi pregled.');
 for(const c of ctx.members){if(c.invoiceExcludedMonths?.includes(s.serviceMonth)||c.billingFrequency==='once'&&String(c.invoiceStartMonth||c.startDate||'').slice(0,7)!==s.serviceMonth)throw Error('Proveri mesec izdavanja za sve klijente na računu.');}
 return p;
}
function registry(docs){return docs.filter(d=>d.status==='sent').map(d=>({id:'crm-'+d.id,number:d.number,printedNumber:d.number,filename:'Rechnung_'+String(d.number).padStart(6,'0')+'.pdf',client:d.snapshot.profile.legalName,clientId:d.snapshot.clientId,...(d.snapshot.items?{clientShares:d.snapshot.items.map(x=>({clientId:x.clientId,net:x.netCents,vat:x.vatCents,gross:x.grossCents}))}:{}),clientLinkVerified:true,date:d.snapshot.issueDate,month:d.snapshot.serviceMonth,net:d.snapshot.netCents,vat:d.snapshot.vatCents,gross:d.snapshot.grossCents,issues:[],aliases:[d.snapshot.profile.legalName,d.snapshot.clientName].map(x=>x.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')),ibans:[],sha256:d.pdfSha256,source:'crm',billingInvoiceId:d.id,fileId:d.driveFileId||null}));}
module.exports={brand,hash,canonical,profile,missing,clientMissing,ready,today,snapshot,snapshotFor,assertCurrent,assertSnapshot,verifyPdf,registry};
