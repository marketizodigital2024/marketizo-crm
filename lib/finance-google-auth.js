'use strict';
const crypto=require('node:crypto');
let cache={keys:[],until:0};
const accounts=new Set(['office@marketizo.com','buchhaltung@marketizo.com']);
async function verifyGoogle(header,fetcher=fetch,now=Date.now()){
 try{
  const audiences=JSON.parse(process.env.FINANCE_GOOGLE_AUDIENCES||'[]');
  if(!Array.isArray(audiences)||!audiences.length||typeof header!=='string'||!header.startsWith('Bearer ')||header.length>12000)return null;
  const parts=header.slice(7).split('.');if(parts.length!==3||parts.some(p=>!/^[A-Za-z0-9_-]+$/.test(p)))return null;
  const h=JSON.parse(Buffer.from(parts[0],'base64url')),c=JSON.parse(Buffer.from(parts[1],'base64url')),s=now/1000;
  if(h.alg!=='RS256'||typeof h.kid!=='string'||!['accounts.google.com','https://accounts.google.com'].includes(c.iss)||!audiences.includes(c.aud)||!accounts.has(c.email)||c.email_verified!==true||!/^\d{15,30}$/.test(c.sub||'')||!Number.isFinite(c.exp)||!Number.isFinite(c.iat)||c.exp<=s||c.iat>s+30||c.iat<s-3700||c.exp-c.iat>3700)return null;
  if(cache.until<=now||!cache.keys.some(k=>k.kid===h.kid)){
   const r=await fetcher('https://www.googleapis.com/oauth2/v3/certs',{signal:AbortSignal.timeout(5000),redirect:'error'});if(!r.ok)return null;
   const d=await r.json();if(!Array.isArray(d.keys))return null;cache={keys:d.keys,until:now+300000};
  }
  const k=cache.keys.find(k=>k.kid===h.kid&&k.kty==='RSA'&&k.alg==='RS256'&&k.use==='sig');
  return k&&crypto.verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),crypto.createPublicKey({key:k,format:'jwk'}),Buffer.from(parts[2],'base64url'))?{email:c.email,sub:c.sub}:null;
 }catch{return null;}
}
module.exports={verifyGoogle};
