'use strict';
// Fixture tests must not inherit the deployment identity. Individual environment
// isolation tests explicitly supply preview/production to the actual handlers.
const {spawnSync}=require('node:child_process');
const systemKeys=new Set(['PATH','Path','HOME','USERPROFILE','TMPDIR','TMP','TEMP','SystemRoot','WINDIR','COMSPEC','PATHEXT','APPDATA','LOCALAPPDATA','LANG','LC_ALL','TZ','CI','PYTHONPATH','VIRTUAL_ENV','NODE_PATH','NODE_EXTRA_CA_CERTS','SSL_CERT_FILE','SSL_CERT_DIR']);
const fixtureEnv=Object.fromEntries(Object.entries(process.env).filter(([key])=>systemKeys.has(key)));fixtureEnv.VERCEL_ENV='test';
const commands=require('../package.json').scripts['test:fixtures'].split('&&').map(s=>s.trim());
for(const command of commands){
 const match=/^node (tests\/[\w.-]+\.(?:cjs|mjs))$/.exec(command);
 if(!match)throw Error('Unsupported fixture command: '+command);
 const result=spawnSync(process.execPath,[match[1]],{cwd:require('node:path').join(__dirname,'..'),stdio:'inherit',env:fixtureEnv});
 if(result.error)throw result.error;
 if(result.status!==0){process.exitCode=result.status||1;break;}
}
