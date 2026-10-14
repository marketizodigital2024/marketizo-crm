const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const handlers={},saved=[];let mode='redirect';
const redirect={ok:false,status:0,type:'opaqueredirect'};
const ctx={URL,Response,self:{location:{origin:'https://fixture.test'},addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting(){},clients:{claim(){}}},fetch:async()=>mode==='redirect'?redirect:{ok:false,status:404,type:'basic'},caches:{open:async()=>({put:(...args)=>saved.push(args)}),match:async()=>null}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../sw.js','utf8'),ctx);
async function request(modeType,path){let pending;handlers.fetch({request:{method:'GET',url:'https://fixture.test/'+path,mode:modeType,destination:modeType==='navigate'?'document':'script'},respondWith:p=>pending=p});return pending;}
(async()=>{assert.equal(await request('navigate','employees-hours.html'),redirect);assert.equal(saved.length,0);mode='404';assert.equal((await request('no-cors','missing.js')).type,'error');assert.equal(saved.length,0);console.log('PASS: clean URL opaque redirects reach browser; missing scripts never receive index HTML');})().catch(e=>{console.error(e);process.exitCode=1});
