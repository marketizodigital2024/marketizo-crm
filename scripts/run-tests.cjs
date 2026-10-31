'use strict';
// Fixture tests must not inherit the deployment identity. Individual environment
// isolation tests explicitly supply preview/production to the actual handlers.
const {spawnSync}=require('node:child_process');
const commands=require('../package.json').scripts['test:fixtures'].split('&&').map(s=>s.trim());
for(const command of commands){
 const match=/^node (tests\/[\w.-]+\.(?:cjs|mjs))$/.exec(command);
 if(!match)throw Error('Unsupported fixture command: '+command);
 const result=spawnSync(process.execPath,[match[1]],{cwd:require('node:path').join(__dirname,'..'),stdio:'inherit',env:{...process.env,VERCEL_ENV:'test'}});
 if(result.error)throw result.error;
 if(result.status!==0){process.exitCode=result.status||1;break;}
}
