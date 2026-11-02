'use strict';
const assert=require('node:assert/strict');
const core=require('../lib/clickup-capacity.js');
const f=(name,value,type='number')=>({id:name,name,value,type});
const employee=(id,name,weekly=20,description='')=>({id,name,description,status:{type:'open'},custom_fields:[f('Sati nedeljno',weekly),f('Sati klijenata mesecno',999),f('Opterecenje %',999)]});
const definitions=[{id:'Paid Ads',name:'Paid Ads',type:'drop_down',type_config:{options:[{id:'atila',name:'Atila Varga',orderindex:0},{id:'new',name:'Nova Osoba',orderindex:1}]}},{id:'Snimatelj',name:'Snimatelj',type:'labels',type_config:{options:[{id:'dominik',label:'Dominik Grdic',orderindex:0}]}},...core.ROLES.map(r=>({id:r.relation,name:r.relation,type:'list_relationship'}))];
const client=(id,name,assignments,active=1)=>({id,name,custom_fields:[f('Aktivan broj',active),f('Reela mesečno',12),f('Paid ads sati mesečno',3),...Object.entries(assignments).map(([k,v])=>f(k,v,definitions.find(d=>d.name===k)?.type||'short_text'))]});
let team=[employee('a','Atila Varga'),employee('d','Dominik Grdic'),employee('t','Teodora Marković',38.5,'Raspodela kapaciteta: SMM 50%; Scenarista 50%.')];
let clients=[...Array.from({length:10},(_,i)=>client('c'+i,'Klijent '+i,{'Paid Ads':0})),client('shoot','Snimanje',{'Snimatelj':['dominik']}),client('teodora','Teodora klijent',{SMM:'Teodora Markovic',Scenarista:'Teodora Markovic'}),client('inactive','Neaktivan',{'Paid Ads':'atila'},0)];
let result=core.plan(clients,team,definitions),a=result.rows.find(r=>r.id==='a'),d=result.rows.find(r=>r.id==='d'),t=result.rows.find(r=>r.id==='t');
assert.equal(a.hours,30);assert.equal(a.percent,34.6);assert.equal(a.roles[0].clients,10);assert.equal(d.hours,6);assert.equal(d.percent,6.9);
assert.equal(t.hours,23.8);assert.equal(t.percent,14.3);assert.equal(t.capacity,38.5*52/12);assert(t.roles.every(r=>r.capacity===t.capacity/2));assert.equal(t.roles.find(r=>r.name==='SMM').percent,13.2);assert.equal(t.roles.find(r=>r.name==='Scenarista').percent,15.3);
// A new employee and new dropdown option require no code mapping.
team.push(employee('n','Nova Osoba'));clients.push(client('newclient','Novi klijent',{'Paid Ads':'new'}));result=core.plan(clients,team,definitions);assert.equal(result.rows.find(r=>r.id==='n').hours,3);
// Reassignment and removal change both totals and relationship deltas.
clients[0].custom_fields.find(f=>f.name==='Paid Ads').value='new';result=core.plan(clients,team,definitions);assert.equal(result.rows.find(r=>r.id==='a').hours,27);assert.equal(result.rows.find(r=>r.id==='n').hours,6);
assert(result.writes.some(w=>w.taskId==='c0'&&w.fieldId==='Paid Ads (Tim)'&&w.value.add.includes('n')));
// Idempotency: applying the plan once leaves no subsequent write.
for(const w of result.writes){const task=[...team,...clients].find(t=>t.id===w.taskId);if(w.kind==='description')task.markdown_description=w.value;else{let cf=task.custom_fields.find(f=>f.id===w.fieldId);if(!cf){cf={...definitions.find(f=>f.id===w.fieldId),value:[]};task.custom_fields.push(cf);}cf.value=typeof w.value==='object'?[...(cf.value||[]).filter(v=>!w.value.rem.includes(v.id||v)),...w.value.add.map(id=>({id}))]:w.value;}}
assert.equal(core.plan(clients,team,definitions).writes.length,0);
// Missing weekly capacity never zeros an employee. Bad source options fail before any write.
team.push(employee('no','Bez fonda',null));assert(core.plan(clients,team,definitions).warnings.some(w=>w.includes('Bez fonda')));
assert.throws(()=>core.plan([client('bad','Loš izbor',{'Paid Ads':'unknown'})],team,definitions),/Nepoznata opcija/);
assert.throws(()=>core.shares(employee('bad','Loša podela',20,'Raspodela kapaciteta: SMM 70%; Scenarista 50%')),/100%/);
assert.throws(()=>core.plan([], [employee('x','Atila Varga'),employee('y','Atila Varga')], definitions),/Duplo ime/);
assert.equal(core.norm('Slađan Simić'),'sladan simic');
assert.equal(core.description({description:'Napomena\n\n'+core.description({},a)+'\nKraj'},a).includes('Kraj'),true);
// API security and full pagination, with no real network or production data.
const api=require('../api/clickup-capacity.js');
const original={...process.env},originalFetch=global.fetch;
const response=()=>({statusCode:0,setHeader(){},end(s){this.data=JSON.parse(s);}});
(async()=>{try{
process.env.VERCEL_ENV='preview';let res=response();await api({method:'GET',headers:{}},res);assert.equal(res.statusCode,409);
process.env.VERCEL_ENV='production';res=response();await api({method:'GET',headers:{}},res);assert.equal(res.statusCode,401);
process.env.CRON_SECRET='fixture';process.env.CLICKUP_API_TOKEN='fixture';delete process.env.CLICKUP_CAPACITY_SYNC_ENABLED;
let calls=[];global.fetch=async(url,opts)=>{calls.push({url,opts});if(url.includes('/field'))return {ok:true,json:async()=>({fields:url.includes('1461')?definitions:[]})};return {ok:true,json:async()=>({tasks:url.includes('1461')?clients:team,last_page:true})};};
res=response();await api({method:'GET',headers:{authorization:'Bearer fixture'}},res);assert.equal(res.statusCode,200);assert.equal(res.data.applied,false);assert(calls.every(c=>c.opts.method==='GET'));
let pages=0;global.fetch=async()=>({ok:true,json:async()=>({tasks:pages++===0?Array.from({length:100},(_,i)=>({id:i})):[{id:100}],last_page:pages>1})});assert.equal((await api._test.list('fixture')).length,101);
console.log('PASS ClickUp capacity: reassignment, new hire, inactive clients, split capacity, idempotency, pagination, auth and preview isolation');
}finally{global.fetch=originalFetch;for(const key of Object.keys(process.env))if(!(key in original))delete process.env[key];Object.assign(process.env,original);}})().catch(e=>{console.error(e);process.exitCode=1;});
