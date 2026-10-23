'use strict';
const { SignError, validateDraft } = require('./sign-content.js');
const { hash } = require('./sign-workflow.js');
const PREFIX = 'marketizo-codeks:v1|';
const TEMPLATE_ID = 'fc54bb17-2c0d-4d54-9490-5ae633a2c542';
const TEMPLATE_NOTE = PREFIX + 'template';
const DEFAULT_TEXT = `Kodeks važi za rukovodioce, zaposlene i spoljne saradnike u poslovnoj komunikaciji, na sastancima, snimanjima, događajima i u radu sa klijentima.

1. Profesionalno ponašanje i poštovanje
Prema kolegama, rukovodiocima, saradnicima i klijentima postupamo pristojno i smireno. Vređanje, ponižavanje, pretnje, vikanje i agresivno ponašanje nisu prihvatljivi.

2. Politička i verska neutralnost
Svako ima pravo na svoja politička i verska uverenja. U poslovnom okruženju nisu prihvatljivi političko ili versko agitovanje, nametanje uverenja, pritisak na druge da ih prihvate i omalovažavanje tuđih uverenja. Ime Marketiza i službeni kanali ne koriste se za takve aktivnosti. Lična verska pripadnost i njeno nenametljivo izražavanje poštuju se.

3. Privatnost i lične granice
Ne ispitujemo niti komentarišemo tuđi intimni život ili seksualnu orijentaciju. Ne dozvoljavamo seksualne aluzije, neželjeno udvaranje, neželjene dodire i deljenje seksualno eksplicitnog sadržaja. Pravila jednako važe za sve, bez obzira na seksualnu orijentaciju.

4. Bez diskriminacije i uznemiravanja
Nikoga ne omalovažavamo, isključujemo ili tretiramo nepovoljnije zbog pola, godina, porekla, vere, zdravstvenog stanja, seksualne orijentacije ili drugih ličnih svojstava. Poštujemo dostojanstvo i granice svakog člana tima.

5. Konstruktivno rešavanje neslaganja
Razgovaramo o činjenicama, konkretnom ponašanju i rešenju. Ne širimo glasine, ne napadamo ličnost i ne ponižavamo kolege pred timom ili klijentom. Ako razgovor ne rešava problem, uključujemo rukovodioca.

6. Odgovornost prema timu
Poštujemo dogovore, dolazimo pripremljeni i na vreme. Na poslovne poruke odgovaramo u okviru dogovorene dostupnosti. Kašnjenje, sprečenost ili grešku prijavljujemo čim ih uočimo i učestvujemo u rešavanju problema. Delimo potrebne informacije i ne ometamo rad kolega.

7. Profesionalno predstavljanje pred klijentima
Ljubazni smo, strpljivi i uredni, sa odećom primerenom sastanku ili snimanju. Interne sukobe ne iznosimo pred klijenta. Ne obećavamo rezultate, popuste ili rokove za koje nemamo ovlašćenje.

8. Čuvanje privatnih i poverljivih informacija
Privatne podatke, prepiske, fotografije i snimke kolega i klijenata ne prosleđujemo i ne objavljujemo bez odgovarajućeg odobrenja. Poslovne informacije koristimo samo u okviru svojih zadataka i ovlašćenja.

9. Primer rukovodilaca i prijavljivanje problema
Ista pravila važe za sve. Rukovodioci daju jasna uputstva i povratne informacije bez vređanja i zastrašivanja. Neprimereno ponašanje prijavljuje se neposrednom rukovodiocu, a ako se prijava odnosi na njega, direktno Miljanu ili Ivani. Prijave se razmatraju diskretno i nepristrasno, bez odmazde prema osobi koja ih podnese u dobroj veri.

10. Primena kodeksa
Svaki član tima treba da pročita kodeks i primenjuje ga u svakodnevnom radu. Kršenja se razmatraju na osnovu utvrđenih činjenica, uz priliku uključenim osobama da se izjasne. Dalje postupanje zavisi od težine i ponavljanja ponašanja, u skladu sa primenjivim pravilima i ugovorom.`;
function stableId(value) { const h = hash('marketizo-codeks:' + value); return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`; }
function metadata(doc) {
 const note = doc?.data?.note || '';
 if (!note.startsWith(PREFIX) || note === TEMPLATE_NOTE) return null;
 const parts = note.slice(PREFIX.length).split('|');
 if (parts.length !== 3 || !/^[a-f0-9-]{36}$/.test(parts[0]) || !/^[1-9]\d*$/.test(parts[1])) return null;
 try { return { templateId: parts[0], version: Number(parts[1]), employeeId: decodeURIComponent(parts[2]) }; } catch { return null; }
}
function content(text) {
 if (typeof text !== 'string' || !text.trim() || text.length > 60000) throw new SignError(400, 'Unesi tekst kodeksa (najviše 60.000 znakova).');
 return { version: 1, blocks: text.normalize('NFC').trim().split(/\n\s*\n/).flatMap(part => {
  const lines = part.trim().split('\n');
  return /^\d+\.\s/.test(lines[0]) && lines[0].length < 160 ? [{type:'heading',runs:[{text:lines.shift()}]},...(lines.length?[{type:'paragraph',runs:[{text:lines.join('\n')}]}]:[])] : [{type:'paragraph',runs:[{text:part}]}];
 }) };
}
function templateData(title, text) { return validateDraft({title,category:'other',content:content(text),recipients:[],note:TEMPLATE_NOTE}, 'template'); }
function documentData(template, employee) {
 const data = validateDraft({...template.data,title:template.title.slice(0,155) + ' · v' + template.revision,category:'other',recipientCompletion:true,
  recipients:[{name:employee.name,email:employee.email,role:'counterparty',partyType:'individual'}],contractDetails:{language:'sr',audience:'other'},
  note:PREFIX + template.id + '|' + template.revision + '|' + encodeURIComponent(employee.id)});
 // This is a policy acknowledgement, never an employee contract or a demand for civil identifiers.
 data.content.blocks.push({type:'paragraph',level:1,runs:[{text:'Potpisom potvrđujem da sam pročitao/la ovu verziju Kodeksa ponašanja Marketizo tima, da sam upoznat/a sa njenim pravilima i da ću ih primenjivati u okviru svog angažovanja.',bold:false,italic:false,underline:false}]});
 return data;
}
module.exports = { PREFIX,TEMPLATE_ID,TEMPLATE_NOTE,DEFAULT_TEXT,stableId,metadata,content,templateData,documentData };
