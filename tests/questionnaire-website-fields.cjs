const assert=require('node:assert/strict');
const {fields,encode,decode}=require('../questionnaire-website-fields.js');
const qs=require('../lib/questionnaire-templates.json')['website-sr'].questions;
assert.equal(qs.length,57);assert(qs.every(q=>fields[q]?.example));
for(const q of qs){const f=fields[q];if(f.type==='text')continue;assert(f.options.length>1);const selected=f.type==='single'?[f.options[0]]:f.options.slice(0,2);const detail='Dopuna — čćžšđ / Ћирилица\nhttps://example.com/?a=1&b=2';assert.deepEqual(decode(encode(selected,detail),f.options),{selected,detail});assert.deepEqual(decode('Stari slobodan odgovor',f.options),{selected:[],detail:'Stari slobodan odgovor'});}
assert(!fields[qs[0]].links);assert(fields[qs[5]].links);
console.log('PASS: 57 examples, single/multiple choice round-trip, legacy text preservation, Unicode and links.');
