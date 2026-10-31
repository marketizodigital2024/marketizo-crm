'use strict';
function context(payload, clientId) {
 const clients=payload.clients||[], chosen=clients.find(c=>c.id===clientId);
 if(!chosen)throw Error('Izaberi klijenta.');
 const groupId=String(chosen.billingGroupId||''), primary=groupId?clients.find(c=>c.id===groupId):chosen;
 if(!primary||groupId&&primary.billingGroupId!==groupId)throw Error('Proveri članove zajedničkog računa u profilima klijenata.');
 const members=groupId?clients.filter(c=>c.billingGroupId===groupId).sort((a,b)=>a.id===primary.id?-1:b.id===primary.id?1:a.id.localeCompare(b.id)):[primary];
 if(groupId&&(members.length<2||members.length>10))throw Error('Zajednički račun mora imati 2–10 klijenata.');
 const recipientId=String(primary.billingRecipientId||primary.id),recipient=clients.find(c=>c.id===recipientId);
 if(!recipient||recipient.billingRecipientId&&recipient.billingRecipientId!==recipient.id)throw Error('Izaberi direktnog primaoca računa, bez kružnih veza.');
 if(members.some(c=>c.status&&c.status!=='Aktivan'))throw Error('Račun može obuhvatiti samo aktivne klijente.');
 if(members.some(c=>c.billingRecipientId&&c.billingRecipientId!==recipientId))throw Error('Članovi zajedničkog računa moraju imati istog primaoca.');
 return{primary,recipient,members,groupId};
}
function routing(ctx){const r=ctx.recipient;return{primaryId:ctx.primary.id,recipientId:r.id,recipient:{clientId:r.id,name:r.name,country:r.country||'',email:typeof r.email==='string'?r.email:null,billingName:r.billingName||''},groupId:ctx.groupId,members:ctx.members.map(c=>({clientId:c.id,clientName:c.name,billingGroupId:String(c.billingGroupId||''),billingRecipientId:String(c.billingRecipientId||''),billingFrequency:c.billingFrequency==='once'?'once':'monthly',invoiceStartMonth:String(c.invoiceStartMonth||c.startDate||'').slice(0,7)}))};}
function shares(x){
 const rows=x.clientShares||[{clientId:x.clientId,net:x.net,vat:x.vat,gross:x.gross}];
 if(!Array.isArray(rows)||!rows.length||rows.length>10||new Set(rows.map(r=>r.clientId)).size!==rows.length||rows.some(r=>!r.clientId||!Number.isSafeInteger(r.net)||r.net<=0||!Number.isSafeInteger(r.vat)||r.vat<0||r.net+r.vat!==r.gross)||['net','vat','gross'].some(k=>rows.reduce((s,r)=>s+r[k],0)!==x[k]))throw Error('Raspodela zajedničkog računa nije potvrđena.');
 return rows;
}
// Integer cumulative proportions preserve every cent and make partial payments repeatable.
function portions(total,rows,key='gross'){let before=0,used=0;const sum=rows.reduce((s,r)=>s+r[key],0);return rows.map((r,i)=>{before+=r[key];const next=i===rows.length-1?total:Math.round(total*before/sum),part=next-used;used=next;return part;});}
module.exports={context,routing,shares,portions};
