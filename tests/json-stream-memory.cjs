'use strict';
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
if(process.argv[2]==='child'){
 const stream=require('../lib/json-stream.js');
 const data={rows:Array(220000).fill({id:'fixture',text:'x'.repeat(1024)})};
 const expected=stream.digest(data);
 assert(expected.size>200*1024*1024);
 (async()=>{
  const actual=await stream.readDigest(require('node:stream').Readable.from(stream.chunks(data)));
  assert.deepEqual(actual,expected);
  console.log('PASS >200 MiB backup streamed and verified with a 96 MiB heap');
 })().catch(e=>{console.error(e);process.exitCode=1});
}else{
 const child=spawnSync(process.execPath,['--max-old-space-size=96',__filename,'child'],{encoding:'utf8',timeout:60000});
 assert.equal(child.status,0,child.stderr||child.error?.message);process.stdout.write(child.stdout);
}
