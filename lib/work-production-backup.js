'use strict';
const crypto=require('node:crypto');
const FORMAT='marketizo-work-production-v1';
const UNITS=['scenario','scenario_revision','clip','clip_revision','story','post','task','call','shoot','clip_check','none'];
const text=v=>typeof v==='string'&&v.length>0;
const stamp=v=>text(v)&&Number.isFinite(Date.parse(v));
function validSnapshot(s){
 if(!s||s.format!==FORMAT||!Array.isArray(s.rules)||!Array.isArray(s.outputs))return false;
 if(new Set(s.rules.map(r=>r?.activity_id)).size!==s.rules.length||new Set(s.outputs.map(o=>o?.log_id)).size!==s.outputs.length)return false;
 if(!s.rules.every(r=>r&&text(r.activity_id)&&UNITS.includes(r.unit)&&stamp(r.updated_at)&&text(r.updated_by)))return false;
 const groups=new Map();
 for(const o of s.outputs){
  if(!o||!['log_id','employee_id','activity_id','batch_id','label','recorded_by'].every(k=>text(o[k]))||typeof o.client_id!=='string'||!UNITS.includes(o.unit)||o.unit==='none'||!stamp(o.recorded_at)||typeof o.completed!=='boolean'||!Number.isInteger(o.quantity)||o.quantity<0||o.quantity>10000||(o.completed?o.quantity<1:o.quantity!==0))return false;
  const signature=JSON.stringify([o.employee_id,o.activity_id,o.client_id,o.label,o.unit]);const previous=groups.get(o.batch_id);
  if(previous&&(previous.signature!==signature||(previous.completed&&o.completed)))return false;
  groups.set(o.batch_id,{signature,completed:previous?.completed||o.completed});
 }
 return true;
}
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const equal=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const checksum=s=>crypto.createHash('sha256').update(JSON.stringify(stable(s))).digest('hex');
function summary(s){if(s==null)return {included:false,rules:0,outputs:0,completedBatches:0,openBatches:0};if(!validSnapshot(s))throw Error('Backup količina i jedinica aktivnosti nije prošao proveru strukture.');const all=new Set(s.outputs.map(o=>o.batch_id)),closed=new Set(s.outputs.filter(o=>o.completed).map(o=>o.batch_id));return {included:true,rules:s.rules.length,outputs:s.outputs.length,completedBatches:closed.size,openBatches:all.size-closed.size,checksum:checksum(s)};}
async function readSnapshot(url,key,fetcher=fetch){
 const r=await fetcher(`${url}/rest/v1/rpc/marketizo_work_production_snapshot`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:'{}'});
 if(!r.ok)throw Error(`Čitanje količina i sati za backup nije uspelo (${r.status}).`);
 const s=await r.json();if(!s?.payload||!stamp(s.updated_at)||!validSnapshot(s.production))throw Error('Nedostaje potvrđen snapshot sati i količina.');return s;
}
function documentIntegrity(document){const {integrity,...body}=document;return {algorithm:'sha256',digest:checksum(body)};}
function sealDocument(document){return {...document,integrity:documentIntegrity(document)};}
function verifyDocument(document){return !!document?.integrity&&document.integrity.algorithm==='sha256'&&document.integrity.digest===documentIntegrity(document).digest;}
module.exports={FORMAT,UNITS,validSnapshot,summary,equal,checksum,readSnapshot,documentIntegrity,sealDocument,verifyDocument};
