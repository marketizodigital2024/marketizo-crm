'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), crypto = require('node:crypto');
const template = require('../sign-onboarding-template.js');
const {validateDraft, assertReady} = require('../lib/sign-content.js');
class Element {
  constructor(){this.value='';this.children=[];this.dataset={};this.listeners={};this.classList={toggle(){}};this.hidden=false;}
  setAttribute(k,v){this[k]=v;if(k==='data-quick-field')this.dataset.quickField=v;}
  append(...children){for(const child of children){child.parentElement=this;this.children.push(child);}}
  replaceChildren(...children){this.children=[];this.append(...children);}
  addEventListener(k,fn){this.listeners[k]=fn;} scrollIntoView(){} reportValidity(){return true;}
}
const elements=new Map(), get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
let edited, saved=[], sent=[], current;
for(const id of ['quickEmail','quickContact','quickPartyType'])get(id).parentElement=new Element();
const window={addEventListener(){},MarketizoOnboarding:template};
const document={getElementById:get,createElement:()=>new Element(),querySelectorAll:selector=>selector==='[data-quick-field]'?get('quickIdentityFields').children.map(e=>e.children[0]):[]};
const response=data=>({ok:true,json:async()=>({ok:true,...data})});
vm.runInNewContext(fs.readFileSync(require.resolve('../marketizo-sign-send.js'),'utf8'),{
  window,document,structuredClone,URL,URLSearchParams,AbortController,setTimeout,clearTimeout,crypto,
  location:{origin:'https://fixture.invalid',assign(){}},localStorage:{getItem:()=>JSON.stringify({token:'fixture',expiresAt:Date.now()+60000})},
  fetch:async(url,options)=>{
    const body=options.body?JSON.parse(options.body):null;
    if(body?.action==='save'){saved.push(body);current={id:body.id,status:'draft',revision:1,data:body.data};return response({revision:1});}
    if(body?.action==='preparePdf'){current={...current,status:'ready',revision:2};return response({document:current,pdfSha256:'a'.repeat(64)});}
    if(new URL('https://fixture.invalid'+url).searchParams.get('action')==='preparedPreview')return response({pdfSha256:'a'.repeat(64),pages:[[{text:'Pravila saradnje — Marketizo Digital'}]]});
    if(body?.action==='send'){sent.push(body);return response({links:[{email:current.data.recipients[0].email,url:'https://fixture.invalid/sign#'+'a'.repeat(43)}]});}
    throw Error('Unexpected fixture request');
  }
});
window.MarketizoQuickSign.init({templates:[],people:[],sender:{name:'Fixture Owner'},sendingEnabled:true,onOpen(){},onEdit:doc=>edited=doc});
(async()=>{
  const first=template.create();first.content.blocks[0].runs[0].text='changed';assert.notEqual(template.create().content.blocks[0].runs[0].text,'changed');
  window.MarketizoQuickSign.startOnboarding();
  assert.equal(saved.length,0,'Opening a shared template must not create a client record');
  assert.equal(get('quickPrefill').open,false);assert.equal(get('quickEmail').required,false);
  for(const key of ['name','company','country'])assert.equal(document.querySelectorAll('[data-quick-field]').find(e=>e.dataset.quickField===key).required,false);
  assert.equal(document.querySelectorAll('[data-quick-field]').find(e=>e.dataset.quickField==='taxId').parentElement.hidden,true);
  function fill(){get('quickEmail').value='';for(const e of document.querySelectorAll('[data-quick-field]'))e.value=({name:'Test Klijent',company:'Test Firma',country:'RS'})[e.dataset.quickField]||'';}
  fill();await get('quickRecipient').listeners.submit({preventDefault(){}});await new Promise(setImmediate);
  assert.equal(saved.length,1);assert.equal(saved[0].data.recipientCompletion,true);
  assert.equal(saved[0].data.recipients[0].company,'Test Firma');assertReady(validateDraft(saved[0].data));
  const text=saved[0].data.content.blocks.flatMap(b=>b.runs.map(r=>r.text)).join('\n');
  for(const term of ['Scenarije šaljemo tri dana pre snimanja', '24 sata od prijema', 'bez izmena scenarija', 'svaki scenario, klip i dizajn', 'najviše jedna revizija', 'Ne snimamo vikendom', 'doplatu', '24 sata od ulaska u sistem','Pre dolaska naše ekipe','jasne potvrde u zajedničkoj grupi','ne preuzima odgovornost za zatvaranje prodaje','plaćeni oglasi se ne prikazuju','potpisujemo pre njegovog završetka'])assert.ok(text.includes(term),term);
  assert.equal(sent.length,0,'Preview must not send or sign');
  get('quickConfirm').checked=true;await get('quickCreateLink').listeners.click();await new Promise(setImmediate);
  assert.equal(sent.length,1);assert.equal(sent[0].delivery,'link');
  assert.equal(get('quickSuccessLinks').children.some(e=>e.href?.startsWith('https://fixture.invalid/sign#')),true);
  assert.match(get('quickSuccessText').textContent,/još ne znači da je dokument potpisan/);
  window.MarketizoQuickSign.startOnboarding();fill();await get('quickRecipient').listeners.submit({preventDefault(){}});await new Promise(setImmediate);
  assert.equal(saved.length,2);assert.notEqual(saved[0].id,saved[1].id,'Each onboarding gets its own document');
  console.log('PASS: onboarding template isolation, required identity, full approved rules, separate documents, preview-only preparation and explicit recipient signing link');
})().catch(e=>{console.error(e);process.exitCode=1;});
