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
 let conflicts=0;const domains=[];
 for(const [name,rows] of Object.entries(target.tables)){
  const keys=current.primaryKeys?.[name];if(!keys?.length)return {allowed:false,conflicts,reason:'Missing recovery keys',domain:name};
  const key=r=>JSON.stringify(keys.map(k=>r[k]));const saved=new Map((current.tables[name]||[]).map(r=>[key(r),r]));
  let count=0;for(const r of rows){const existing=saved.get(key(r));if(existing&&!production.equal(existing,r)){conflicts++;count++;}}if(count)domains.push({domain:name,count});
 }
 const states=new Map(current.stateRows.map(r=>[r.id,r])),changed=[];for(const r of target.stateRows){const existing=states.get(r.id);if(existing&&!production.equal(existing,r)){conflicts++;changed.push(r.id);}}if(changed.length)domains.push({domain:'stateRows',count:changed.length,financeRows:changed.filter(id=>id.startsWith('finance-'))});
 return {allowed:conflicts===0,conflicts,domains,policy:'preserve-existing-recover-missing'};
}
async function readSnapshot(url,key,fetcher=fetch) {
 const rpc=async(name,body={})=>{const r=await require('./database-request.js').request(fetcher,`${url}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(body)},name==='marketizo_backup_export_anchor'?40000:20000);if(!r.ok)throw Error(`Potpuni backup nije dostupan (${r.status}).`);return r.json();};
 for(let attempt=0;attempt<2;attempt++){
 const s=await rpc('marketizo_backup_export_anchor'),before=s?.manifest;
 if(!s?.payload||!s.updated_at||!production.validSnapshot(s.production)||!questionnaires.validSnapshot(s.questionnaires)||before?.format!=='marketizo-system-manifest-v1'||!before.tables||!before.stateRows)throw Error('Nedostaje potvrđen anchor backupa.');
 const domains={format:FORMAT,schema:{},tables:{},stateRows:[],primaryKeys:{}};let changed=false;
 for(const [name,meta] of [...Object.entries(before.tables),['stateRows',before.stateRows]]){
  if(!Number.isSafeInteger(meta.count)||meta.count<0||!Array.isArray(meta.rows)||meta.rows.length!==meta.count)throw Error('Neispravan broj zapisa.');
  const size=name==='stateRows'?1:name.startsWith('marketizo_private.')?250:5,rows=[];
  for(let offset=0;offset<meta.count;offset+=size){const expected=meta.rows.slice(offset,offset+size),page=await rpc('marketizo_system_domains_keyed_page',{p_table:name,p_keys:expected.map(r=>r.key)});
   if(!Array.isArray(page.rows)||page.rows.length!==expected.length||!Array.isArray(page.fingerprints)||!production.equal(page.fingerprints,expected.map(r=>r.hash))){changed=true;break;}rows.push(...page.rows);
  }
  if(changed)break;
  if(name==='stateRows')domains.stateRows=rows;else{domains.tables[name]=rows;domains.schema[name]=meta.schema;if(meta.keys)domains.primaryKeys[name]=meta.keys;}
 }
 if(changed){if(attempt===0)continue;throw Error('Postojeći zapis je promenjen tokom kopiranja. Pokušaj ponovo; prethodna kopija je sačuvana.');}
 if(!valid(domains))throw Error('Nedostaje potvrđen potpuni snapshot.');
 s.questionnaires.defaultTemplates=require('./questionnaire-templates.json');delete s.manifest;s.systemDomains=domains;return s;
 }
}

function archive(snapshot){const json=JSON.stringify(snapshot);return {encoding:'gzip-base64',sha256:production.checksum(snapshot),data:require('node:zlib').gzipSync(Buffer.from(json)).toString('base64'),summary:summary(snapshot)};}
function unarchive(value){if(value?.encoding!=='gzip-base64')throw Error('Nepoznat format arhive.');const s=JSON.parse(require('node:zlib').gunzipSync(Buffer.from(value.data,'base64')).toString('utf8'));if(!valid(s)||production.checksum(s)!==value.sha256)throw Error('Arhiva nije potvrđena.');return s;}
const partHash=data=>require('node:crypto').createHash('sha256').update(data).digest('hex');
async function writeDatabaseArchive(url,key,snapshot,fetcher=fetch,table='agency_crm_state'){
 const groups=[],parts=new Map(),request=require('./database-request.js').request;
 for(const [name,rows] of [...Object.entries(snapshot.tables),['stateRows',snapshot.stateRows]]){
  const size=name==='stateRows'||/public\.marketizo_sign_(requests|prepared_pdfs|receipts|completed_pdfs)$/.test(name)?1:250;
  for(let offset=0;offset<rows.length;offset+=size){
   const zipped=require('node:zlib').gzipSync(Buffer.from(JSON.stringify(rows.slice(offset,offset+size)))).toString('base64'),ids=[];
   for(let start=0;start<zipped.length;start+=700000){const data=zipped.slice(start,start+700000),sha256=partHash(data),id='backup-system-chunk-'+sha256;parts.set(id,{data,sha256});ids.push({id,sha256});}
   groups.push({table:name,offset,count:Math.min(size,rows.length-offset),parts:ids});
  }
 }
 const headers={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},endpoint=`${url}/rest/v1/${table}`,items=[...parts];
 const read=async id=>{const r=await request(fetcher,endpoint+'?id=eq.'+id+'&select=payload',{headers},15000);if(!r.ok)throw Error('DB deo nije pročitan.');return (await r.json())[0]?.payload;};
 for(let start=0;start<items.length;start+=4)await Promise.all(items.slice(start,start+4).map(async([id,part])=>{
  let saved=await read(id);if(!saved){const r=await request(fetcher,endpoint+'?on_conflict=id',{method:'POST',headers:{...headers,Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify({id,payload:part,updated_at:new Date().toISOString()})},15000);if(!r.ok)throw Error('DB deo nije sačuvan.');saved=await read(id);}
  if(!saved||saved.sha256!==part.sha256||partHash(saved.data)!==part.sha256)throw Error('DB deo nije prošao proveru sadržaja.');
 }));
 return {encoding:'gzip-json-parts-v1',format:snapshot.format,schema:snapshot.schema,...(snapshot.primaryKeys?{primaryKeys:snapshot.primaryKeys}:{}),groups,summary:summary(snapshot)};
}
async function readDatabaseArchive(archive,readPart){
 if(archive?.encoding!=='gzip-json-parts-v1')return unarchive(archive);
 const snapshot={format:archive.format,schema:archive.schema,tables:Object.fromEntries(Object.keys(archive.schema).map(k=>[k,[]])),stateRows:[],...(archive.primaryKeys?{primaryKeys:archive.primaryKeys}:{})};
 for(const group of archive.groups){let data='';for(const part of group.parts){const saved=await readPart(part.id);if(!saved||saved.sha256!==part.sha256||partHash(saved.data)!==part.sha256)throw Error('DB deo nedostaje ili je oštećen.');data+=saved.data;}
  const rows=JSON.parse(require('node:zlib').gunzipSync(Buffer.from(data,'base64')).toString('utf8')),target=group.table==='stateRows'?snapshot.stateRows:snapshot.tables[group.table];
  if(!target||!Array.isArray(rows)||rows.length!==group.count||target.length!==group.offset)throw Error('Neispravan redosled DB delova.');target.push(...rows);
 }
 if(!valid(snapshot)||summary(snapshot).checksum!==archive.summary.checksum)throw Error('DB arhiva nije prošla proveru.');return snapshot;
}
async function streamDocument(res,document) {
 if(typeof res.write!=='function') {res.statusCode=200;res.setHeader('Content-Type','application/json; charset=utf-8');return res.end(JSON.stringify({ok:true,document}));}
 res.statusCode=200;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
 for(const bytes of require('./json-stream.js').chunks({ok:true,document})) if(res.write(bytes)===false)await require('node:events').once(res,'drain');
 res.end();
}
module.exports={FORMAT,valid,summary,readSnapshot,streamDocument,archive,unarchive,recoveryCheck,writeDatabaseArchive,readDatabaseArchive};
