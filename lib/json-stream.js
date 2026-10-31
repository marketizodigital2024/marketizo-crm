'use strict';
// Same JSON bytes as JSON.stringify (or its historical sorted-key variant),
// without cloning/stringifying the entire backup at once.
function* tokens(value,canonical=false,key=''){
 if(!canonical&&value&&typeof value.toJSON==='function')value=value.toJSON(key);
 if(value===null){yield 'null';return;}
 if(typeof value!=='object'){const encoded=JSON.stringify(value);if(encoded!==undefined)yield encoded;return;}
 if(Array.isArray(value)){yield '[';for(let i=0;i<value.length;i++){if(i)yield ',';const item=value[i];if(item===undefined||typeof item==='function'||typeof item==='symbol')yield 'null';else yield* tokens(item,canonical,String(i));}yield ']';return;}
 let keys=Object.keys(value);if(canonical)keys=Object.keys(Object.fromEntries(keys.sort().map(k=>[k,0])));
 yield '{';let first=true;for(const k of keys){const item=value[k];if(item===undefined||typeof item==='function'||typeof item==='symbol')continue;if(!first)yield ',';first=false;yield JSON.stringify(k);yield ':';yield* tokens(item,canonical,k);}yield '}';
}
function* chunks(value,canonical=false){let parts=[],length=0;for(const token of tokens(value,canonical)){const bytes=Buffer.from(token);for(let offset=0;offset<bytes.length;){const n=Math.min(65536-length,bytes.length-offset);parts.push(bytes.subarray(offset,offset+n));length+=n;offset+=n;if(length===65536){yield Buffer.concat(parts,length);parts=[];length=0;}}}if(length)yield Buffer.concat(parts,length);}
function digest(value,canonical=false){const h=require('node:crypto').createHash('sha256');let size=0;for(const bytes of chunks(value,canonical)){h.update(bytes);size+=bytes.length;}return{sha256:h.digest('hex'),size};}
function equal(a,b){const x=chunks(a,true),y=chunks(b,true);while(true){const left=x.next(),right=y.next();if(left.done||right.done)return left.done===right.done;if(!left.value.equals(right.value))return false;}}
async function readDigest(stream){const h=require('node:crypto').createHash('sha256');let size=0;for await(const bytes of stream){h.update(bytes);size+=bytes.length;}return{sha256:h.digest('hex'),size};}
module.exports={chunks,digest,equal,readDigest};
