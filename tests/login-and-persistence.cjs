const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const read=p=>fs.readFileSync(__dirname+'/../'+p,'utf8');
const reply=(status,body)=>({ok:status<300,status,json:async()=>body,text:async()=>JSON.stringify(body)});
async function call(handler,body){let result;const res={setHeader(){},end(s){result={status:this.statusCode,body:JSON.parse(s)}}};await handler({method:'POST',body,headers:{'x-forwarded-for':'192.0.2.1'}},res);return result;}
(async()=>{
  let slowReads=0,mode='ok';const employee={id:'emp-ivana',email:'owner@example.test',password:'fixture',status:'Aktivan'};
  const env={SUPABASE_URL:'https://fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:'fixture',EMPLOYEE_SESSION_SECRET:'fixture'};
  const context={module:{exports:{}},require,process:{env},Buffer,Date,console,fetch:async(input)=>{const url=new URL(input);assert.equal(url.hostname,'fixture.invalid');if(url.pathname.endsWith('marketizo_allow_login_attempt'))return reply(200,true);if(!url.pathname.endsWith('agency_crm_employee_auth')){slowReads++;return reply(200,[{employees:[employee]}]);}return mode==='missing'?reply(404,[]):mode==='failure'?reply(500,[]):reply(200,[{employee_data:employee}]);}};
  vm.createContext(context);vm.runInContext(read('api/employee-auth.js'),context);
  assert.equal((await call(context.module.exports,{action:'adminLogin',email:employee.email,password:'fixture'})).status,200);
  assert.equal((await call(context.module.exports,{action:'login',email:employee.email,password:'wrong'})).status,401);assert.equal(slowReads,0);
  mode='failure';assert.equal((await call(context.module.exports,{action:'login',email:employee.email,password:'fixture'})).status,500);assert.equal(slowReads,0);
  mode='missing';assert.equal((await call(context.module.exports,{action:'login',email:employee.email,password:'fixture'})).status,200);assert.equal(slowReads,1);

  let submitHandler;const button={disabled:false,textContent:'Uloguj se'},error={hidden:true},form={addEventListener(type,handler){if(type==='submit')submitHandler=handler},querySelector:()=>button};
  const storage=new Map([['marketizoAdminSession','{invalid']]);const browser={localStorage:{getItem:key=>storage.get(key)||null,removeItem:key=>storage.delete(key),setItem:(key,value)=>storage.set(key,value)},document:{getElementById:id=>id==='adminLoginForm'?form:id==='adminLoginError'?error:null,querySelectorAll:()=>[]},window:{location:{protocol:'https:',replace(){}},setTimeout:fn=>setTimeout(fn,10),clearTimeout},FormData:class{get(key){return key==='email'?'owner@example.test':'fixture'}},AbortController,fetch:async(input,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true})),console};
  vm.createContext(browser);vm.runInContext(read('admin-auth.js'),browser);await submitHandler({preventDefault(){},currentTarget:form});assert.equal(button.disabled,false);assert.equal(button.textContent,'Uloguj se');assert.match(error.textContent,/traje predugo/);assert.equal(storage.has('marketizoAdminSession'),false);

  const h=require('./crm-regression.cjs');h.reset();let current=h.getCurrent();current.payload.employeeWorkLogs=[{id:'preserve-1',employeeId:'emp-a',minutes:60},{id:'preserve-2',employeeId:'emp-a',minutes:90}];const encoded=Buffer.from(JSON.stringify({employeeId:'emp-miljan',role:'full-admin',exp:Date.now()+3600000})).toString('base64url');const token=encoded+'.'+crypto.createHmac('sha256','local-fixture').update(encoded).digest('base64url');
  async function put(payload,deletedIds){let out;const res={setHeader(){},end(s){out={status:this.statusCode,body:JSON.parse(s)}}};await h.state({method:'PUT',body:{payload,deletedIds,baseUpdatedAt:h.getCurrent().updated_at},headers:{authorization:'Bearer '+token}},res);return out;}
  let desired=structuredClone(current.payload);desired.employeeWorkLogs[0]={...desired.employeeWorkLogs[0],id:'replacement'};assert.equal((await put(desired)).status,409);assert.equal(h.getCurrent().payload.employeeWorkLogs[0].id,'preserve-1');
  desired=structuredClone(current.payload);desired.employeeWorkLogs=desired.employeeWorkLogs.filter(x=>x.id!=='preserve-1');assert.equal((await put(desired,{employeeWorkLogs:['preserve-1']})).status,200);assert.equal(h.getCurrent().payload.employeeWorkLogs.length,1);

  const database=require('../lib/database-request.js');const keepAlive=setTimeout(()=>{},1000);
  const hanging=(url,options)=>new Promise((resolve,reject)=>{if(options.signal.aborted)reject(options.signal.reason);else options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true});});
  await assert.rejects(database.request(hanging,'https://fixture.invalid',{},10),/na vreme/);
  await assert.rejects(database.withRequestBudget(()=>database.request(hanging,'https://fixture.invalid',{},100),10),/na vreme/);clearTimeout(keepAlive);
  const loginClient={id:'stable-client',name:'Client',status:'Aktivan',loginEmail:'old-login@marketizo.local',loginPassword:require('../lib/password.js').hashPassword('fixture-password'),email:'before@example.test'};
  const clientContext={module:{exports:{}},require,process:{env},Buffer,Date,console,fetch:async(input)=>String(input).includes('marketizo_allow_login_attempt')?reply(200,true):reply(200,[{clients:[loginClient]}])};vm.createContext(clientContext);vm.runInContext(read('api/client-auth.js'),clientContext);
  const oldLogin=await call(clientContext.module.exports,{action:'login',email:loginClient.loginEmail,password:'fixture-password'});assert.equal(oldLogin.status,200);loginClient.email='billing@example.test';
  assert.equal((await call(clientContext.module.exports,{action:'login',email:loginClient.loginEmail,password:'fixture-password'})).status,200);assert.equal((await call(clientContext.module.exports,{action:'validate',token:oldLogin.body.token})).status,200);assert.equal((await call(clientContext.module.exports,{action:'login',email:loginClient.email,password:'fixture-password'})).status,401);
  console.log('PASS contact-email update preserves the existing login identifier, password and active client session; billing mailbox gains no login access');
  console.log('PASS: fast-table admin/worker login avoids full-state fallback; missing-table compatibility; invalid local session and stalled login recover; same-count ID loss blocked; intentional deletion allowed; database call and invocation deadlines.');
})().catch(error=>{console.error(error);process.exitCode=1});
