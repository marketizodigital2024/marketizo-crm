'use strict';
const production = require('./work-production-backup.js');
const questionnaires = require('./questionnaire-backup.js');
const FORMAT = 'marketizo-system-domains-v1';
function valid(snapshot) {
  return snapshot?.format === FORMAT && snapshot.schema && snapshot.tables && Array.isArray(snapshot.stateRows)
    && Object.keys(snapshot.schema).sort().join('|') === Object.keys(snapshot.tables).sort().join('|')
    && Object.entries(snapshot.tables).every(([name, rows]) => /^(public\.marketizo_(sign_[a-z_]+|codeks_portal_links|audits)|marketizo_private\.work_log_(audit|recovery_plan))$/.test(name) && Array.isArray(rows) && Array.isArray(snapshot.schema[name]))
    && new Set(snapshot.stateRows.map(r => r?.id)).size === snapshot.stateRows.length
    && snapshot.stateRows.every(r => typeof r?.id === 'string' && r.id && !r.id.startsWith('backup-') && !['marketizo-main','marketizo-kpi-v1','marketizo-smm-preview-v1','marketizo-kpi-preview-v1'].includes(r.id) && r.payload && typeof r.payload === 'object' && Number.isFinite(Date.parse(r.updated_at)));
}
function summary(snapshot) {
  if (snapshot == null) return { included: false, tables: 0, records: 0, stateRows: 0 };
  if (!valid(snapshot)) throw Error('Backup dodatnih domena nije prošao proveru strukture.');
  return { included: true, tables: Object.keys(snapshot.tables).length, records: Object.values(snapshot.tables).reduce((n,a)=>n+a.length,0), stateRows: snapshot.stateRows.length, signDocuments: snapshot.tables['public.marketizo_sign_documents']?.length || 0, signedPdfs: snapshot.tables['public.marketizo_sign_receipts']?.length || 0, completedPdfs: snapshot.tables['public.marketizo_sign_completed_pdfs']?.length || 0, financeRows: snapshot.stateRows.filter(r=>r.id.startsWith('finance-')).length, checksum: production.checksum(snapshot) };
}
function recoveryCheck(target,current){
 if(!target)return {allowed:true,conflicts:0,policy:'preserve-current-domains'};
 if(!valid(target)||!valid(current))return {allowed:false,conflicts:0,reason:'Invalid domains'};
 if(production.equal(target,current))return {allowed:true,conflicts:0};
 let conflicts=0;
 for(const [name,rows] of Object.entries(target.tables)){
  const keys=current.primaryKeys?.[name];if(!keys?.length)return {allowed:false,conflicts,reason:'Missing recovery keys'};
  const key=r=>JSON.stringify(keys.map(k=>r[k]));const saved=new Map((current.tables[name]||[]).map(r=>[key(r),r]));
  for(const r of rows){const existing=saved.get(key(r));if(existing&&!production.equal(existing,r))conflicts++;}
 }
 const states=new Map(current.stateRows.map(r=>[r.id,r]));for(const r of target.stateRows){const existing=states.get(r.id);if(existing&&!production.equal(existing,r))conflicts++;}
 return {allowed:conflicts===0,conflicts,policy:'preserve-existing-recover-missing'};
}
async function readSnapshot(url,key,fetcher=fetch) {
 const rpc=async(name,body={})=>{const r=await require('./database-request.js').request(fetcher,`${url}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(body)},20000);if(!r.ok)throw Error(`Potpuni backup nije dostupan (${r.status}).`);return r.json();};
 const before=await rpc('marketizo_system_domains_manifest');
 if(before?.format!=='marketizo-system-manifest-v1'||!before.tables||!before.stateRows)throw Error('Nedostaje manifest dodatnih domena.');
 const domains={format:FORMAT,schema:{},tables:{},stateRows:[],primaryKeys:{}};
 for(const [name,meta] of [...Object.entries(before.tables),['stateRows',before.stateRows]]){
  if(!Number.isSafeInteger(meta.count)||meta.count<0)throw Error('Neispravan broj zapisa.');
  const size=name.startsWith('marketizo_private.')?250:5;const rows=[];for(let offset=0;offset<meta.count;offset+=size){const page=await rpc('marketizo_system_domains_page',{p_table:name,p_offset:offset,p_limit:size});if(!Array.isArray(page)||page.length!==Math.min(size,meta.count-offset))throw Error('Nepotpuna stranica backupa.');rows.push(...page);}
  if(name==='stateRows')domains.stateRows=rows;else{domains.tables[name]=rows;domains.schema[name]=meta.schema;if(meta.keys)domains.primaryKeys[name]=meta.keys;}
 }
 const s=await production.readSnapshot(url,key,fetcher);
 const k=await require('./database-request.js').request(fetcher,`${url}/rest/v1/agency_crm_state?id=eq.marketizo-kpi-v1&select=payload,updated_at`,{headers:{apikey:key,Authorization:`Bearer ${key}`}},20000);if(!k.ok)throw Error('KPI backup nije dostupan.');s.kpi=(await k.json())[0]||null;
 s.questionnaires=await questionnaires.readSnapshot(url,key,fetcher);
 const after=await rpc('marketizo_system_domains_manifest');if(!production.equal(before,after))throw Error('Podaci su menjani tokom kopiranja. Pokušaj ponovo; postojeća kopija je sačuvana.');
 if(!valid(domains))throw Error('Nedostaje potvrđen potpuni snapshot.');
 s.systemDomains=domains;return s;
}
function archive(snapshot){const json=JSON.stringify(snapshot);return {encoding:'gzip-base64',sha256:production.checksum(snapshot),data:require('node:zlib').gzipSync(Buffer.from(json)).toString('base64'),summary:summary(snapshot)};}
function unarchive(value){if(value?.encoding!=='gzip-base64')throw Error('Nepoznat format arhive.');const s=JSON.parse(require('node:zlib').gunzipSync(Buffer.from(value.data,'base64')).toString('utf8'));if(!valid(s)||production.checksum(s)!==value.sha256)throw Error('Arhiva nije potvrđena.');return s;}
async function streamDocument(res,document) {
 if(typeof res.write!=='function') {res.statusCode=200;res.setHeader('Content-Type','application/json; charset=utf-8');return res.end(JSON.stringify({ok:true,document}));}
 res.statusCode=200;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
 const bytes=Buffer.from(JSON.stringify({ok:true,document}));
 for(let offset=0;offset<bytes.length;offset+=65536) if(res.write(bytes.subarray(offset,offset+65536))===false)await require('node:events').once(res,'drain');
 res.end();
}
module.exports={FORMAT,valid,summary,readSnapshot,streamDocument,archive,unarchive,recoveryCheck};
