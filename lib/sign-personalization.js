'use strict';
const { SignError } = require('./sign-content.js');
const LIMITS = { name:160, company:180, address:300, taxId:80, registrationId:80, personalId:80, capacity:120, country:2 };
function validateFields(input) {
 if (!input || typeof input !== 'object' || Array.isArray(input)) throw new SignError(400,'Proveri podatke za ugovor.');
 const fields = {};
 for (const [key,value] of Object.entries(input)) {
  if (!Object.hasOwn(LIMITS,key) || typeof value !== 'string' || value.length > LIMITS[key] || /[\u0000-\u001f\u007f]/.test(value)) throw new SignError(400,'Proveri podatke za ugovor.');
  fields[key] = value.normalize('NFC').trim();
  if (key === 'country') { fields[key] = fields[key].toUpperCase(); if (fields[key] && !/^[A-Z]{2}$/.test(fields[key])) throw new SignError(400,'Zemlju unesi kao AT, DE, RS…'); }
 }
 return fields;
}
// Bind only the existing identity blanks. Prices, service clauses and signatures
// are never supplied by the recipient and never interpreted as executable markup.
function personalizeDocument(source) {
 const doc = structuredClone(source), parties = doc.recipients.filter(r=>r.role!=='marketizo');
 const person = parties[0] || {};
 let previous = '';
 for (const block of doc.content.blocks) {
  const original = block.runs.map(r=>r.text).join('');
  const value = original.split(/(\r?\n|\\n)/).map(line => {
  let value = line;
  const replacements = [
   [/^(Ime firme\s*\(Opciono\))\s*_+\s*$/i,'Firma: '+(person.company || '—')],
   [/^(?:Adresa|Anschrift|Adresse)\s*:\s*_+\s*$/i,(doc.contractDetails?.language==='de'?'Anschrift: ':'Adresa: ')+(person.address || '—')],
   [/^(?:PIB|Steuernummer)\s*:\s*_+\s*$/i,(doc.contractDetails?.language==='de'?'Steuernummer: ':'PIB: ')+(person.taxId || '—')],
   [/^Ime\s+i\s+prezime\s*:\s*_+\s*$/i,'Ime i prezime: '+(person.name || '—')],
   [/^Firmenbuchnummer\s*:\s*_+\s*$/i,'Firmenbuchnummer: '+(person.registrationId || '—')],
   [/^UID\s*:\s*_+\s*$/i,'UID: '+(person.taxId || '—')],
   [/^Inhaber\s*:\s*_+\s*$/i,'Vertreten durch: '+(person.name || '—')]
  ];
  for(const [pattern,replacement] of replacements) if(pattern.test(value)) value=replacement;
  if (/^_+\s*$/.test(value) && /^Kunde:\s*$/.test(previous)) value=person.company || person.name || '—';
  if (/Saradnika \(fizičko lice ili preduzetnik\)/.test(value)) {
   const identity=person.company ? person.company+' (zastupnik: '+person.name+')' : person.name;
   value=value.replace(/(Saradnika \(fizičko lice ili preduzetnik\)\s*)_+/,(_,prefix)=>prefix+identity)
    .replace(/(JMBG\s*)_+/,(_,prefix)=>prefix+(person.personalId || '—'))
    .replace(/(sa adresom\s*)_+/,(_,prefix)=>prefix+(person.address || '—'));
  }
  if(line.trim()) previous=line.trim();
  return value;
  }).join('');
  if (value!==original) block.runs=[{text:value,bold:false,italic:false,underline:false}];
 }
 return doc;
}
module.exports={LIMITS,validateFields,personalizeDocument};
