'use strict';const assert=require('node:assert/strict'),c=require('../lib/billing-content.js'),{plan}=require('../lib/bank-posting.js');
const client={id:'example',name:'Example Services GmbH',status:'Aktivan',revenue:497,billingProfile:c.profile({legalName:'Example Services GmbH',street:'Musterstraße 1',postalCode:'1010',city:'Wien',country:'AT',email:'billing@example.test',taxMode:'standard20',confirmed:true})};const input={quantity:1,unitCents:49700,description:c.brand.defaults.description,serviceMonth:'2026-10'};
assert.equal(c.brand.logoPath,'marketizo-logo.png');assert.equal(c.brand.version,3);
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
 const values={name:'Client GmbH',country:'Nemačka',email:'accounts@example.test',billing_street:'Street 1',billing_postalCode:'10115',billing_city:'Berlin',billing_vatId:'de 123',billing_taxMode:'reverse-charge',billing_taxNote:'Reverse charge',billing_confirmed:'on'},packed=ctx.billingProfileFromForm({has:k=>k in values,get:k=>values[k]});
 assert.equal(packed.billingProfile.legalName,values.name);assert.equal(packed.billingProfile.country,'DE');assert.equal(packed.billingProfile.email,values.email);assert.equal(packed.billingProfile.confirmed,true);values.billing_taxMode='standard20';assert.equal(ctx.billingProfileFromForm({has:k=>k in values,get:k=>values[k]}).billingProfile.taxNote,'','Hidden reverse-charge note cannot carry into a standard VAT invoice');
 for(const key of ['loginPassword','websiteService','websitePrice','hostingProvider','hostingExpiresAt','hostingPrice','domainName','domainExpiresAt','domainPrice']){assert(!html.includes('name="'+key+'"'));const edit=source.slice(source.indexOf('document.getElementById("editClientForm")?.addEventListener("submit"'),source.indexOf('document.getElementById("portalLeadForm")'));assert(!edit.includes(key+':'),'Removed form must not overwrite stored '+key);}
 assert(!source.includes('editClientLeadSummary'));assert(!source.includes('name="billing_legalName"'));assert(!source.includes('name="billing_email"'));assert(!source.includes('name="billing_country"'));
 const invoiceHtml=fs.readFileSync(__dirname+'/../billing-invoices.html','utf8');assert(!invoiceHtml.includes('billProfileForm'));
 assert.throws(()=>c.snapshot({...client,name:'Changed name'},input),/usklađen/);assert.throws(()=>c.snapshot({...client,email:'other@example.test'},input),/usklađen/);
 console.log('PASS simplified client form: one shared identity, no removed fields, no legacy auth/financial overwrites, no invoice duplicate editor, changed identity blocks issuing');
}

{
 const fs=require('node:fs'),vm=require('node:vm'),source=fs.readFileSync(__dirname+'/../app.js','utf8'),start=source.indexOf('  const previousClient=_confirmedBefore.clients.find'),end=source.indexOf('  withLoginDefaults(client);',start);
 const ctx={client:{id:'one',name:'Legal GmbH'},_confirmedBefore:{clients:[{id:'one',name:'Old name'},{id:'two',name:'Other'}]},state:{leads:[{client:'Old name'},{clientId:'one',client:'Old name'},{clientId:'two',client:'Other'}],teamMembers:[{client:'Old name'}]}};vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);assert.equal(ctx.state.leads[0].clientId,'one');assert.equal(ctx.state.leads[0].client,'Legal GmbH');assert.equal(ctx.state.leads[2].client,'Other');assert.equal(ctx.state.teamMembers[0].clientId,'one');
 const ambiguous={client:{id:'one',name:'Legal GmbH'},_confirmedBefore:{clients:[{id:'one',name:'Duplicate'},{id:'two',name:'Duplicate'}]},state:{leads:[{client:'Duplicate'}]}};vm.createContext(ambiguous);vm.runInContext(source.slice(start,end),ambiguous);assert.equal(ambiguous.state.leads[0].clientId,undefined);
 console.log('PASS client rename: ID links and unique legacy lead/team links preserved; ambiguous names never guessed');
}

assert.throws(()=>c.snapshot({...client,billingProfile:{...client.billingProfile,email:'placeholder@marketizo.local'}},input),/Stvarni e-mail/);

{
 const fs=require('node:fs'),vm=require('node:vm'),source=fs.readFileSync(__dirname+'/../app.js','utf8');assert(source.includes('[["standard20","Sa porezom (20%)"],["exempt","Bez poreza"]]'));
 const begin=source.indexOf('function billingProfileFromForm('),end=source.indexOf('\nfunction setupClientBillingFields',begin),ctx={clientBillingDefaults:require('../client-billing-defaults.js'),String};vm.createContext(ctx);vm.runInContext(source.slice(begin,end),ctx);
 const fields={name:'Example',country:'Nemačka',email:'billing@example.test',billing_street:'Test 1',billing_city:'Berlin',billing_postalCode:'10000',billing_taxMode:'exempt',billing_taxFreeMode:'reverse-charge',billing_taxNote:'Reverse charge',billing_vatId:'DE123456789',billing_confirmed:'on'},get={has:k=>k in fields,get:k=>fields[k]};assert.equal(ctx.billingProfileFromForm(get).billingProfile.taxMode,'reverse-charge','Existing legal basis survives the two-option UI');fields.billing_taxFreeMode='exempt';assert.equal(ctx.billingProfileFromForm(get).billingProfile.taxMode,'exempt');fields.billing_taxMode='standard20';assert.equal(ctx.billingProfileFromForm(get).billingProfile.taxNote,'');
 const ui=fs.readFileSync(__dirname+'/../billing-invoices.js','utf8'),html=fs.readFileSync(__dirname+'/../billing-invoices.html','utf8');assert(html.includes('id="billOpenPdf"'));assert(html.includes('Pregled računa pre slanja'));assert(ui.includes("$('billOpenPdf').href=pdfUrl"));assert(ui.includes("scrollIntoView({behavior:'smooth',block:'center'})"));
 console.log('PASS two tax choices preserve existing reverse-charge basis; preview is displayed and available full-screen before sending');
}

{
 const defaults=require('../client-billing-defaults.js'), contact={...client,email:'accounts@example.test',loginEmail:'existing-login@marketizo.local',billingProfile:{...client.billingProfile,email:'accounts@example.test'}};
 assert.equal(c.snapshot(contact,input).email,'accounts@example.test');assert.equal(contact.loginEmail,'existing-login@marketizo.local');assert.equal(defaults(contact).email,'accounts@example.test');assert.equal(defaults({...contact,email:''}).email,'');assert.throws(()=>c.snapshot({...contact,email:'different@example.test'},input),/usklađen/);assert.throws(()=>c.snapshot({...contact,email:''},input),/usklađen/);
 const fs=require('node:fs'),s=fs.readFileSync(__dirname+'/../app.js','utf8'),edit=s.slice(s.indexOf('document.getElementById("editClientForm")?.addEventListener("submit"'),s.indexOf('document.getElementById("portalLeadForm")'));assert(!edit.includes('loginEmail:'));assert(edit.includes('email: String(formData.get("email")'));const html=fs.readFileSync(__dirname+'/../index.html','utf8');assert(!html.includes('name="loginEmail"'));assert(html.includes('name="email"'));
 console.log('PASS invoice/contact email is independent of unchanged login credentials; clearing or changing the address invalidates stale billing data');
}

{const brand=require('../lib/billing-brand.js');assert.equal(brand.issuer.street,'Simmeringer Hauptstraße 24');assert(!brand.issuer.street.includes('/ 221'));console.log('PASS requested invoice address keeps house number 24 without the apartment suffix');}

{const brand=require('../lib/billing-brand.js');assert.equal(brand.issuer.accountHolder,'Marketizo Digital e.U.');assert.equal(brand.issuer.iban,'AT081200010034820943');console.log('PASS bank-confirmed beneficiary and original IBAN preserved independently from proprietor name');}
