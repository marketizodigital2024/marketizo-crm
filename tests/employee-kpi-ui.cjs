'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const elements=new Map(),events={};
const element=id=>{if(!elements.has(id))elements.set(id,{hidden:id==='ekApp',value:'',textContent:'',innerHTML:'',handlers:{},addEventListener(name,fn){this.handlers[name]=fn;},setAttribute(){}});return elements.get(id);};
let signedIn=true,resolveRead,requests=0;
const ctx={console,Date,Intl,Map,Set,URLSearchParams,AbortSignal,location:{search:''},localStorage:{getItem:()=>signedIn?JSON.stringify({token:'fixture',expiresAt:Date.now()+60000}):null},document:{getElementById:element,querySelectorAll:()=>[]},fetch:()=>{requests++;return new Promise(resolve=>resolveRead=resolve);},window:{MarketizoWorkAnalytics:require('../work-analytics-core.js'),addEventListener:(name,fn)=>events[name]=fn}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../employee-kpi.js','utf8'),ctx);
(async()=>{
 assert.equal(requests,1);signedIn=false;events.storage({key:'marketizoAdminSession'});assert.equal(element('ekApp').hidden,true);
 resolveRead({ok:true,json:async()=>({ok:true,employees:[],clients:[],logs:[],activities:[],outputs:[],rules:[],scope:'all',viewer:{name:'Previous account'}})});
 await new Promise(resolve=>setImmediate(resolve));await new Promise(resolve=>setImmediate(resolve));
 assert.equal(element('ekApp').hidden,true,'A stale successful request must not reopen private data after logout');
 assert.equal(element('ekDenied').hidden,false);assert.equal(element('ekStatus').textContent,'Prijava je potrebna.');assert.equal(requests,1);
 assert.ok(!element('ekDetail').innerHTML.includes('Previous account'));
 console.log('PASS employee KPI UI: logout during in-flight read discards the old account response and keeps private content hidden');
})().catch(e=>{console.error(e);process.exitCode=1;});
