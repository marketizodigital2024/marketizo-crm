'use strict';
// Execute the public signing controller with API/DOM fixtures, without signing.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
class Element{
 constructor(){this.value='';this.children=[];this.dataset={};this.listeners={};this.attributes={};this.classList={toggle(){}};this.hidden=false;this.textContent='';}
 setAttribute(k,v){this.attributes[k]=v;}append(...c){this.children.push(...c);}replaceChildren(...c){this.children=c;}
 addEventListener(k,f){this.listeners[k]=f;}scrollIntoView(){}focus(){}reportValidity(){return true;}
 querySelectorAll(){return this.children.map(c=>c.children.find(x=>x.name)).filter(Boolean);}
 getContext(){return {clearRect(){}};}async click(){return this.listeners.click?.({preventDefault(){}});}
}
const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
let completed=false,accepts=0,includeCompletion=true,alreadySigned=false,onboarding=false;
const c={complete:false,ready:false,allComplete:false,required:['name','country','address','company','taxId'],locked:{},values:{},language:'sr'};
const view=()=>({ok:true,verified:true,clientReceiptEmail:onboarding,name:'',title:includeCompletion?'Fixture':'Pravila saradnje — Marketizo Digital',status:alreadySigned?'signed':'open',accepted:alreadySigned,pdfSha256:'fixture-sha',...(includeCompletion?{completion:{...c,complete:completed,ready:completed}}:{})});
const ctx={document:{documentElement:{},getElementById:get,createElement:()=>new Element(),createDocumentFragment:()=>new Element(),querySelectorAll:()=>[]},URL,AbortController,setTimeout,clearTimeout,crypto:require('node:crypto'),location:{hash:'',pathname:'/sign'},history:{replaceState(){}},fetch:async(url,opts)=>{const action=opts.method==='POST'?JSON.parse(opts.body).action:new URL('https://fixture'+url).searchParams.get('action');if(action==='complete_details')completed=true;if(action==='accept')accepts++;return {ok:true,json:async()=>['preview','receipt_preview','initial_preview'].includes(action)?{ok:true,pdfSha256:'fixture-sha',language:'sr',pages:[[{text:'Fixture contract'}]]}:view()};}};
vm.runInNewContext(fs.readFileSync(require.resolve('../sign.js'),'utf8'),ctx);
async function flush(){for(let i=0;i<12;i++)await new Promise(setImmediate);}
(async()=>{
 await flush();
 assert.equal(get('signatureSection').hidden,true);
 assert.equal(get('signSteps').children[0].attributes['aria-current'],'step');
 assert.match(get('detailsHint').textContent,/Ovo još nije potpisivanje/);
 const fields=get('detailsFields').querySelectorAll('input');
 assert.equal(fields.some(x=>x.name==='capacity'),false);assert.equal(fields.find(x=>x.name==='postalCode').maxLength,20);
 assert.ok(fields.every(x=>x.placeholder),'Every visible identity input has an example');
 assert.equal(fields.find(x=>x.name==='taxId').placeholder,'Npr. 123456789 (PIB)');
 await get('detailsForm').listeners.submit({preventDefault(){}});await flush();
 assert.equal(get('detailsSection').hidden,true);
 assert.equal(get('signatureSection').hidden,true,'Confirming identity shows the agreement first');
 assert.equal(get('signSteps').children[1].attributes['aria-current'],'step');
 assert.equal(accepts,0,'Confirming data does not sign');
 await get('startSigning').click();
 assert.equal(get('signatureSection').hidden,false);
 assert.equal(get('signSteps').children[2].attributes['aria-current'],'step');
 assert.equal(accepts,0,'Opening signature step does not sign');
 elements.clear();includeCompletion=false;
 vm.runInNewContext(fs.readFileSync(require.resolve('../sign.js'),'utf8'),ctx);await flush();
 assert.equal(get('signSteps').children.length,2,'Prefilled documents must not invent a data-entry step');
 assert.equal(get('signSteps').children[0].textContent,'1. Pročitajte pravila');
 assert.equal(get('signSteps').children[0].attributes['aria-current'],'step');
 assert.match(get('readHint').textContent,/proverite svoje podatke/);
 await get('startSigning').click();
 assert.equal(get('signSteps').children[1].textContent,'2. Potvrdite i potpišite');
 assert.equal(get('signSteps').children[1].attributes['aria-current'],'step');
 assert.equal(accepts,0);
 elements.clear();alreadySigned=true;vm.runInNewContext(fs.readFileSync(require.resolve('../sign.js'),'utf8'),ctx);await flush();
 assert.ok(get('signSteps').children.every(e=>e.className==='done'));assert.ok(get('signSteps').children.every(e=>!e.attributes['aria-current']));
 elements.clear();alreadySigned=false;includeCompletion=true;completed=false;onboarding=true;
 vm.runInNewContext(fs.readFileSync(require.resolve('../sign.js'),'utf8'),ctx);await flush();
 assert.equal(get('detailsSection').hidden,true,'Onboarding must show the rules before requesting identity');
 assert.equal(get('readBeforeDetails').hidden,false);assert.ok(get('documentPages').children.length);
 assert.equal(get('signSteps').children[0].textContent,'1. Pročitajte pravila');
 assert.equal(get('signSteps').children[0].attributes['aria-current'],'step');
 assert.equal(get('signatureSection').hidden,true);assert.equal(accepts,0);
 await get('readBeforeDetails').click();await flush();
 assert.equal(get('detailsSection').hidden,false);assert.equal(get('readBeforeDetails').hidden,true);
 assert.equal(get('signSteps').children[1].attributes['aria-current'],'step');assert.equal(accepts,0);
 await get('detailsForm').listeners.submit({preventDefault(){}});await flush();
 assert.equal(get('detailsSection').hidden,true);assert.equal(get('signatureSection').hidden,true);
 assert.equal(get('signSteps').children[2].attributes['aria-current'],'step');assert.equal(accepts,0);
 const html=fs.readFileSync(require.resolve('../sign.html'),'utf8');assert.ok(html.indexOf('id="startSigning"')>html.indexOf('id="documentPages"'),'Signature action follows the full agreement');
 console.log('PASS identity examples, removed capacity, and explicit data -> read -> signature stages without automatic acceptance');
})().catch(e=>{console.error(e);process.exitCode=1;});
