'use strict';
// Run the real quick-send controller with a small DOM fixture; no browser or mail.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
class Element{
 constructor(){this.value='';this.children=[];this.dataset={};this.listeners={};this.classList={toggle(){}};this.hidden=false;}
 setAttribute(k,v){this[k]=v;}append(...c){this.children.push(...c);}replaceChildren(...c){this.children=c;}
 addEventListener(k,f){this.listeners[k]=f;}scrollIntoView(){}reportValidity(){return true;}
 async click(){return this.listeners.click?.({preventDefault(){}});}
}
const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
const buttons=['client','employee','contractor'].map(a=>{const e=new Element();e.dataset.quickAudience=a;return e;});
const templates=buttons.map((b,i)=>({id:String(i),title:b.dataset.quickAudience+' — SR',category:i?'employees':'clients',contractDetails:{audience:b.dataset.quickAudience}}));
const source=t=>({title:t.title,category:t.category,contractDetails:t.contractDetails,recipients:[],content:{version:1,blocks:[]}});
let edited;
const window={addEventListener(){}};
vm.runInNewContext(fs.readFileSync(require.resolve('../marketizo-sign-send.js'),'utf8'),{document:{getElementById:get,createElement:()=>new Element(),querySelectorAll:s=>s==='[data-quick-audience]'?buttons:s==='[data-quick-field]'?get('quickIdentityFields').children.map(w=>{const e=w.children[0];e.dataset.quickField=e['data-quick-field'];return e;}):[]},window,structuredClone,URLSearchParams,AbortController,setTimeout,clearTimeout,crypto:require('node:crypto'),location:{assign(){}},localStorage:{getItem:()=>JSON.stringify({token:'fixture',expiresAt:Date.now()+60000})},fetch:async url=>({ok:true,json:async()=>({ok:true,document:{data:source(templates[Number(new URL('http://fixture'+url).searchParams.get('id'))])}})})});
window.MarketizoQuickSign.init({templates,people:[],sender:{name:'Fixture'},sendingEnabled:true,onOpen(){},onEdit:d=>edited=d});
(async()=>{
 for(let i=0;i<3;i++){
  await buttons[i].click();assert.equal(get('quickTemplates').children.length,1);
  await get('quickTemplates').children[0].click();await get('quickChooseNext').click();
  assert.equal(get('quickContractorTerms').hidden,i!==2);
  assert.equal(get('quickMonthlyFee').required,i===2);
  assert.equal(get('quickBonus').required,i===2);
  get('quickEmail').value='fixture@example.invalid';get('quickMonthlyFee').value='1200';get('quickBonus').value='Nema bonusa.';
  await get('quickEditText').click();
  assert.equal(edited.data.contractDetails.audience,buttons[i].dataset.quickAudience);
  if(i===2){assert.deepEqual(JSON.parse(JSON.stringify(edited.data.contractDetails.compensation)),{monthlyFee:'1200',bonus:'Nema bonusa.'});assert.equal(edited.data.recipients[0].partyType,'business');}
  else assert.equal(edited.data.contractDetails.compensation,undefined);
 }
 console.log('PASS separate client/employee/contractor selectors and admin-only compensation payload');
})().catch(e=>{console.error(e);process.exitCode=1;});
