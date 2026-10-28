'use strict';
const assert=require('node:assert/strict');
const {validateDraft}=require('../lib/sign-content');
const {personalizeDocument,validateFields}=require('../lib/sign-personalization');
function fixture(audience='contractor',category='employees'){
 return {title:'Fixture',category,contractDetails:{audience,compensation:{monthlyFee:'1250,50',bonus:'5% po dogovorenim rezultatima.'}},recipients:[{email:'fixture@example.com',name:'Test',country:'RS'}],content:{version:1,blocks:[{type:'paragraph',runs:[{text:'Naknada: [MESEČNA '},{text:'NAKNADA U EUR].'}]},{type:'paragraph',runs:[{text:'Bonus: [BONUS I USLOVI]'}]}]}};
}
assert.equal(validateDraft(fixture(),'template').contractDetails.compensation,undefined,'Personal pay must not become a template default');
const source=validateDraft(fixture()),snapshot=JSON.stringify(source);
const result=personalizeDocument(source);
assert.equal(result.content.blocks[0].runs[0].text,'Naknada: 1250,50 EUR.');
assert.equal(result.content.blocks[1].runs[0].text,'Bonus: 5% po dogovorenim rezultatima.');
assert.equal(JSON.stringify(source),snapshot,'Rendering must not rewrite saved template/source');
assert.throws(()=>validateFields({monthlyFee:'1'}),/podatke/);
assert.throws(()=>validateFields({bonus:'100%'}),/podatke/);
for(const [audience,category] of [['client','clients'],['employee','employees']]){
 const d=validateDraft(fixture(audience,category));assert.equal(d.contractDetails.compensation,undefined);
 assert.deepEqual(personalizeDocument(d),d,'Client and employee content stays unchanged');
}
for(const monthlyFee of ['0','-1','1e3','1.000,00','Infinity'])assert.throws(()=>validateDraft({...fixture(),contractDetails:{audience:'contractor',compensation:{monthlyFee,bonus:'Nema bonusa.'}}}));
const missing=fixture();delete missing.contractDetails.compensation;assert.throws(()=>personalizeDocument(validateDraft(missing)),/Popuni mesečnu/);
const legacy=fixture();legacy.content.blocks[1].runs=[{text:'Bonus: Pored fiksne naknade, Saradniku može biti isplaćen bonus u iznosu od 10%.'}];assert.equal(personalizeDocument(validateDraft(legacy)).content.blocks[1].runs[0].text,'Bonus: 5% po dogovorenim rezultatima.');
const unsupported=fixture();unsupported.content.blocks[0].runs=[{text:'Naknada: 999 EUR.'}];assert.throws(()=>personalizeDocument(validateDraft(unsupported)),/Šablon saradnika/,'Never show edited fee field while retaining an unrelated fixed price');
console.log('PASS contractor compensation, source immutability, recipient restrictions, and client/employee isolation');
