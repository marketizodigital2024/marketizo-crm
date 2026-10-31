'use strict';
const crypto=require('node:crypto');
const {accessSession,readStoredState,supabaseConfig,supabaseHeaders,preserveDailyPrewriteBackup}=require('./state.js').helpers;
const {registryFrom}=require('../lib/bank-matching.js');
const {plan}=require('../lib/bank-posting.js');
const {transactions}=require('./bank-matches.js')._test;
const {request}=require('../lib/database-request.js');
const oneoff=require('../lib/billing-oneoff.js');
function json(res,status,body){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','private, no-store');res.end(JSON.stringify(body));}
function cronAuth(req){const expected=process.env.CRON_SECRET,actual=String(req.headers?.authorization||'');return !!expected&&actual.length===('Bearer '+expected).length&&crypto.timingSafeEqual(Buffer.from(actual),Buffer.from('Bearer '+expected));}
async function handler(req,res){
  if(!['GET','POST'].includes(req.method))return json(res,405,{ok:false,error:'Metod nije podržan.'});
  const cron=req.method==='GET'&&cronAuth(req);
  if(!cron&&!/^Bearer\s+\S+/i.test(String(req.headers?.authorization||'')))return json(res,401,{ok:false,error:'Prijava je obavezna.'});
  if(req.method==='GET'&&!cron)return json(res,401,{ok:false,error:'Serverska provera zahteva ovlašćenje.'});
  if(process.env.VERCEL_ENV!=='production')return json(res,409,{ok:false,error:'Automatski upis je dozvoljen samo u produkciji.'});
  const config=supabaseConfig();if(!config.configured)return json(res,503,{ok:false,error:'Baza nije dostupna.'});
  try{
    let current=await readStoredState(config);
    function allowed(c){return cron||accessSession(req,c.payload,config.key)?.role==='full-admin';}
    if(!allowed(current))return json(res,403,{ok:false,error:'Samo vlasnik može da pokrene usklađivanje.'});
    const registry=process.env.FINANCE_GOOGLE_AUDIENCES ? await require('../lib/finance-source-store.js').loadBankRegistry(config,process.env.BANK_DRIVE_REGISTRY) : registryFrom(process.env.BANK_DRIVE_REGISTRY), key=process.env.KONTOFLUX_READ_KEY;
    if(!key)throw Error('missing bank configuration');
    const bank=await transactions(key);
    for(let attempt=0;attempt<5;attempt++){
      if(!allowed(current))return json(res,403,{ok:false,error:'Pristup više nije dostupan.'});
      if(!current.updatedAt)throw Error('missing state');
      const result=plan(oneoff.expand(current.payload),registry,bank);
      if(!result.posted.length)return json(res,200,{ok:true,posted:[],checkedAt:new Date().toISOString()});
      await preserveDailyPrewriteBackup(config,current);
      const updatedAt=new Date(Math.max(Date.now(),Date.parse(current.updatedAt)+1)).toISOString();
      const table=process.env.SUPABASE_TABLE||'agency_crm_state',id=process.env.CRM_STATE_ID||'marketizo-main';
      const response=await request(fetch,`${config.url}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}&updated_at=eq.${encodeURIComponent(current.updatedAt)}&select=updated_at`,{method:'PATCH',headers:{...supabaseHeaders(config.key),Prefer:'return=representation'},body:JSON.stringify({payload:oneoff.collapse(result.payload),updated_at:updatedAt})});
      if(!response.ok)throw Error('database write failed');
      const rows=await response.json();
      if(Array.isArray(rows)&&rows.length===1){
        const reloaded=await readStoredState(config);
        const persisted=result.posted.every(p=>oneoff.expand(reloaded.payload).clients?.find(c=>c.id===p.clientId)?.invoices?.[p.month]?.payments?.some(t=>t.id==='bank-'+p.bankTransactionId));
        if(!persisted)throw Error('readback failed');
        return json(res,200,{ok:true,posted:result.posted,updatedAt,unchangedOtherCollections:result.unchangedDigest,verifiedReadback:true});
      }
      current=await readStoredState(config);
    }
    return json(res,409,{ok:false,error:'Drugi upis je u toku. Provera će se ponoviti bez dupliranja uplata.'});
  }catch{return json(res,502,{ok:false,error:'Usklađivanje nije potvrđeno. Osveži prikaz pre ponovnog pokušaja; bankarske uplate se ne dupliraju.'});}
}
module.exports=handler;
module.exports._test={cronAuth};
