const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const m = require('../lib/questionnaire-model.js');
const defaults = require('../lib/questionnaire-templates.json');
process.env.SUPABASE_URL='https://db.test'; process.env.SUPABASE_SERVICE_ROLE_KEY='test-secret';process.env.EMPLOYEE_SESSION_SECRET='employee-test-secret';process.env.VERCEL_ENV='production';
const employees=[{id:'smm',position:'Social Media Manager',active:true},{id:'editor',position:'Editor',active:true},{id:'inactive',position:'Social Media Manager',active:false},{id:'emp-miljan',position:'Founder / Strategija'}];
const rows=new Map(); const calls=[];
function signed(id){const p=Buffer.from(JSON.stringify({employeeId:id,role:'employee',exp:Date.now()+60000})).toString('base64url');return 'Bearer '+p+'.'+crypto.createHmac('sha256',process.env.EMPLOYEE_SESSION_SECRET).update(p).digest('base64url')}
global.fetch=async(url,opts={})=>{const u=new URL(url);calls.push({u,opts});if(u.pathname.endsWith('/agency_crm_state')){assert.equal(opts.method,undefined);return {ok:true,status:200,json:async()=>[{employees,clients:[{id:'client-1',name:'Client One',status:'Aktivan'}]}]}}assert(u.pathname.endsWith('/marketizo_questionnaires'));const id=u.searchParams.get('id')?.startsWith('eq.')?u.searchParams.get('id').slice(3):null;const namespace=u.searchParams.get('namespace')?.replace(/^eq\./,'');const k=namespace+':'+id;if(!opts.method){return {ok:true,status:200,json:async()=>structuredClone(id?[rows.get(k)].filter(Boolean):[...rows.values()].filter(r=>r.namespace===namespace&& !r.id.startsWith('template:')))}}const b=JSON.parse(opts.body);if(opts.method==='POST'){const key=b.namespace+':'+b.id;if(rows.has(key))return {ok:true,status:200,json:async()=>[]};rows.set(key,b);return {ok:true,status:201,json:async()=>[structuredClone(b)]}}assert.equal(opts.method,'PATCH');const row=rows.get(k);if(!row||row.updated_at!==u.searchParams.get('updated_at')?.replace(/^eq\./,''))return {ok:true,status:200,json:async()=>[]};rows.set(k,{...row,...b});return {ok:true,status:200,json:async()=>[structuredClone(rows.get(k))]}};
const api=require('../api/questionnaires.js');
async function call(body,id){let status,reply;await api({method:'POST',body,headers:{authorization:id?signed(id):''}},{setHeader(){},status(n){status=n;return this},json(v){reply=v}});return {status,reply}}
(async()=>{
 assert.equal(Object.keys(defaults).length,4);for(const l of ['sr','de']){assert.equal(defaults['business-'+l].questions.length,15);assert.equal(defaults['accounts-'+l].questions.length,24)}
 assert(m.canManage(employees[0]));assert(!m.canManage(employees[1]));assert(!m.canManage(employees[2]));assert(m.canManage(employees[3]));
 assert.equal((await call({action:'list'})).status,401);assert.equal((await call({action:'list'},'editor')).status,403);assert.equal((await call({action:'list'},'inactive')).status,403);
 const id=crypto.randomUUID();const create={action:'create',requestId:id,key:'business-sr',clientId:'client-1'};assert.equal((await call(create,'smm')).status,200);assert.equal((await call(create,'smm')).status,200);assert.equal(rows.size,1);
 const readonly=m.answerToken(id,process.env.EMPLOYEE_SESSION_SECRET);
 assert.notEqual(readonly,m.publicToken(id,process.env.EMPLOYEE_SESSION_SECRET));
 assert.equal((await call({action:'viewAnswers',id,token:readonly})).status,404);
 const token=m.publicToken(id,process.env.EMPLOYEE_SESSION_SECRET);let pub=await call({action:'public',id,token});assert.equal(pub.status,200);assert.equal(pub.reply.questions.length,15);assert.equal((await call({action:'public',id,token:'0'.repeat(64)})).status,404);
 assert.equal((await call({action:'answers',id},'inactive')).status,403);
 const draft={action:'draft',id,token,revision:pub.reply.revision,answers:{0:'first'}};assert.equal((await call(draft)).status,200);assert.equal((await call(draft)).status,409);
 pub=await call({action:'public',id,token});assert.equal(pub.reply.status,'U toku');assert.equal(pub.reply.answers[0],'first');
 assert.equal((await call({action:'submit',id,token,revision:pub.reply.revision,answers:{0:'only one'}})).status,400);
 const answers=Object.fromEntries(pub.reply.questions.map((q,i)=>[i,'Answer '+i]));assert.equal((await call({action:'submit',id,token,revision:pub.reply.revision,answers})).status,200);
 assert.equal((await call({action:'submit',id,token,revision:pub.reply.revision,answers})).status,200);
 assert.equal((await call({action:'public',id,token})).reply.status,'Popunjen');assert.deepEqual((await call({action:'public',id,token})).reply.answers,{});
 assert.equal((await call({action:'answers',id},'editor')).reply.answers[0],'Answer 0');
 const shared=await call({action:'viewAnswers',id,token:readonly});assert.equal(shared.status,200);assert.equal(shared.reply.answers[0],'Answer 0');assert.equal(shared.reply.createdBy,undefined);
 assert.equal((await call({action:'viewAnswers',id,token})).status,404);
 assert.equal((await call({action:'public',id,token:readonly})).status,404);
 assert.equal((await call({action:'viewAnswers',id,token:'0'.repeat(64)})).status,404);
 assert.equal((await call({action:'answers',id})).status,401);
 const beforeShared=JSON.stringify(rows.get('production:'+id));await call({action:'viewAnswers',id,token:readonly,answers:{0:'overwrite'}});assert.equal(JSON.stringify(rows.get('production:'+id)),beforeShared);
 const list=await call({action:'list'},'smm');assert.equal(list.reply.records[0].answerToken,readonly);assert.equal(list.reply.records.length,1);assert.equal(list.reply.templates['business-sr'].version,1);
 assert.equal((await call({action:'template',key:'business-sr',questions:['New question'],revision:null},'smm')).status,200);assert.equal((await call({action:'template',key:'business-sr',questions:['Stale question'],revision:null},'smm')).status,409);
 const list2=await call({action:'list'},'smm');assert.equal(list2.reply.templates['business-sr'].questions.length,1);assert.equal(list2.reply.templates['business-de'].questions.length,15);assert.equal((await call({action:'answers',id},'editor')).reply.questions.length,15);
 assert.equal((await call({action:'revoke',id},'editor')).status,403);assert.equal((await call({action:'revoke',id},'smm')).status,200);assert.equal((await call({action:'public',id,token})).status,404);assert.equal((await call({action:'answers',id},'editor')).status,200);
 assert.equal((await call({action:'viewAnswers',id,token:readonly})).status,404);
 process.env.VERCEL_ENV='preview';assert.equal((await call({action:'viewAnswers',id,token:readonly})).status,404);assert.equal((await call({action:'public',id,token})).status,404);process.env.VERCEL_ENV='production';
 assert(calls.filter(c=>c.opts.method).every(c=>c.u.pathname.endsWith('/marketizo_questionnaires')));
 const portal=fs.readFileSync(require('node:path').join(__dirname,'../employee-login.html'),'utf8');assert(portal.includes('questionnaire-nav.js'));assert(!fs.readFileSync(require('node:path').join(__dirname,'../questionnaire-nav.js'),'utf8').includes('saveState'));
 const front=fs.readFileSync(require('node:path').join(__dirname,'../questionnaires.js'),'utf8');assert(front.includes("api(token?'viewAnswers':'answers'"));assert(front.includes("['public','draft','submit','viewAnswers']"));
 console.log('PASS: authenticated SMM management, active-team read access, public token validation, draft conflict handling, complete submission, retry safety, independent templates, immutable invite snapshots, revocation, preview isolation, no employee-state writes.');
})().catch(e=>{console.error(e);process.exitCode=1});
