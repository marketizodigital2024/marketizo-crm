'use strict';
const {supabaseHeaders}=require('../api/state.js').helpers;
const {request}=require('./database-request.js');
const {registryFrom}=require('./bank-matching.js');
const {norm}=require('./finance-document-parser.js');
const ID='finance-sources-v1';
const folderId='1wkk-iEAkLnqtYMDAgc3RXCkqCH1fnVd_';
function url(config){return `${config.url}/rest/v1/${process.env.SUPABASE_TABLE||'agency_crm_state'}`;}
async function read(config){const r=await request(fetch,`${url(config)}?id=eq.${ID}&select=payload,updated_at`,{headers:supabaseHeaders(config.key)});if(!r.ok)throw Error('Čitanje izvora nije uspelo.');const rows=await r.json();return{data:rows[0]?.payload||{files:{},messages:{},manifests:{}},revision:rows[0]?.updated_at||''};}
async function update(config,change){
 for(let n=0;n<6;n++){
  const current=await read(config),data=change(structuredClone(current.data)),revision=new Date(Math.max(Date.now(),Date.parse(current.revision||0)+1)).toISOString();
  const endpoint=current.revision?`${url(config)}?id=eq.${ID}&updated_at=eq.${encodeURIComponent(current.revision)}&select=updated_at`:`${url(config)}?select=updated_at`;
  const r=await request(fetch,endpoint,{method:current.revision?'PATCH':'POST',headers:{...supabaseHeaders(config.key),Prefer:'return=representation'},body:JSON.stringify({id:ID,payload:data,updated_at:revision})});
  if(r.status===409)continue;if(!r.ok)throw Error('Čuvanje izvora nije uspelo.');const rows=await r.json();if(Array.isArray(rows)&&rows.length===1)return data;
 }
 throw Error('Drugi upis izvora je u toku. Ponovi proveru.');
}
function mergeRegistry(seed,data){
 const r=registryFrom(seed),all=[...r.invoices],groups=new Map();
 for(const f of Object.values(data.files||{}))if(f.parsed&&!f.deleted){const p=f.parsed;if(!groups.has(p.number))groups.set(p.number,[]);groups.get(p.number).push(p);}
 const known=new Map();for(const x of r.invoices){const key=norm(x.client);if(x.clientLinkVerified&&x.clientId){const old=known.get(key);known.set(key,old&&old.clientId!==x.clientId?{conflict:true}:x);}}
 for(const [number,variants]of groups){
  variants.sort((a,b)=>(a.mimeType==='application/pdf'?0:1)-(b.mimeType==='application/pdf'?0:1));const p=variants[0];
  const original=r.invoices.find(x=>x.number===number),identity=known.get(norm(p.client));
  const match=identity&&!identity.conflict?identity:null;
  const fingerprints=new Set(variants.map(v=>JSON.stringify([v.date,v.month,v.net,v.vat,v.gross,norm(v.client)])));
  const issues=[...new Set(variants.flatMap(v=>v.issues||[]))];if(fingerprints.size!==1)issues.push('Postoje različite verzije istog broja računa.');
  if(original&&[original.date,original.month,original.net,original.vat,original.gross,norm(original.client)].join('|')!==[p.date,p.month,p.net,p.vat,p.gross,norm(p.client)].join('|'))issues.push('Drive sadržaj se razlikuje od ranije potvrđenog računa.');
  const x={id:original?.id||'drive-'+number,number,printedNumber:p.printedNumber,client:p.client,clientId:original?.clientId||match?.clientId||null,clientLinkVerified:original?.clientLinkVerified===true||!!match,date:p.date,month:p.month,gross:p.gross,net:p.net,vat:p.vat,issues,ibans:original?.ibans||match?.ibans||[],aliases:original?.aliases||match?.aliases||[norm(p.client)],filename:p.filename,sha256:p.sha256,fileId:p.fileId,variants:variants.map(v=>({fileId:v.fileId,sha256:v.sha256,filename:v.filename})),driveCheckedAt:data.driveCheckedAt};
  const index=all.findIndex(v=>v.number===number);if(index>=0)all[index]=x;else all.push(x);
 }
 // A complete folder listing invalidates stale/deleted originals before automatic posting.
 const manifest=data.manifests?.[folderId];
 if(manifest?.complete){for(const x of all){const variants=manifest.files.filter(f=>Number(f.name.match(/^Rechnung[_ ]*0*(\d{3,6})[_ ]/i)?.[1])===x.number);if(!variants.length)x.issues=[...x.issues,'Original nije pronađen u aktuelnom Drive folderu.'];else if(!variants.some(f=>f.sha256Checksum===x.sha256))x.issues=[...x.issues,'Aktuelni Drive fajl nije potvrđen čitanjem sadržaja.'];}}
 for(const x of all){const f=manifest?.files?.find(f=>f.sha256Checksum===x.sha256);if(f&&!x.fileId)x.fileId=f.id;}
 // An owner-confirmed link is per original document, never per payer name.
 for(const x of all){const link=data.invoiceLinks?.[String(x.number)];if(!link)continue;if(link.sha256!==x.sha256){x.issues=[...x.issues,'Original se promenio posle potvrde veze sa klijentom.'];continue;}x.clientId=link.clientId;x.clientLinkVerified=link.clientLinkVerified===true;if(link.clientShares){x.clientShares=link.clientShares;try{require('./billing-routing.js').shares(x);}catch(e){x.issues=[...x.issues,e.message];}}}
 return{version:1,checkedAt:data.driveCheckedAt?.slice(0,10)||r.checkedAt,invoices:all};
}
async function loadBankRegistry(config,seed){
 const merged=mergeRegistry(seed,(await read(config)).data);
 const docs=[];for(let offset=0;offset<100000;offset+=1000){const r=await request(fetch,`${url(config)}?id=like.finance-billing-invoice-*&select=payload&order=id.asc&limit=1000&offset=${offset}`,{headers:supabaseHeaders(config.key)});if(!r.ok)throw Error('CRM registar računa nije dostupan.');const rows=await r.json();if(!Array.isArray(rows))throw Error('CRM registar računa nije ispravan.');docs.push(...rows.map(x=>x.payload).filter(x=>x.organization===(process.env.CRM_STATE_ID||'marketizo-main')));if(rows.length<1000)break;if(offset===99000)throw Error('Registar zahteva proveru obima.');}
 const issued=require('./billing-content.js').registry(docs);for(const item of issued){if(merged.invoices.some(x=>x.number===item.number))item.issues.push('Broj postoji i u starom registru. Potrebna je provera.');merged.invoices.push(item);}
 return merged;
}
module.exports={read,update,mergeRegistry,loadBankRegistry,folderId};
