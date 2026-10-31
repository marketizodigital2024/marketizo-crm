const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../client-weekly-reports.js','utf8');
const fixture={id:'review',employeeId:'worker',employeeName:'Hazim',recipientId:'leader',date:'2026-11-02',periodStart:'2026-10-26',periodEnd:'2026-11-01',assignmentSyncedAt:'2026-11-02T11:00:00Z',clients:[{clientId:'c',clientName:'Ivica <script>',roles:['Scenarista']}]};
const clone=x=>structuredClone(x),flush=async()=>{for(let i=0;i<10;i++)await new Promise(r=>setImmediate(r));};
function setup(actor,initial){
 const nodes=new Map(),storage=new Map(),timers=[],posts=[];let server=clone(initial),mode='ok',release;
 function node(id){if(nodes.has(id))return nodes.get(id);const n={id,hidden:true,open:false,dataset:{},value:'',textContent:'',innerHTML:'',elements:{},listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},showModal(){this.open=true;},close(){this.open=false;this.listeners.close?.();},reportValidity(){return true;},reset(){Object.values(this.elements).forEach(f=>f.value='');}};nodes.set(id,n);return n;}
 const form=node('clientWeeklyForm');for(const key of ['positive','negative','help'])form.elements[key+'-0']={value:''};
 const ctx={activeEmployee:{id:actor,isLeader:actor==='leader'},formatDate:x=>x,escapePortalText:x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'),employeeApiHeaders:()=>({}),showToast(){},AbortController,Date,Intl,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},document:{hidden:false,activeElement:null,getElementById:node,querySelector:selector=>selector==='dialog[open]'?[...nodes.values()].find(n=>n.open):null},window:{setTimeout(fn,ms){if(ms===0)timers.push(fn);return 1;},clearTimeout(){},setInterval(fn){ctx.tick=fn;},addEventListener(type,fn){ctx.focus=fn;}},fetch:async(url,options)=>{
  const body=options.body&&JSON.parse(options.body),readSnapshot=!body?clone(server):null;if(body)posts.push(body);
  if(mode==='holdRead'&&!body)await new Promise(r=>release=r);
  if(mode==='hold'&&body?.action==='submit')await new Promise(r=>release=r);
  if(mode==='fail'&&body?.action==='submit')return{ok:false,json:async()=>({ok:false,error:'offline'})};
  if(body?.action==='submit'){server[0].submittedAt='confirmed';server[0].clientAnswers=body.answers;}
  if(body?.action==='acknowledge'){server[0].acknowledgedAt='confirmed';server[0].acknowledgedBy=actor;}
  return{ok:true,json:async()=>({ok:true,reports:clone(readSnapshot||server),report:body?.reportId?clone(server.find(r=>r.id===body.reportId)):undefined,window:{releaseDate:'2026-11-02'},syncedAt:'2026-11-02T11:00:00Z',assignmentPreview:[]})};
 }};
 vm.createContext(ctx);vm.runInContext(source,ctx);return{ctx,node,form,storage,posts,timers,setMode:v=>mode=v,release:()=>release(),setServer:v=>server=clone(v)};
}
(async()=>{
 const focused=setup('worker',[fixture]);focused.ctx.document.activeElement={matches:()=>true};await flush();assert.equal(focused.node('clientWeeklyDialog').open,false,'Do not interrupt typing');focused.ctx.document.activeElement=null;focused.ctx.tick();await flush();assert.equal(focused.node('clientWeeklyDialog').open,true,'Obligation opens once typing finishes');
 const ui=setup('worker',[fixture]);await flush();assert.equal(ui.node('clientWeeklyDialog').open,true);assert.match(ui.node('clientWeeklyFields').innerHTML,/Ivica &lt;script&gt;/);assert.equal((ui.node('clientWeeklyFields').innerHTML.match(/ required /g)||[]).length,3);
 let prevented=false;ui.node('clientWeeklyDialog').listeners.cancel({preventDefault(){prevented=true;}});assert.equal(prevented,true);
 for(const key of ['positive','negative','help'])ui.form.elements[key+'-0'].value='Answer '+key;
 ui.form.listeners.input();assert.equal(ui.storage.size,1);ui.setMode('fail');await ui.form.listeners.submit({preventDefault(){},currentTarget:ui.form});assert.equal(ui.node('clientWeeklyDialog').open,true);assert.equal(ui.form.elements['positive-0'].value,'Answer positive');assert.equal(ui.form.inert,false);assert.match(ui.node('clientWeeklyFormStatus').textContent,/zadržani/);
 ui.setMode('hold');const pending=ui.form.listeners.submit({preventDefault(){},currentTarget:ui.form});await flush();await ui.form.listeners.submit({preventDefault(){},currentTarget:ui.form});assert.equal(ui.posts.filter(p=>p.action==='submit').length,2,'One failed request and exactly one in-flight retry');ui.setMode('ok');ui.release();await pending;assert.equal(ui.node('clientWeeklyDialog').open,false);assert.equal(ui.storage.size,0);
 const completed={...fixture,submittedAt:'now',clientAnswers:[{clientId:'c',positive:'Good',negative:'None',help:'None'}]};const lead=setup('leader',[completed]);await flush();assert.equal(lead.node('clientWeeklyReadDialog').open,true);assert.match(lead.node('clientWeeklyReadContent').innerHTML,/Good/);
 prevented=false;lead.node('clientWeeklyReadDialog').listeners.cancel({preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(lead.posts.filter(p=>p.action==='acknowledge').length,0,'Opening never marks read');
 lead.setMode('holdRead');lead.ctx.focus();await flush();
 await lead.node('clientWeeklyReadAck').listeners.click();lead.setMode('ok');lead.release();await flush();assert.equal(lead.node('clientWeeklyReadDialog').open,false);assert.equal(lead.posts.filter(p=>p.action==='acknowledge').length,1);
 const identity=setup('worker',[fixture]);await flush();identity.ctx.activeEmployee={id:'other'};identity.ctx.tick();assert.equal(identity.node('clientWeeklyDialog').open,false,'Account change hides previous employee form');
 console.log('PASS weekly client UI: three required fields/client, escaped content, scoped drafts, failed-send retention, duplicate-click guard, explicit receipt and identity isolation');
})().catch(e=>{console.error(e);process.exitCode=1;});
