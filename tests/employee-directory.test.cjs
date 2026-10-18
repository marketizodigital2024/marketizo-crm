const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { authorize, project, AUDIENCE, SERVICE } = require('../api/employee-directory.js').helpers;
const {publicKey, privateKey} = crypto.generateKeyPairSync('rsa', {modulusLength:2048});
const jwk = {...publicKey.export({format:'jwk'}),kid:'test',alg:'RS256',use:'sig'};
const now = Date.now();
const base = {iss:'https://accounts.google.com',aud:AUDIENCE,email:SERVICE,email_verified:true,sub:'101722915310559318926',iat:Math.floor(now/1000),exp:Math.floor(now/1000)+3600};
function token(claim=base){const h=Buffer.from(JSON.stringify({alg:'RS256',kid:'test'})).toString('base64url'),p=Buffer.from(JSON.stringify(claim)).toString('base64url');return 'Bearer '+h+'.'+p+'.'+crypto.sign('RSA-SHA256',Buffer.from(h+'.'+p),privateKey).toString('base64url')}
const fetcher=async()=>({ok:true,json:async()=>({keys:[jwk]})});
(async()=>{
 assert.equal(await authorize(token(),fetcher,now),true);
 for(const change of [{aud:'https://evil.test'},{sub:'101722915310559318927'},{email:'other@example.com'},{email_verified:false},{exp:now/1000-1},{iat:now/1000+100}]) assert.equal(await authorize(token({...base,...change}),fetcher,now),false);
 assert.equal(await authorize(token().slice(0,-10)+'invalid',fetcher,now),false);
 assert.equal(await authorize('',fetcher,now),false);
 const data=project({payload:{employees:[{id:'one',name:'Person',email:'a@work.com',salary:100,password:'SECRET',position:'Editor',active:true},{id:'two',status:'Neaktivan'}],assignments:[{clientId:'c',roles:[{employeeId:'one',role:'Editor',salary:999}]}],employeeAbsences:[{medical:'PRIVATE'}]},updatedAt:'today'});
 assert.equal(data.employees.length,2);assert.equal(data.employees[1].active,false);
 const rendered=JSON.stringify(data); for(const bad of ['salary','password','SECRET','medical','PRIVATE','Absences'])assert.ok(!rendered.includes(bad));
 assert.throws(()=>project({payload:{}}));assert.throws(()=>project({payload:{employees:[{id:'x'},{id:'x'}]}}));
 console.log('directory auth, signature, identity, expiry, projection and privacy checks passed');
})();
