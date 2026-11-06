import {readAudit,writeAudit,authorized,ask,ideasSchema,clean} from '../lib/audit-engine.js';
export const config={maxDuration:90};
const WEBHOOK='https://services.leadconnectorhq.com/hooks/J9svmFaKnsH9r8T04I0D/webhook-trigger/dce8189c-7b35-444d-bea6-e2b38641512c';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});const body=req.body||{};
 try{
  const row=await readAudit(body.auditId);if(!row||!authorized(row,body.accessToken))return res.status(404).json({error:'Link do analize nije potpun ili više nije dostupan. Pokreni novi pregled.'});
  if(!row.lead.unlocked){const lead=body.lead||{},name=clean(lead.name,120),email=clean(lead.email,200).toLowerCase(),phone=clean(lead.phone,50),business=clean(lead.business,500);
   if(name.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)||phone.replace(/\D/g,'').length<8||business.length<3||lead.consent!==true)return res.status(400).json({error:'Unesi ime, ispravan email, telefon i delatnost i potvrdi obradu podataka.'});
   const testMode=/@example\.(com|org|net)$/.test(email)&&name.startsWith('Marketizo QA');
   row.lead={...row.lead,name,email,phone,business,consentAt:new Date().toISOString(),unlocked:true,crmStatus:testMode?'test':'pending',testMode};await writeAudit(body.auditId,{lead:row.lead});
  }
  if(row.lead.crmStatus==='pending'){try{const r=await fetch(WEBHOOK,{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(8000),body:JSON.stringify({name:row.lead.name,email:row.lead.email,phone:row.lead.phone,business:row.lead.business,source:'Marketizo Brand Audit',event:'audit_free_unlock',audit_id:body.auditId,audit_score:row.audit.overallScore,audit_tag:'marketizo-brand-audit',tags:['marketizo-brand-audit','audit-free']})});if(r.ok)row.lead.crmStatus='accepted';}catch{console.error('audit_crm_pending',body.auditId);}await writeAudit(body.auditId,{lead:row.lead});}
  if(!row.audit.contentIdeas&&body.generatePlan===true){try{
   const plan=await ask('Napiši 26 RAZLIČITIH ideja za ovaj biznis: 12 Reelova, 12 storija, jednu objavu, jedan karusel. title je gotova udica do 12 reči, execution je konkretna izvedba do 35 reči: kadar, rečenica, sledeći korak. reason do 18 reči povezanih sa nalazom. postIndex upućuje na stvarnu objavu kao kontekst. Ne prepakuj istu temu 26 puta. Ne izmišljaj iskustva klijenata: predloži da se prikupe ako nisu potvrđena. Pokrij otkrivanje brenda, proces, dokaz, nedoumice i prijavu. Koristi delatnost i publiku sa profila, kontekst vlasnika je dodatak.',ideasSchema,{business:row.lead.business,analysis:row.audit,posts:row.evidence.map(({image,...p})=>p)},[],55000);
   if(Object.values(plan.contentIdeas).flat().some(x=>!row.evidence[x.postIndex]))throw Error('invalid_plan_references');row.audit.contentIdeas=plan.contentIdeas;await writeAudit(body.auditId,{audit:row.audit});
  }catch(e){console.error('audit_plan_failed',clean(e.message,160));return res.status(200).json({audit:row.audit,evidence:row.evidence,lead:{name:row.lead.name,business:row.lead.business},unlocked:true,planPending:true,warning:'Analiza je spremna. Mesečni plan trenutno nije dovršen — pokreni ga ponovo dugmetom ispod.'});}}
  return res.status(200).json({audit:row.audit,evidence:row.evidence,lead:{name:row.lead.name,business:row.lead.business},unlocked:true,planPending:!row.audit.contentIdeas});
 }catch(e){console.error('audit_report_failed',clean(e.message,200));return res.status(503).json({error:'Izveštaj trenutno nije dostupan. Pokušaj ponovo; već sačuvani kontakt ostaje sačuvan.'});}
}
