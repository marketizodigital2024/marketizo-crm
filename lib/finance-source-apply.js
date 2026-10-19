'use strict';
const {readStoredState,supabaseHeaders,preserveDailyPrewriteBackup}=require('../api/state.js').helpers;
const {request}=require('./database-request.js');
const sources=require('./finance-source-store.js');
const {planSources}=require('./finance-email-evidence.js');
async function apply(config){
 for(let n=0;n<6;n++){
  const current=await readStoredState(config);if(!current.updatedAt)throw Error('Glavni zapis nije dostupan.');
  const privateState=await sources.read(config),registry=sources.mergeRegistry(process.env.BANK_DRIVE_REGISTRY,privateState.data);
  const result=planSources(current.payload,registry,privateState.data);if(!result.changes.length)return{changes:[]};
  await preserveDailyPrewriteBackup(config,current);
  const updatedAt=new Date(Math.max(Date.now(),Date.parse(current.updatedAt)+1)).toISOString();
  const table=process.env.SUPABASE_TABLE||'agency_crm_state',id=process.env.CRM_STATE_ID||'marketizo-main';
  const r=await request(fetch,`${config.url}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}&updated_at=eq.${encodeURIComponent(current.updatedAt)}&select=updated_at`,{method:'PATCH',headers:{...supabaseHeaders(config.key),Prefer:'return=representation'},body:JSON.stringify({payload:result.payload,updated_at:updatedAt})});
  if(!r.ok)throw Error('Upis dokaza nije potvrđen.');const rows=await r.json();if(Array.isArray(rows)&&rows.length===1){
   const check=await readStoredState(config);if(!result.changes.every(x=>check.payload.clients?.find(c=>c.id===x.clientId)?.invoices?.[x.month]?.originalInvoice?.number===x.number))throw Error('Ponovno čitanje nije potvrdilo upis.');
   return{changes:result.changes,verifiedReadback:true};
  }
 }
 throw Error('Baza je zauzeta. Ponovi proveru.');
}
module.exports={apply};
