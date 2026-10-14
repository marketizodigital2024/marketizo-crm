const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..'),config=require('../vercel.json');
const headers=Object.fromEntries(config.headers[0].headers.map(x=>[x.key,x.value]));
assert.equal(headers['X-Content-Type-Options'],'nosniff');assert.equal(headers['X-Frame-Options'],'SAMEORIGIN');
const csp=headers['Content-Security-Policy'];assert.ok(csp.includes("object-src 'none'"));assert.ok(!csp.match(/script-src[^;]*unsafe-/));
let checked=0;for(const name of fs.readdirSync(root).filter(x=>x.endsWith('.html'))){const html=fs.readFileSync(path.join(root,name),'utf8');assert.ok(!/\son(?:click|load|error|submit|change)\s*=/i.test(html),name+' contains inline event handler');for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){if(/\bsrc\s*=/.test(match[1])||!match[2].trim())continue;assert.ok(csp.includes("'sha256-"+crypto.createHash('sha256').update(match[2]).digest('base64')+"'"),name+' script hash missing');checked++;}}
console.log('PASS: security headers and '+checked+' exact inline-script hashes; script policy excludes unsafe-inline/eval');
