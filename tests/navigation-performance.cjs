'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const app=fs.readFileSync(__dirname+'/../app.js','utf8'),nav=require('../crm-navigation.js');
function fn(name){const start=app.indexOf('function '+name+'(');assert.ok(start>=0,name);return app.slice(start,app.indexOf('\n}',start)+2);}
for(const [key,,url]of nav.primary){const u=new URL(url,'https://test.local');assert.equal(nav.route(u.pathname,u.hash,u.search).primary,key,url);}
for(const [key,,url]of nav.team){const u=new URL(url,'https://test.local');assert.equal(nav.route(u.pathname,u.hash,u.search).team,key,url);assert.equal(nav.route(u.pathname+'.html',u.hash,u.search).team,key);}
for(const [key,,url]of nav.work){const u=new URL(url,'https://test.local');assert.equal(nav.route(u.pathname,u.hash,u.search).work,key,url);}
assert.equal(nav.route('/marketizo-sign','','?onboarding=1').sign,'onboarding');
assert.equal(nav.route('/employees-hours','#client-costs','').primary,'clientCosts');
const ctx={Intl,Date,Map,document:{getElementById:id=>id==='visible'?{closest:()=>null}:id==='hidden'?{closest:()=>({})}:null}};vm.createContext(ctx);
vm.runInContext(app.slice(0,app.indexOf('// Keep persisted')),ctx);
let count=0;ctx.calculate=()=>++count;
assert.equal(vm.runInContext('memoizedAdminCalculation("x",calculate)',ctx),1);
assert.equal(vm.runInContext('memoizedAdminCalculation("x",calculate)',ctx),2,'Outside render calculations stay fresh');
assert.equal(vm.runInContext('withAdminRenderCache(()=>memoizedAdminCalculation("x",calculate)+memoizedAdminCalculation("x",calculate))',ctx),6);assert.equal(count,3);
vm.runInContext('withAdminRenderCache(()=>withAdminRenderCache(()=>memoizedAdminCalculation("x",calculate)))',ctx);assert.equal(count,4);
assert.throws(()=>vm.runInContext('withAdminRenderCache(()=>{throw Error("fixture")})',ctx));
vm.runInContext('memoizedAdminCalculation("x",calculate)',ctx);assert.equal(count,5,'Exception clears cache');
assert.equal(ctx.employeePanelNeeded('visible'),true);assert.equal(ctx.employeePanelNeeded('hidden'),false);assert.equal(ctx.employeePanelNeeded('missing'),false);
const rows=Array.from({length:3124},(_,id)=>({id})),before=JSON.stringify(rows),collected=[];
for(let p=0;p<63;p++){const page=ctx.workLogPageSlice(rows,p);assert.ok(page.rows.length<=50);collected.push(...page.rows.map(x=>x.id));assert.equal(page.total,3124);}
assert.deepEqual(collected,rows.map(x=>x.id));assert.equal(JSON.stringify(rows),before);assert.equal(ctx.workLogPageSlice(rows,999).page,62);assert.equal(ctx.workLogPageSlice(rows,-1).page,0);assert.equal(ctx.workLogPageSlice([]).from,0);
let active='admin',section='overview',selected='e1',day='2026-10-31';const calls=[];
Object.assign(ctx,{onlineHydrationComplete:true,location:{protocol:'https:'},selectedEmployeeId:selected,currentDateKey:()=>day,window:{MarketizoDashboardHelp:{refresh(){}}},document:{...ctx.document,querySelector:()=>({id:active}),getElementById:()=>({dataset:{employeeSection:section}})}});
for(const name of ['renderAdminPanel','renderClients','renderLeadCrm','renderEmployees','renderAdminTeamCalendar','renderReports','renderClientPortal'])ctx[name]=()=>calls.push(name);
vm.runInContext(fn('renderCurrentAdminView'),ctx);ctx.renderCurrentAdminView();assert.deepEqual(calls,['renderAdminPanel']);ctx.renderCurrentAdminView();assert.equal(calls.length,1);
active='employees';ctx.renderCurrentAdminView();assert.equal(calls.at(-1),'renderEmployees');section='profile';ctx.renderCurrentAdminView();assert.equal(calls.length,3);ctx.renderCurrentAdminView();assert.equal(calls.length,3);
ctx.selectedEmployeeId='e2';ctx.renderCurrentAdminView();assert.equal(calls.length,4);vm.runInContext('adminRenderRevision++',ctx);ctx.renderCurrentAdminView();assert.equal(calls.length,5);day='2026-11-01';ctx.renderCurrentAdminView();assert.equal(calls.length,6);
ctx.onlineHydrationComplete=false;active='reports';ctx.renderCurrentAdminView();assert.equal(calls.length,6,'No protected data rendering before hydration');
const files=['index','employees-overview','employee-profile','employees-absences','employees-recognitions','employees-ratings','employees-goals','employees-hours','employees-settings','work-analytics','kodeks','marketizo-sign','kpi'];
for(const name of files){const html=fs.readFileSync(__dirname+'/../'+name+'.html','utf8');assert.match(html,/crm-navigation\.js/);assert.match(html,/crm-navigation\.css/);assert.match(html,/mobile-crm-nav\.js/);}
console.log('PASS shared navigation: all destinations, team/work routes, Sign modes; fresh per-render cache, exception cleanup, active-view invalidation, hydration gate, complete 3124-row pagination and 13 page integrations');

for(const [, ,url]of nav.team.concat(nav.work)){
 const u=new URL(url,'https://test.local');assert.equal(nav.coreRoute(u.pathname,u.hash).view,'employees');
}
assert.equal(nav.coreRoute('/employee-profile').profile,true);
assert.equal(nav.coreRoute('/employees-hours','#work/history').work,'history');
assert.equal(nav.coreRoute('/employees-hours','#work/invalid').work,'hours');
for(const path of ['/work-analytics','/kodeks','/kpi','/billing-invoices','/other/employees-overview'])assert.equal(nav.coreRoute(path),null,path);
assert.equal(nav.coreRoute('/','#reports').view,'reports');
assert.equal(nav.coreRoute('/','#employees/activities').section,'activities');
assert.equal(nav.coreRoute('/','#employees/unknown'),null);

const events={},windowEvents={},pushes=[],renders=[],classes=new Set();
const draft={id:'employeeWorkForm',dataset:{navigationDirty:'true'},elements:[]};
const field={name:'employeeId',type:'select-one',value:'employee-a',form:draft};draft.elements.push(field);
const root={dataset:{},querySelectorAll:()=>[]};
const routeContext={URL,Event,Set,Map,location:new URL('https://test.local/'),onlineHydrationComplete:true,adminConfirmedSaveInFlight:false,adminRenderedViews:new Map([['["employees","old"]','old'],['reports','keep']]),
 document:{title:'CRM',querySelector:s=>s==='.dashboard-kpis'?{}:null,getElementById:id=>['employeeCompleteHistory','workClientSelect'].includes(id)?{}:id==='employees'?root:id===draft.id?draft:null,
 body:{classList:{toggle(name,on){if(on)classes.add(name);else classes.delete(name);}}},addEventListener(name,cb){(events[name]||=[]).push(cb);}},
 history:{pushState(_,__,url){pushes.push(url);routeContext.location=new URL(url,routeContext.location);}},
 window:{MarketizoNavigation:nav,activateEmployeeAdminSection(section){root.dataset.employeeSection=section;},scrollTo(){},dispatchEvent(){},addEventListener(name,cb){windowEvents[name]=cb;}},
 setupWorkEntrySubsections(){routeContext.window.activateWorkEntrySubsection=section=>root.dataset.workEntrySubsection=section;},
 setActiveView(view){renders.push(view);field.value='employee-b';},normalizeVisibleLayouts(){},updateEmployeeMonthlyPreview(){},showToast(){routeContext.toasts++;},toasts:0};
vm.createContext(routeContext);vm.runInContext(fn('setupFastAdminNavigation'),routeContext);routeContext.setupFastAdminNavigation();
const navigate=routeContext.window.navigateAdminRoute;assert.equal(typeof navigate,'function');
assert.equal(navigate('/employee-profile?employee=employee-b'),true);assert.equal(classes.has('employee-profile-page'),true);assert.equal(field.value,'employee-a','An unrelated employee selection must not change the pending work employee');
assert.equal(routeContext.adminRenderedViews.has('["employees","old"]'),false);assert.equal(routeContext.adminRenderedViews.get('reports'),'keep','Changing employee routes must not invalidate unrelated form views');
assert.equal(navigate('/employees-hours#work/history'),true);assert.equal(root.dataset.workEntrySubsection,'history');assert.equal(classes.has('employee-profile-page'),false);
assert.equal(navigate('/#clients'),true);assert.equal(renders.at(-1),'clients');
let writes=pushes.length;routeContext.adminConfirmedSaveInFlight=true;assert.equal(navigate('/#reports'),true);assert.equal(pushes.length,writes);assert.equal(routeContext.toasts,1);
routeContext.adminConfirmedSaveInFlight=false;routeContext.onlineHydrationComplete=false;assert.equal(navigate('/employees-overview'),false);assert.equal(pushes.length,writes);
routeContext.onlineHydrationComplete=true;for(const destination of ['https://external.test/employees-overview','/work-analytics','/billing-invoices','/?unexpected=1'])assert.equal(navigate(destination),false);
routeContext.location=new URL('https://test.local/employees-goals');windowEvents.popstate();assert.equal(pushes.length,writes,'Back navigation must not push another history entry');assert.equal(root.dataset.employeeSection,'activities');
const anchor={href:'https://test.local/employees-overview',target:'',hasAttribute:()=>false};
const click={button:0,ctrlKey:true,target:{closest:s=>s==='a[href]'?anchor:null},preventDefault(){throw Error('Modified click must retain native behavior');},stopImmediatePropagation(){}};
events.click[0](click);assert.equal(pushes.length,writes);
events.reset[0]({target:draft});assert.equal(draft.dataset.navigationDirty,undefined);
let pendingEmployeeSelection='';const selectedField={form:{dataset:{navigationDirty:'true'}},options:[{value:'employee-b'}],set value(v){pendingEmployeeSelection=v;}};
const selectionContext={document:{getElementById:()=>selectedField}};vm.createContext(selectionContext);vm.runInContext(fn('setSelectedEmployeeOnForms'),selectionContext);selectionContext.setSelectedEmployeeOnForms('employee-b');assert.equal(pendingEmployeeSelection,'','Dirty work forms retain their own employee');
console.log('PASS core document reuse: clean/deep routes, profile/work visibility, history, native modified links, hydration/save guards and pending form employee preservation');
