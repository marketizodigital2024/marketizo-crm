'use strict';
const {createHash}=require('node:crypto');
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
function date(s){const m=String(s).replace(/\s/g,'').match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);if(!m)return'';const d=`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;return Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d?d:'';}
const cents=s=>Number(String(s).replace(/\./g,'').replace(',','.'))*100;
function parseText(text,filename){
 const t=String(text).replace(/\s+/g,' ').trim(),issues=[];
 const f=filename.match(/^Rechnung[_ ]*0*(\d{3,6})[_ ]+(.+)\.(pdf|docx)$/i),n=t.match(/RECHNUNG\s*(?:Nr\.?)?\s*0*(\d{3,6})(?!\d)/i);
 if(!f||!n||!t.includes('ATU77282726')||!t.replace(/\s/g,'').includes('AT081200010034820943'))throw Error('Dokument nije prepoznat kao originalni Marketizo račun.');
 const number=Number(n[1]),client=f[2].replace(/\.docx$/i,'').trim();
 if(Number(f[1])!==number)issues.push('Broj u nazivu i sadržaju se razlikuje.');
 const issued=t.match(/Wien\s*,\s*(\d{1,2}\.\s*\d{1,2}\.\s*\d{4})/i),d=issued?date(issued[1]):'';
 const amount='((?:[0-9]{1,3}\\.)*[0-9]{1,3},[0-9]{2})';
 const gross=t.match(new RegExp('Bruttosumme\\s*'+amount+'\\s*€','i')),net=t.match(new RegExp('Nettosumme\\s*'+amount+'\\s*€','i'));
 if(!d||!gross||!net)throw Error('Datum ili neto/bruto iznos nije nedvosmislen.');
 const g=Math.round(cents(gross[1])),vnet=Math.round(cents(net[1]));
 const section=t.split(/Nettosumme/i)[1]?.split(/Bruttosumme/i)[0]||'',values=[...section.matchAll(new RegExp(amount+'\\s*€','g'))].map(m=>Math.round(cents(m[1])));
 const vat=values.length===2?values[1]:g===vnet?0:null;
 if(vat===null||vnet+vat!==g||g<=0)issues.push('Neto, PDV i bruto se ne slažu.');
 const period=t.match(/Leistungszeitraum\s*:\s*(\d{1,2}\.\d{1,2}\.\d{4})\s*[-–—]\s*(\d{1,2}\.\d{1,2}\.\d{4})/i);
 const start=period?date(period[1]):'',end=period?date(period[2]):'',month=start.slice(0,7);
 if(!start||!end||start>end||month!==end.slice(0,7))issues.push('Period usluge nije jednoznačan mesec.');
 const recipient=t.split(/BIC\s+BKAUATWW/i)[1]?.split(/Wien\s*,/i)[0]||'';
 if(norm(client).length<5||!norm(recipient).startsWith(norm(client)))issues.push('Naziv klijenta u dokumentu i nazivu fajla zahteva proveru.');
 return{number,printedNumber:number,client,date:d,month:month||d.slice(0,7),gross:g,net:vnet,vat,issues,recipient};
}
async function extract(bytes,mime){
 if(!Buffer.isBuffer(bytes)||bytes.length<20||bytes.length>1500000)throw Error('Neodgovarajuća veličina dokumenta.');
 if(mime==='application/pdf'){
  if(bytes.subarray(0,5).toString()!=='%PDF-')throw Error('Neispravan PDF.');
  const PDF=require('pdf2json');const parser=new PDF(null,true);
  // pdf2json 4 reads the underlying ArrayBuffer from offset zero. A pooled
  // Buffer may start later, so give the parser an exact, unpooled allocation.
  const pdfBytes=Buffer.alloc(bytes.length);bytes.copy(pdfBytes);
  return await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{parser.destroy?.();reject(Error('PDF nije pročitan na vreme.'));},8000);parser.on('pdfParser_dataError',()=>{clearTimeout(timer);reject(Error('PDF nije čitljiv.'));});parser.on('pdfParser_dataReady',data=>{clearTimeout(timer);if(!data.Pages?.length||data.Pages.length>5)return reject(Error('Proveri broj stranica PDF-a.'));const text=data.Pages.map(p=>p.Texts.map(t=>t.R.map(r=>decodeURIComponent(r.T)).join('')).join(' ')).join('\n');parser.destroy?.();text.length<50000?resolve(text):reject(Error('PDF je predugačak.'));});parser.parseBuffer(pdfBytes);});
 }
 if(mime==='application/vnd.openxmlformats-officedocument.wordprocessingml.document'){
  const {unzipSync,strFromU8}=require('fflate');const files=unzipSync(bytes,{filter:f=>f.name==='word/document.xml'&&f.originalSize<500000});if(!files['word/document.xml'])throw Error('Word nije čitljiv.');
  return strFromU8(files['word/document.xml']).replace(/<\/w:p>/g,'\n').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'");
 }
 throw Error('Podržani su PDF i Word originali.');
}
async function parseFile(file){const bytes=Buffer.from(file.data||'','base64');const text=await extract(bytes,file.mimeType);return{...parseText(text,file.name),sha256:createHash('sha256').update(bytes).digest('hex'),fileId:file.id,filename:file.name,mimeType:file.mimeType,modifiedTime:file.modifiedTime};}
module.exports={parseText,parseFile,extract,norm};
