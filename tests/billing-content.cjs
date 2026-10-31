'use strict';const assert=require('node:assert/strict'),c=require('../lib/billing-content.js'),{plan}=require('../lib/bank-posting.js');
const client={id:'example',name:'Example Services GmbH',status:'Aktivan',revenue:497,billingProfile:c.profile({legalName:'Example Services GmbH',street:'Musterstraße 1',postalCode:'1010',city:'Wien',country:'AT',email:'billing@example.test',taxMode:'standard20',confirmed:true})};const input={quantity:1,unitCents:49700,description:c.brand.defaults.description,serviceMonth:'2026-10'};
assert.equal(c.brand.logoPath,'marketizo-logo.png');assert.equal(c.brand.version,2);
const s=c.snapshot(client,input,new Date('2026-10-31T12:00:00Z'));assert.equal(s.netCents,49700);assert.equal(s.vatCents,9940);assert.equal(s.grossCents,59640);
for(const key of ['legalName','street','postalCode','city','country','email','taxMode','confirmed'])assert.throws(()=>c.snapshot({...client,billingProfile:{...client.billingProfile,[key]:''}},input),/Dopuni/);
assert.throws(()=>c.snapshot({...client,billingProfile:{...client.billingProfile,email:'x@example.test\r\nBcc: other@example.test'}},input),/polje/);assert.throws(()=>c.snapshot(client,{...input,quantity:.5}),/količinu/);assert.throws(()=>c.assertCurrent({...client,billingProfile:{...client.billingProfile,street:'Changed'}},s),/promenjen/);
assert.throws(()=>c.snapshot({...client,billingProfile:{...client.billingProfile,taxMode:'reverse-charge'}},input),/UID/);const rc=c.snapshot({...client,billingProfile:{...client.billingProfile,taxMode:'reverse-charge',vatId:'DE123456789',taxNote:'Steuerschuldnerschaft des Leistungsempfängers (Reverse Charge).'}},input);assert.equal(rc.vatCents,0);
const registry={version:1,checkedAt:'2026-10-31',invoices:c.registry([{id:'invoice',status:'sent',number:634,snapshot:s,pdfSha256:'a'.repeat(64)}])};const payload={clients:[{...client,invoices:{'2026-10':{amount:497,paymentStatus:'Nije plaćeno',paymentMethod:'Firma'}}}],employeeWorkLogs:[{keep:true}]},t={id:'bank',accountId:35111204,account:{iban:'AT081200010034820943'},amount:596.4,currency:'EUR',bookingDate:'2026-10-31',purpose:'Rechnung 000634',counterpart:{name:'Example Services GmbH',iban:'unknown'}};
const result=plan(payload,registry,[t],new Date('2026-10-31T12:00:00Z'));assert.equal(result.posted.length,1);assert.equal(result.payload.clients[0].invoices['2026-10'].paidAmount,497);assert.deepEqual(result.payload.employeeWorkLogs,payload.employeeWorkLogs);assert.equal(plan(result.payload,registry,[t],new Date('2026-10-31T12:00:00Z')).posted.length,0);
for(const wrong of [{...t,amount:497},{...t,purpose:'Other'},{...t,counterpart:{name:'Wrong Company'}}])assert.equal(plan(payload,registry,[wrong],new Date('2026-10-31T12:00:00Z')).posted.length,0);
assert.equal(c.registry([{status:'queued',snapshot:s}]).length,0);console.log('PASS billing content: required profile, header injection, explicit tax, integer math, immutable snapshot and conservative bank match without Drive');

{
 const defaults=require('../client-billing-defaults.js'), original={name:'Display name',country:'Nemačka',loginEmail:'login@example.test',billingProfile:{legalName:'Legal GmbH',email:'accounts@example.test',country:'AT',confirmed:true}}, before=JSON.stringify(original);
 assert.deepEqual(defaults(original),original.billingProfile);assert.equal(JSON.stringify(original),before);
 const suggested=defaults({...original,billingProfile:{confirmed:true}});assert.equal(suggested.country,'DE');assert.equal(suggested.email,'login@example.test');assert.equal(suggested.confirmed,false);assert.equal(defaults({country:'Unknown'}).country,undefined);
 console.log('PASS shared profile defaults: preserve explicit legal identity, require confirmation for suggestions, no client mutation');
}

{
 const fs=require('node:fs'),vm=require('node:vm'),source=fs.readFileSync(__dirname+'/../app.js','utf8'),html=fs.readFileSync(__dirname+'/../index.html','utf8');
 const begin=source.indexOf('function billingProfileFromForm('),end=source.indexOf('\nfunction setupClientBillingFields',begin),ctx={clientBillingDefaults:require('../client-billing-defaults.js'),String};vm.createContext(ctx);vm.runInContext(source.slice(begin,end),ctx);
 const values={name:'Client GmbH',country:'Nemačka',loginEmail:'accounts@example.test',billing_street:'Street 1',billing_postalCode:'10115',billing_city:'Berlin',billing_vatId:'de 123',billing_taxMode:'reverse-charge',billing_taxNote:'Reverse charge',billing_confirmed:'on'},packed=ctx.billingProfileFromForm({has:k=>k in values,get:k=>values[k]});
 assert.equal(packed.billingProfile.legalName,values.name);assert.equal(packed.billingProfile.country,'DE');assert.equal(packed.billingProfile.email,values.loginEmail);assert.equal(packed.billingProfile.confirmed,true);
 for(const key of ['loginPassword','websiteService','websitePrice','hostingProvider','hostingExpiresAt','hostingPrice','domainName','domainExpiresAt','domainPrice']){assert(!html.includes('name="'+key+'"'));const edit=source.slice(source.indexOf('document.getElementById("editClientForm")?.addEventListener("submit"'),source.indexOf('document.getElementById("portalLeadForm")'));assert(!edit.includes(key+':'),'Removed form must not overwrite stored '+key);}
 assert(!source.includes('editClientLeadSummary'));assert(!source.includes('name="billing_legalName"'));assert(!source.includes('name="billing_email"'));assert(!source.includes('name="billing_country"'));
 const invoiceHtml=fs.readFileSync(__dirname+'/../billing-invoices.html','utf8');assert(!invoiceHtml.includes('billProfileForm'));
 assert.throws(()=>c.snapshot({...client,name:'Changed name'},input),/usklađen/);assert.throws(()=>c.snapshot({...client,loginEmail:'other@example.test'},input),/usklađen/);
 console.log('PASS simplified client form: one shared identity, no removed fields, no legacy auth/financial overwrites, no invoice duplicate editor, changed identity blocks issuing');
}

{
 const fs=require('node:fs'),vm=require('node:vm'),source=fs.readFileSync(__dirname+'/../app.js','utf8'),start=source.indexOf('  const previousClient=_confirmedBefore.clients.find'),end=source.indexOf('  withLoginDefaults(client);',start);
 const ctx={client:{id:'one',name:'Legal GmbH'},_confirmedBefore:{clients:[{id:'one',name:'Old name'},{id:'two',name:'Other'}]},state:{leads:[{client:'Old name'},{clientId:'one',client:'Old name'},{clientId:'two',client:'Other'}],teamMembers:[{client:'Old name'}]}};vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);assert.equal(ctx.state.leads[0].clientId,'one');assert.equal(ctx.state.leads[0].client,'Legal GmbH');assert.equal(ctx.state.leads[2].client,'Other');assert.equal(ctx.state.teamMembers[0].clientId,'one');
 const ambiguous={client:{id:'one',name:'Legal GmbH'},_confirmedBefore:{clients:[{id:'one',name:'Duplicate'},{id:'two',name:'Duplicate'}]},state:{leads:[{client:'Duplicate'}]}};vm.createContext(ambiguous);vm.runInContext(source.slice(start,end),ambiguous);assert.equal(ambiguous.state.leads[0].clientId,undefined);
 console.log('PASS client rename: ID links and unique legacy lead/team links preserved; ambiguous names never guessed');
}

assert.throws(()=>c.snapshot({...client,billingProfile:{...client.billingProfile,email:'placeholder@marketizo.local'}},input),/Stvarni e-mail/);
