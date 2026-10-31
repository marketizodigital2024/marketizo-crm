'use strict';
const {createHash}=require('node:crypto');
const {extract,parseText,norm}=require('./finance-document-parser.js');
const {refs}=require('./bank-matching.js');
const MONTH='2026-10',FOLDER='1rZNAsaaMD-YGfA2_Ts1HKnPPWawr9s1i';
const FOLDERS={'2026-09':'13AHRuBcTDYhXGVmpOatXkErVE4FHBoED','2026-10':FOLDER,'2026-11':'1VxEjFEXmT2zCK9t0-f_Qi9Q_5bF9Zu_P'};
const validMonth=m=>typeof m==='string'&&/^20[0-9]{2}-(0[1-9]|1[0-2])$/.test(m);
const currentMonth=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Vienna',year:'numeric',month:'2-digit'}).format(new Date());
const ISSUED_FOLDER='1wkk-iEAkLnqtYMDAgc3RXCkqCH1fnVd_';
const mimeTypes=['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const id=s=>typeof s==='string'&&/^[a-zA-Z0-9_-]{8,180}$/.test(s);
async function inspect(f,account,month=MONTH){
 if(!validMonth(month))throw Error('Neispravan mesec.');
 if(!f||!['gmail','drive'].includes(f.source)||typeof f.name!=='string'||f.name.length>300||!mimeTypes.includes(f.mimeType)||!id(f.sourceId))throw Error('Neispravan izvor dokumenta.');
 if(f.source==='drive'&&(account!=='office@marketizo.com'||f.sourceFolder!==ISSUED_FOLDER))throw Error('Drive izvor nije odobren.');
 if(f.source==='gmail'&&((!Number.isFinite(Date.parse(f.receivedAt))||new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Vienna',year:'numeric',month:'2-digit'}).format(new Date(f.receivedAt))!==month)||f.sent===true))throw Error('Poruka ne pripada izabranom mesecu ili je poslata.');
 const bytes=Buffer.from(f.data||'','base64');if(bytes.length<20||bytes.length>1500000)throw Error('Dokument je prazan ili veći od 1,5 MB.');
 const sha256=createHash('sha256').update(bytes).digest('hex');let text='',parsed=null,error='';
 try{text=await extract(bytes,f.mimeType);if(f.source==='drive')parsed=parseText(text,f.name);}catch(e){error=e.message;}
 const issued=f.source==='drive';
 if(issued&&parsed&&parsed.month!==month&&parsed.date.slice(0,7)!==month)return{skip:true,reason:'Drugi mesec.'};
 // A filename or receipt date cannot establish which month an unreadable issued invoice belongs to.
 if(issued&&!parsed)return{skip:true,reason:error||'Period izdatog računa nije potvrđen.'};
 const invoiceLike=/\b(invoice|rechnung|faktura|račun|racun|receipt|quittung)\b/i.test(text+' '+f.name);
 if(!issued&&!invoiceLike)return{skip:true,reason:'Prilog nije prepoznat kao račun.'};
 const eur=[...text.matchAll(/(?:Grand total|Amount paid|Total paid|Amount due|Total due|Bruttosumme|Gesamtbetrag|Rechnungsbetrag|Ukupno)\s*:?\s*(?:EUR|€)?\s*([\d.,]+)\s*(EUR|€)?/gi)].map(m=>{
  const s=m[1],n=s.includes(',')&&s.includes('.')?s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,''):s.replace(',','.');return Math.round(Number(n)*100);
 }).filter(n=>Number.isSafeInteger(n)&&n>0);
 const currency=/\bUSD\b|\bUS\$/.test(text)?'USD':/\bEUR\b|€/.test(text)?'EUR':null;
 const refs=[...text.matchAll(/(?:Invoice|Rechnung|Faktura)\s*(?:number|nummer|no\.?|nr\.?|#|broj)?\s*[:#]?\s*([A-Z0-9][A-Z0-9/-]{2,60})/gi)].map(m=>m[1]).filter(s=>/\d/.test(s));
 return{sha256,name:f.name,mimeType:f.mimeType,source:f.source,sourceId:f.sourceId,account,receivedAt:f.receivedAt||null,from:String(f.from||'').slice(0,300),subject:String(f.subject||'').slice(0,300),direction:issued?'outgoing':'incoming',parsed,number:parsed?.number||([...new Set(refs)].length===1?refs[0]:null),gross:parsed?.gross||([...new Set(eur)].length===1?eur[0]:null),currency:parsed?'EUR':currency,bucket:issued&&!parsed.issues.length?'Izlazni':'Za proveru',issues:issued?parsed.issues:[error||'Ulazni račun je pronađen; proveri obračunski mesec i vezu sa bankarskom transakcijom.'],checkedAt:new Date().toISOString()};
}
function overview(data,bank,state,month=MONTH,folderId=FOLDERS[month]||null){
 if(!validMonth(month))throw Error('Neispravan mesec.');
 const documents=Object.values(data.documents||{}),rows=bank.filter(t=>String(t.bookingDate).slice(0,7)===month).map(t=>{
  const amount=Math.round(Math.abs(t.amount)*100),text=norm((t.purpose||'')+' '+(t.endToEndReference||''));
  const candidates=documents.filter(d=>d.copy?.verified&&d.currency===t.currency&&d.gross===amount&&((t.amount<0&&d.direction==='incoming')||(t.amount>0&&d.direction==='outgoing'))&&d.number&&(d.direction==='outgoing'?refs(t.purpose||'').includes(d.number):text.includes(norm(String(d.number)))&&norm(String(d.number)).length>=4));
  // Explicit references remain suggestions: split payments, processor payouts and duplicated invoices require review.
  return{id:String(t.id),date:String(t.bookingDate).slice(0,10),amount:t.amount,currency:t.currency,purpose:t.purpose||'',payer:t.counterpart?.name||'',status:candidates.length?'review':'missing',documents:candidates.map(d=>d.sha256)};
 });
 const missingIssued=(state.clients||[]).filter(c=>c.invoices?.[month]&&!documents.some(d=>d.direction==='outgoing'&&d.copy?.verified&&d.parsed&&norm(d.parsed.client)===norm(c.name))).map(c=>({client:c.name,status:'Proveri original u Drive-u'}));
 return{month,folderId,accounts:data.accounts||{},documents,transactions:rows,missingIssued,bankCheckedAt:new Date().toISOString(),readOnly:true};
}
module.exports={inspect,overview,MONTH,FOLDER,ISSUED_FOLDER,id,FOLDERS,validMonth,currentMonth};
