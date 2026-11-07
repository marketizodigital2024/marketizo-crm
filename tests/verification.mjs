import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import * as crypto from 'node:crypto';
import { Blob } from 'node:buffer';
class FormData {}
const root=new URL('../',import.meta.url);
const rows=new Map();let dbFails=false,crmCalls=0,aiResult;
const context=vm.createContext({console,Buffer,AbortSignal,URL,Blob,FormData,setTimeout,clearTimeout,process:{env:{SUPABASE_URL:'https://db.example',SUPABASE_SERVICE_ROLE_KEY:'fixture',OPENAI_API_KEY:'fixture'}}});
context.fetch=async(url,opts={})=>{
 const u=new URL(url);if(u.host==='db.example'){
  if(dbFails)return {ok:false,status:503};const id=u.searchParams.get('id')?.slice(3);
  if(!opts.method)return {ok:true,json:async()=>rows.has(id)?[structuredClone(rows.get(id))]:[]};
  const data=JSON.parse(opts.body),key=data.id||id;rows.set(key,{...(rows.get(key)||{}),...data});return {ok:true,json:async()=>[rows.get(key)]};
 }
 if(u.host==='api.openai.com')return {ok:true,json:async()=>({status:'completed',output_text:JSON.stringify(aiResult||audit)})};
 if(u.host==='services.leadconnectorhq.com'){crmCalls++;return {ok:true};}throw Error('Unexpected external request in offline test');
};
const cryptoModule=new vm.SyntheticModule(['randomUUID','randomBytes','createHash','timingSafeEqual'],function(){for(const k of ['randomUUID','randomBytes','createHash','timingSafeEqual'])this.setExport(k,crypto[k]);},{context});
const engine=new vm.SourceTextModule(await fs.readFile(new URL('lib/audit-engine.js',root),'utf8'),{context});await engine.link(()=>cryptoModule);await engine.evaluate();
const report=new vm.SourceTextModule(await fs.readFile(new URL('api/report.js',root),'utf8'),{context});await report.link(()=>engine);await report.evaluate();
const e=engine.namespace;
const profiles=['instagram','facebook','tiktok'].map(platform=>({platform,username:'school',posts:Array.from({length:12},(_,i)=>({caption:platform+' '+i,url:'https://'+platform+'.com/x',image:''}))}));
const evidence=e.selectEvidence(profiles);assert.equal(evidence.length,12);assert.deepEqual(JSON.parse(JSON.stringify(evidence.slice(0,3).map(x=>x.platform))),['instagram','facebook','tiktok']);
const audit={headline:'Specific school finding',overallScore:72,previewCards:[0,1,2].map(postIndex=>({postIndex})),priorities:[0,1,2,3,4].map(postIndex=>({postIndex})),examples:[0,1,2].map(postIndex=>({postIndex})),networks:['instagram','facebook','tiktok'].map((platform,postIndex)=>({platform,postIndex}))};
e.verifyRefs(audit,evidence);assert.throws(()=>e.verifyRefs({...audit,networks:audit.networks.slice(0,2)},evidence));
assert.equal(e.publicResult(audit).priorities,undefined);assert.equal(e.publicResult(audit).examples,undefined);
const {id,token}=e.newIdentity();rows.set(id,{audit,evidence,lead:{accessHash:e.hash(token),version:2,unlocked:false}});
async function invoke(body){const res={code:0,body:null,setHeader(){},status(n){this.code=n;return this},json(v){this.body=v;return this}};await report.namespace.default({method:'POST',body},res);return res;}
assert.equal((await invoke({auditId:id,accessToken:'0'.repeat(48)})).code,404);
assert.equal((await invoke({auditId:id,accessToken:token})).code,400);
assert.equal((await invoke({auditId:id,accessToken:token,lead:{name:'X'}})).code,400);
const lead={name:'Marketizo QA One',email:'qa-one@example.com',phone:'+436600000001',business:'Online škola srpskog jezika',consent:true};
dbFails=true;assert.equal((await invoke({auditId:id,accessToken:token,lead})).code,503);assert.equal(rows.get(id).lead.unlocked,false);dbFails=false;
const unlocked=await invoke({auditId:id,accessToken:token,lead});assert.equal(unlocked.code,200);assert.equal(unlocked.body.audit.priorities.length,5);assert.equal(rows.get(id).lead.business,lead.business);assert.equal(rows.get(id).lead.crmStatus,'test');assert.equal(crmCalls,0);assert.equal(unlocked.body.lead.email,undefined);
const reopened=await invoke({auditId:id,accessToken:token});assert.equal(reopened.code,200);assert.equal(reopened.body.unlocked,true);
const analyzer=new vm.SourceTextModule(await fs.readFile(new URL('api/analyze-content.js',root),'utf8'),{context});await analyzer.link(()=>engine);await analyzer.evaluate();
let stream='';const response={setHeader(){},flushHeaders(){},write(s){stream+=s},end(){},status(n){this.code=n;return this},json(v){this.body=v;return this}};await analyzer.namespace.default({method:'POST',headers:{accept:'application/x-ndjson'},body:{profiles}},response);const events=stream.trim().split('\n').map(s=>JSON.parse(s));assert.equal(events.at(-1).event,'result');assert.equal(events.at(-1).data.audit.priorities,undefined);assert.ok(events.filter(e=>e.event==='status').length>=3);assert.ok(rows.has(events.at(-1).data.auditId));
console.log('PASS: balanced 1/2/3-network sampling; evidence references; preview gate; invalid token; contact validation; failed save stays locked; persisted contact; QA isolation; reopening; no contact disclosure.');

const practical={rewrites:[0,1,2].map(postIndex=>({title:'Specific rewrite '+postIndex,context:'School post',text:'Ready wording',postIndex})),answers:[0,1,2].map(postIndex=>({question:'Specific question '+postIndex,answer:'Evidence based answer',postIndex}))};
const contentIdeas=Object.fromEntries([['reels',12],['stories',12],['posts',1],['carousels',1]].map(([key,count])=>[key,Array.from({length:count},()=>({title:'School topic',execution:'Concrete step',reason:'Specific evidence',postIndex:0}))]));
aiResult={practical,contentIdeas};const withExtras=await invoke({auditId:id,accessToken:token,generatePlan:true});assert.equal(withExtras.code,200);assert.equal(withExtras.body.audit.practical.rewrites.length,3);assert.equal(withExtras.body.audit.practical.answers.length,3);assert.equal(Object.values(withExtras.body.audit.contentIdeas).flat().length,26);assert.ok(rows.get(id).audit.practical);assert.equal(e.publicResult(withExtras.body.audit).practical,undefined);
rows.get(id).audit.practical=undefined;aiResult={practical};const enrichedOld=await invoke({auditId:id,accessToken:token,generatePlan:true});assert.equal(enrichedOld.body.audit.practical.answers.length,3);assert.equal(Object.values(enrichedOld.body.audit.contentIdeas).flat().length,26);console.log('PASS: 6 extra texts persist behind contact gate; existing reports enriched without losing 26 ideas.');
