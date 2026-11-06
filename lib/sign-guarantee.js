'use strict';
const MARKER='[IZBOR GARANCIJE / GARANTIEZIEL]';
function relevant(doc){return doc.contractDetails?.audience==='client'&&doc.content.blocks.some(b=>b.runs.map(r=>r.text).join('').includes(MARKER));}
function fail(message){throw new (require('./sign-content.js').SignError)(400,message);}
function validate(value){
 if(!value||!['leads','reach'].includes(value.goal))fail('Izaberi cilj garancije: leadovi ili 10× doseg.');
 const result={goal:value.goal};
 if(value.goal==='reach'){
  for(const key of ['platform','baseline','target']){const v=value[key];if(typeof v!=='string'||v.length>120||/[\u0000-\u001f\u007f]/.test(v))fail('Proveri podatke za garanciju dosega.');result[key]=v.trim();}
  if(!['Instagram','Facebook'].includes(result.platform)||!/^\d{4}-\d{2}-\d{2}$/.test(value.baselineEnd||''))fail('Izaberi platformu i poslednji dan početnog perioda od 30 dana.');
  result.baselineEnd=value.baselineEnd;
  const date=new Date(result.baselineEnd+'T00:00:00Z');if(!Number.isFinite(+date)||date.toISOString().slice(0,10)!==result.baselineEnd)fail('Proveri datum početnog dosega.');
  if(result.baseline!==''&&!/^\d{1,12}$/.test(result.baseline))fail('Početni doseg unesi kao nenegativan ceo broj ili ostavi prazno ako podatak nije dostupan.');
  if(result.baseline===''||Number(result.baseline)===0){if(!/^[1-9]\d{0,12}$/.test(result.target))fail('Ako je početni doseg nula ili nije dostupan, unesi dogovoreni ciljani doseg.');}
  else result.target=String(Number(result.baseline)*10);
 }
 return result;
}
function assertSelected(doc){if(relevant(doc))validate(doc.contractDetails?.guarantee);}
function applyGuarantee(doc){
 if(!relevant(doc))return doc;
 const g=validate(doc.contractDetails?.guarantee),de=doc.contractDetails.language==='de';
 const end=g.goal==='reach'?new Date(g.baselineEnd+'T00:00:00Z'):null;if(end)end.setUTCDate(end.getUTCDate()-29);
 const summary=g.goal==='reach'?(de?`Vereinbarte Plattform: ${g.platform}. Ausgangsreichweite: ${g.baseline||'nicht verfügbar'} Personen im Zeitraum ${end.toISOString().slice(0,10)} bis ${g.baselineEnd}. Garantierte Zielreichweite: ${g.target} Personen pro garantiertem 30-Tage-Zyklus.`:`Ugovorena platforma: ${g.platform}. Početni doseg: ${g.baseline||'podatak nije dostupan'} osoba u periodu ${end.toISOString().slice(0,10)} do ${g.baselineEnd}. Garantovani ciljani doseg: ${g.target} osoba po garantovanom ciklusu od 30 dana.`):'';
 for(const b of doc.content.blocks){let t=b.runs.map(r=>r.text).join('');const original=t;t=t.replace(MARKER,de?'Vereinbartes Garantieziel (genau eine Option):':'Ugovoreni cilj garancije (izabrana je jedna opcija):');t=t.replace('☐ LEADS:',(g.goal==='leads'?'[X]':'[ ]')+' LEADS:').replace('☐ REACH:',(g.goal==='reach'?'[X]':'[ ]')+' REACH:');t=t.replace('[PODACI O DOSEGU / REICHWEITENDATEN]',summary);if(t!==original)b.runs=[{...(b.runs[0]||{}),text:t}];}
 return doc;
}
module.exports={MARKER,relevant,validate,assertSelected,applyGuarantee};
