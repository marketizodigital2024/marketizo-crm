'use strict';
const { request } = require('./database-request.js');
const { SignError } = require('./sign-content.js');
const { PREFIX,metadata } = require('./codeks.js');
function createCodeksStore(config, fetcher=fetch) {
 async function db(path,options={}) {
  const r=await request(fetcher,`${config.url}/rest/v1/${path}`,{...options,headers:{apikey:config.key,Authorization:`Bearer ${config.key}`,'Content-Type':'application/json'}});
  if(!r.ok)throw new SignError(503,'Kodeks trenutno nije dostupan. Pokušaj ponovo.');
  return r.json();
 }
 const org=config.organization;
 return {
  db,
  async ready() {
   const fields=await db('rpc/marketizo_sign_required_fields',{method:'POST',body:JSON.stringify({rec:{name:'Check',email:'check@example.invalid',partyType:'individual'},doc:{category:'other',note:PREFIX+'check'}})});
   return Array.isArray(fields)&&fields.length===1&&fields[0]==='name';
  },
  async list({employeeId,offset=0}={}) {
   const q=new URLSearchParams({organization_id:`eq.${org}`,select:'id,title,status,revision,updated_at,data',order:'updated_at.desc,id.asc',limit:'41',offset:String(offset),'data->>note':`like.${PREFIX}*`});
   // Employee restriction is applied in the database before pagination, then checked again on the returned row.
   if(employeeId)q.set('data->>note',`like.${PREFIX}*|${encodeURIComponent(employeeId)}`);
   const rows=await db('marketizo_sign_documents?'+q);
   const items=rows.slice(0,40).filter(d=>metadata(d)&&(!employeeId||metadata(d).employeeId===employeeId));
   if(items.length){
    const ids=items.map(d=>d.id).join(',');
    const requests=await db('marketizo_sign_requests?'+new URLSearchParams({organization_id:`eq.${org}`,document_id:`in.(${ids})`,select:'document_id,status,expires_at,id'}));
    // A signature may be accepted while final PDF generation is still queued.
    const parties=requests.length?await db('marketizo_sign_parties?'+new URLSearchParams({request_id:`in.(${requests.map(r=>r.id).join(',')})`,select:'request_id,accepted_at'})):[];
    return {items:items.map(d=>{const r=requests.find(r=>r.document_id===d.id),p=r&&parties.find(p=>p.request_id===r.id);return {id:d.id,title:d.title,...metadata(d),name:d.data.recipients[0]?.name||'',status:r?(r.status==='signed'?'signed':p?.accepted_at?'processing':r.status==='voided'?'voided':r.status==='expired'||Date.parse(r.expires_at)<=Date.now()?'expired':'pending'):'prepared',signedAt:p?.accepted_at||null,expiresAt:r?.expires_at||null};}),hasMore:rows.length>40,offset};
   }
   return {items:[],hasMore:rows.length>40,offset};
  },
  async link(documentId) {
   const rows=await db('marketizo_sign_requests?'+new URLSearchParams({organization_id:`eq.${org}`,document_id:`eq.${documentId}`,select:'id,status,expires_at'}));
   const r=rows[0];if(!r)throw new SignError(409,'Kodeks još nije poslat na potpis.');
   if(['expired','voided'].includes(r.status)||(r.status!=='signed'&&Date.parse(r.expires_at)<=Date.now()))throw new SignError(409,'Poziv je istekao ili je poništen. Obrati se administratoru.');
   const out=await db('marketizo_sign_outbox?'+new URLSearchParams({request_id:`eq.${r.id}`,kind:'eq.invitation',select:'sealed_payload'}));
   const mail=out[0]&&require('./sign-workflow.js').unseal(out[0].sealed_payload);
   if(!mail?.link)throw new SignError(503,'Poziv za potpis trenutno nije dostupan.');
   return mail.link;
  }
 };
}
module.exports={createCodeksStore};
