const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(__dirname+'/../'+p,'utf8');
const app=read('app.js'),portal=read('employee-portal.js'),client=read('client-portal.js');
function functionSource(source,name){const start=source.indexOf('function '+name+'(');assert.ok(start>=0,name);const end=source.indexOf('\n}',start)+2;assert.ok(end>start,name);return source.slice(start,end);}
for(const instant of ['2026-10-14T22:30:00Z','2026-10-31T23:30:00Z','2026-03-29T00:30:00Z']) {
  class Clock extends Date {constructor(...args){super(...(args.length?args:[instant]));}static now(){return Date.parse(instant);}}
  const expected=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Vienna',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(instant));
  for(const source of [app,portal]){const ctx={Date:Clock,Intl};vm.createContext(ctx);vm.runInContext(functionSource(source,'currentDateKey')+'\n'+functionSource(source,'currentMonthKey'),ctx);assert.equal(ctx.currentDateKey(),expected);assert.equal(ctx.currentMonthKey(),expected.slice(0,7));}
}
const ctx={Date,Intl};vm.createContext(ctx);
for(const name of ['parseDate','dateKey','addDays','easterSunday','austrianHolidayMap','publicHolidayName','isWeekend','isAustrianWorkingDay'])vm.runInContext(functionSource(app,name),ctx);
const calendar=require('../lib/business-calendar.js');let checked=0;
for(let year=2025;year<=2028;year++)for(let day=new Date(`${year}-01-01T12:00:00Z`);day.getUTCFullYear()===year;day.setUTCDate(day.getUTCDate()+1)){const key=day.toISOString().slice(0,10);assert.equal(calendar.isWorkingDay(key),ctx.isAustrianWorkingDay(key),key);checked++;}
const nodes={clientActionList:{},clientLeadList:{}};
const render={document:{getElementById:id=>nodes[id],querySelectorAll:()=>[]},Date,currency:new Intl.NumberFormat('de-AT',{style:'currency',currency:'EUR'}),leadRowClass:()=> 'ok',inferLeadPipeline:l=>l.pipeline,statusOptions:()=>'',normalizePhone:()=>'+431'};vm.createContext(render);
for(const name of ['escapeClientText','renderActionList','renderLeadList'])vm.runInContext(functionSource(client,name),render);
const marker='<b>audit marker</b>',lead={id:'fixture" data-audit="yes',name:marker,phone:marker,source:marker,location:marker,service:marker,responsible:marker,pipeline:marker,nextAction:marker,note:marker,lossReason:marker,customFields:{[marker]:marker},createdAt:'2026-10-14',estimate:1};
render.renderActionList([lead]);render.renderLeadList([lead]);
for(const node of Object.values(nodes)){assert.ok(!node.innerHTML.includes(marker));assert.ok(node.innerHTML.includes('&lt;b&gt;audit marker&lt;/b&gt;'));assert.ok(!node.innerHTML.includes('data-audit="yes'));}
const migration={structuredClone,crypto:require('node:crypto'),starterData:{clients:[],employees:[],employeeAbsences:[{id:'sample-absence'}]},starterClientNames:new Set(['Dental Studio Wien']),importedClients:[['Imported fixture','Starter','Poslat','Plaćeno','Firma']],defaultEmployeeProfiles:[{id:'sample-worker'}],withInvoiceDefaults:x=>x,withLoginDefaults:x=>x,packageValues:()=>({}),normalizeClientStatus:x=>x,parseNumber:Number,shiftMonth:()=> '2026-09',currentMonthKey:()=> '2026-10',currentDateKey:()=> '2026-10-14',normalizeLeadStatus:x=>x,isClientLeadStatusContacted:()=>false};
vm.createContext(migration);vm.runInContext(functionSource(app,'migrateState'),migration);
const input={clients:[{id:'real-a',name:'Dental Studio Wien'},{id:'real-b',name:'Valid client'}],employees:[],employeeWorkLogs:[{id:'existing-work',employeeId:'real-employee',minutes:60,hours:1,date:'2026-10-14'}]};const normalized=migration.migrateState(input);
assert.deepEqual(Array.from(normalized.clients,x=>x.id),['real-a','real-b']);assert.equal(normalized.employees.length,0);assert.equal(normalized.employeeAbsences.length,0);assert.equal(normalized.employeeWorkLogs[0].id,'existing-work');assert.equal(normalized.employeeWorkLogs[0].minutes,60);
console.log(`PASS: Vienna midnight/month/DST dates; ${checked} calendar parity days; lead HTML/attribute escaping; opening normalization retains identities and never imports sample rows.`);
