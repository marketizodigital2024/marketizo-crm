const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..'),type='Slobodno za prekovremene sate';
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
function fn(file,name){const s=read(file),a=s.indexOf('function '+name+'(');assert.ok(a>=0);return s.slice(a,s.indexOf('\n}',a)+2)}
const forms=['index.html','employees-overview.html','employees-hours.html','employees-absences.html','employees-ratings.html','employees-recognitions.html','employees-goals.html','employees-settings.html','employee-profile.html','employee-login.html'];
for(const file of forms){const s=read(file);assert.equal((s.match(/<option value="Slobodno za prekovremene sate">Slobodno za prekovremene sate \(Zeitausgleich\)<\/option>/g)||[]).length,1,file);}
assert.match(read('app.js'),/const employeeAbsenceTypes = .*"Slobodno za prekovremene sate"/);
const employee={id:'worker',weeklyHours:38.5,startDate:'2026-01-01'},date='2026-11-02';
for(const file of ['app.js','employee-portal.js']){
 const state={employeeAbsences:[],employeeWorkLogs:[],employeeHourAdjustments:[]};
 const ctx={state,activeEmployee:employee,employeeById:()=>employee,parseNumber:Number,currentDateKey:()=>date,Date,Math,workdayKeysBetween:()=>[date],absenceWorkdays:()=>[date],workdaysInMonth:()=>[date],employeeWeeklyHoursForMonth:()=>38.5};vm.createContext(ctx);
 for(const n of ['scheduledMinutesForDate',file==='app.js'?'employeeExpectedHours':'expectedHours','employeeYearAbsenceDays'])vm.runInContext(fn(file,n),ctx);
 const baseline=(ctx.expectedHours||ctx.employeeExpectedHours)(employee,'2026-11');assert.equal(baseline,8.5);
 for(const status of ['Zatraženo','Odbijeno','Odobreno']){
 state.employeeAbsences=[{id:'fixture',employeeId:'worker',type,status,startDate:date,endDate:date}];
 assert.equal((ctx.expectedHours||ctx.employeeExpectedHours)(employee,'2026-11'),status==='Odobreno'?0:baseline,file+' respects approval');
 for(const leave of ['Godišnji odmor','Poklon dan'])assert.equal(file==='app.js'?ctx.employeeYearAbsenceDays('worker',2026,leave):ctx.employeeYearAbsenceDays(leave,2026),0,'No annual or gift leave is consumed');
 assert.equal(state.employeeWorkLogs.length,0);assert.equal(state.employeeHourAdjustments.length,0,'No automatic overtime-bank posting');
 }
}
const ctx={require:id=>require(path.join(root,'api',id))};vm.createContext(ctx);vm.runInContext(fn('api/state.js','refreshWorkSummaries'),ctx);
for(const status of ['Zatraženo','Odbijeno','Odobreno']){const input={employees:[employee],employeeWorkLogs:[],employeeReports:[],employeeAbsences:[{employeeId:'worker',type,status,startDate:date,endDate:date}],notifications:[{key:'employee-hours-shortage-worker-'+date}]};assert.equal(ctx.refreshWorkSummaries(input).notifications.length,status==='Odobreno'?0:1);}
console.log('PASS Zeitausgleich: exact type in all ten forms, approval-aware quotas/alerts, no annual/gift deduction or automatic overtime-bank posting');
