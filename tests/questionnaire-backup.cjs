const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const q=require('../lib/questionnaire-backup.js');
const at='2026-10-20T10:00:00Z';
const snapshot={format:'marketizo-questionnaires-v1',namespace:'production',rows:[{id:'invite-test',payload:{recordType:'invite',status:'Popunjen',answers:{0:'fixture'}},updated_at:at},{id:'template:business-sr',payload:{questions:['Pitanje'],version:2},updated_at:at}],defaultTemplates:{'business-sr':{questions:['Default']},'accounts-de':{questions:['Frage']}}};
assert(q.validSnapshot(snapshot));assert.equal(q.summary(snapshot).templates,2);assert.equal(q.summary(snapshot).completed,1);assert.equal(q.summary(null).included,false);
assert(!q.validSnapshot({...snapshot,rows:[snapshot.rows[0],snapshot.rows[0]]}));assert(!q.validSnapshot({...snapshot,namespace:'preview'}));
const production={format:'marketizo-work-production-v1',rules:[],outputs:[]};
let saved,document,writes=[],corrupt=false;
const state={employees:[{id:'fixture'}],clients:[],employeeWorkLogs:[]};
const blob={async put(path,body){saved=JSON.parse(body);document=structuredClone(saved);if(corrupt)document.questionnaires.rows[0].payload.answers[0]='corrupt';return {pathname:path}},async get(){return {statusCode:200,stream:new Response(JSON.stringify(document)).body}},async list(){return {blobs:[]}},async del(){throw Error('unexpected delete')}};
const auth={helpers:{readStoredState:async()=>({payload:state,updatedAt:at}),accessSession:req=>req.headers.authorization==='Bearer owner'?{role:'full-admin'}:null}};
async function mockFetch(url,opts={}){if(url.includes('/rpc/marketizo_work_production_snapshot'))return new Response(JSON.stringify({payload:state,updated_at:at,production}));if(url.includes('/rpc/marketizo_questionnaire_snapshot'))return new Response(JSON.stringify(snapshot));if(opts.method==='POST'){writes.push(JSON.parse(opts.body));return new Response(null,{status:204})}return new Response(JSON.stringify([{payload:url.includes('marketizo-kpi-v1')?{kpi:1}:state,updated_at:at}]))}
function context(source,blobReplace){const ctx={module:{exports:{}},process:{env:{SUPABASE_URL:'https://fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:'fixture',BLOB_READ_WRITE_TOKEN:'fixture',CRON_SECRET:'cron',VERCEL_ENV:'production'}},require:id=>id.includes('questionnaire-backup')?{...q,readSnapshot:async()=>structuredClone(snapshot)}:id==='./state.js'?auth:require(id),Response,Buffer,Date,Intl,fetch:mockFetch,blob,fixtureBlob:blob};vm.createContext(ctx);vm.runInContext(blobReplace(source),ctx);return ctx}
const source=fs.readFileSync(__dirname+'/../api/backup.js','utf8');const a=source.indexOf('async function blobClient()'),b=source.indexOf('\nasync function listBlobBackups',a);
const ctx=context(source,s=>s.slice(0,a)+'async function blobClient(){return blob;}'+s.slice(b));
async function call(ctx,req){let r;await ctx.module.exports(req,{setHeader(){},end(s){r={status:this.statusCode,body:JSON.parse(s)}}});return r}
(async()=>{
 let r=await call(ctx,{method:'POST',headers:{authorization:'Bearer owner'}});assert.equal(r.status,200);assert.equal(r.body.questionnaires.completed,1);assert.equal(saved.questionnaires.rows[0].payload.answers[0],'fixture');assert.deepEqual(writes[0].payload.questionnaires,snapshot);
 corrupt=true;r=await call(ctx,{method:'POST',headers:{authorization:'Bearer owner'}});assert.equal(r.status,500);assert.equal(writes.length,1);corrupt=false;
 r=await call(ctx,{method:'POST',headers:{authorization:'Bearer worker'}});assert.equal(r.status,401);
 let restoreSource=fs.readFileSync(__dirname+'/../api/restore-backup.js','utf8');const restore=context(restoreSource,s=>s.replace('await import("@vercel/blob")','fixtureBlob'));
 document=saved;r=await call(restore,{method:'POST',headers:{authorization:'Bearer owner'},body:{pathname:'marketizo-crm/daily/2026-10-20.json'}});assert.equal(r.status,200);assert.equal(r.body.dryRun,true);assert.equal(writes.length,1);
 r=await call(restore,{method:'POST',headers:{authorization:'Bearer owner'},body:{pathname:'marketizo-crm/daily/2026-10-20.json',confirm:'RESTORE_MARKETIZO_BACKUP'}});assert.equal(r.status,401);assert.equal(writes.length,1);
 document={...saved};delete document.questionnaires;delete document.integrity;delete document.workProductionRequired;r=await call(restore,{method:'POST',headers:{authorization:'Bearer owner'},body:{pathname:'marketizo-crm/daily/2026-10-20.json'}});assert.equal(r.status,200);assert.equal(r.body.questionnaires.included,false);
 console.log('PASS: both backup copies include questionnaires, corrupt readback fails, owner-only manual backup, dry-run never writes, owner cannot trigger live restore, legacy backup compatibility.');
})().catch(e=>{console.error(e);process.exitCode=1});
