'use strict';
const ROLES = [
  {name:'SMM', source:'SMM', hours:'Sati SMM', relation:'SMM (Tim)', base:154/168},
  {name:'Scenarista', source:'Scenarista', hours:'Sati scenarista', relation:'Scenarista (Tim)', base:154/144},
  {name:'Editor', source:'Editor', hours:'Sati editor', relation:'Editor (Tim)', base:154/144},
  {name:'Snimatelj', source:'Snimatelj', hours:'Sati snimatelj', relation:'Snimatelj (Tim)'},
  {name:'Paid Ads', source:'Paid Ads', hours:'Sati paid ads', relation:'Paid Ads (Tim)'}
];
const norm = v => String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/\s*[-|⏐]\s*marketizo.*$/,'').replace(/[^a-z0-9]+/g,' ').trim();
const round = (v, places=1) => Math.round((v+Number.EPSILON)*10**places)/10**places;
const field = (t,name) => (t.custom_fields||[]).find(f=>f.name===name);
function number(v) {
  if(v==null||v==='') return null;
  if(typeof v==='object') return number(v.value ?? v.result ?? v.calculated_value);
  const n=Number(v); return Number.isFinite(n)?n:null;
}
function people(f, definitions) {
  if(f?.value==null) return [];
  const d=definitions.find(d=>d.id===f.id)||f, options=d.type_config?.options||[];
  return (Array.isArray(f.value)?f.value:[f.value]).map(v=>{
    if(typeof v==='object')return v.username||v.name||v.email||'';
    const o=options.find(o=>o.id===v||String(o.orderindex)===String(v));
    if(!o && ['drop_down','labels'].includes(d.type)) throw Error('Nepoznata opcija polja '+f.name);
    return o?.label||o?.name||String(v);
  }).filter(v=>v&&!['nije dodeljeno','klijent','eleven labs',''].includes(norm(v)));
}
function hours(task,role,active) {
  // Match the existing per-client planning formulas, including per-row rounding.
  const native=number(field(task,role.hours)?.value);
  if(native!=null && native>=0)return active?native:0;
  if(!active)return 0;
  const reels=number(field(task,'Reela mesečno')?.value);
  if(role.name==='Paid Ads') {
    const paid=number(field(task,'Paid ads sati mesečno')?.value);
    if(paid==null||paid<0)throw Error('Nedostaju paid ads sati: '+task.name);
    return paid;
  }
  if(reels==null||reels<0)throw Error('Nedostaje broj reelova: '+task.name);
  return role.name==='Snimatelj' ? (reels>=12?6:reels>0?3:0) : round(reels*role.base);
}
function shares(task) {
  const text=String(task.markdown_description||task.description||'');
  const line=text.split('\n').find(l=>/^Raspodela kapaciteta:/i.test(l.trim()));
  if(!line)return {};
  const out={};
  for(const part of line.replace(/^.*?:/,'').split(';')){
    const match=part.trim().match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*%\s*\.?$/);
    const role=match&&ROLES.find(r=>norm(r.name)===norm(match[1]));
    if(!role||Number(match[2].replace(',','.'))<=0)throw Error('Neispravna raspodela kapaciteta: '+task.name);
    out[role.name]=Number(match[2].replace(',','.'))/100;
  }
  if(Math.abs(Object.values(out).reduce((a,b)=>a+b,0)-1)>0.00001)throw Error('Raspodela kapaciteta mora biti 100%: '+task.name);
  return out;
}
// Plain text boundaries survive ClickUp's Markdown/rich-text round trip.
const START='Automatski obračun kapaciteta', END='Obračun se osvežava automatski svakog minuta.';
function description(task,row) {
  const content=[START,'',`Ukupno: **${row.hours} h mesečno / ${round(row.capacity,2)} h kapaciteta — ${row.percent}%**.`,'',
    '| Uloga | Klijenata | Sati mesečno | Kapacitet mesečno | Zauzeće |','| --- | ---: | ---: | ---: | ---: |',
    ...row.roles.map(r=>`| ${r.name} | ${r.clients} | ${r.hours} | ${r.capacity==null?'—':round(r.capacity,2)} | ${r.percent==null?'—':r.percent+'%'} |`),'',
    'Planirani sati iz aktivnih klijenata. Promene se proveravaju svakog minuta; ovo nisu evidentirani radni sati.',END].join('\n');
  const old=String(task.markdown_description||task.description||'');
  const a=old.indexOf(START), b=old.indexOf(END);
  if(a>=0 && b>a)return old.slice(0,a)+content+old.slice(b+END.length);
  if(a>=0||b>=0)throw Error('Nepotpun automatski odeljak: '+task.name);
  return old.trimEnd()+(old.trim()?'\n\n':'')+content;
}
function plan(clients,team,definitions) {
  const warnings=[], rows=[], writes=[], alias=new Map(), byId=new Map();
  for(const t of team.filter(t=>!t.archived&&!t.parent&&!['closed','done'].includes(t.status?.type))){
    const weekly=number(field(t,'Sati nedeljno')?.value);
    if(!(weekly>0)){warnings.push('Upiši nedeljni kapacitet: '+t.name);continue;}
    const row={id:t.id,name:t.name,weekly,capacity:weekly*52/12,roles:ROLES.map(r=>({name:r.name,hours:0,clients:0})),hours:0,percent:0,shares:shares(t)};
    rows.push(row);byId.set(t.id,{task:t,row});
    for(const name of [t.name,...(t.assignees||[]).flatMap(a=>[a.username,a.email])].filter(Boolean)){
      const key=norm(name);if(alias.has(key)&&alias.get(key)!==row)throw Error('Duplo ime u Tim: '+name);alias.set(key,row);
    }
  }
  if(!rows.length)throw Error('Tim nema zaposlenih sa nedeljnim kapacitetom.');
  // Role options also identify team members with no assigned clients yet.
  const memberships=new Map(rows.map(r=>[r.id,new Set()]));
  for(const role of ROLES){
    const d=definitions.find(f=>f.name===role.source);
    for(const option of d?.type_config?.options||[]){
      const row=alias.get(norm(option.label||option.name));
      if(row)memberships.get(row.id).add(role.name);
    }
  }
  const links=[];
  for(const t of clients.filter(t=>!t.archived&&!t.parent)){
    const active=number(field(t,'Aktivan broj')?.value);
    if(active!==0&&active!==1)throw Error('Upiši Aktivan broj 0 ili 1: '+t.name);
    const status=people(field(t,'Status klijenta'),definitions)[0];
    if(status && (norm(status)==='aktivan')!==Boolean(active))throw Error('Status i Aktivan broj se razlikuju: '+t.name);
    for(const role of ROLES){
      const names=people(field(t,role.source),definitions), resolved=[], unknown=[];
      for(const name of names){const row=alias.get(norm(name));if(row)resolved.push(row);else unknown.push(name);}
      for(const name of unknown)warnings.push(`${t.name}: ${role.name} — ${name} nije u Tim sa kapacitetom`);
      const unique=[...new Map(resolved.map(r=>[r.id,r])).values()];
      if(active && unique.length){
        // Match the dashboard: each assigned person carries the role's planned hours.
        const h=hours(t,role,active);
        for(const row of unique){const r=row.roles.find(r=>r.name===role.name);r.hours+=h;r.clients++;}
      }
      const rf=field(t,role.relation)||definitions.find(f=>f.name===role.relation);
      if(rf && !unknown.length){
        const desired=unique.map(r=>r.id), old=(field(t,role.relation)?.value||[]).map(v=>String(v.id||v));
        const add=desired.filter(id=>!old.includes(id)), rem=old.filter(id=>!desired.includes(id));
        if(add.length||rem.length)links.push({kind:'field',taskId:t.id,fieldId:rf.id,value:{add,rem}});
      }
    }
  }
  for(const row of rows){
    const {task}=byId.get(row.id), configured=Object.keys(row.shares).length;
    row.roles=row.roles.filter(r=>r.clients||row.shares[r.name]||memberships.get(row.id).has(r.name));
    for(const r of row.roles){r.hours=round(r.hours,2);r.capacity=configured?(row.shares[r.name]!=null?row.capacity*row.shares[r.name]:null):row.roles.length===1?row.capacity:null;r.percent=r.capacity?round(r.hours/r.capacity*100):null;}
    row.hours=round(row.roles.reduce((s,r)=>s+r.hours,0),2);row.percent=round(row.hours/row.capacity*100);
    for(const role of ROLES){
      const f=field(task,`Zauzeće ${role.name} %`), value=row.roles.find(r=>r.name===role.name)?.percent??null;
      if(f && number(f.value)!==value)writes.push({kind:value==null?'clear':'field',taskId:task.id,fieldId:f.id,value});
    }
    for(const [name,value] of [['Sati klijenata mesecno',row.hours],['Opterecenje %',row.percent]]){
      const f=field(task,name);if(f && number(f.value)!==value)writes.push({kind:'field',taskId:task.id,fieldId:f.id,value});
      // An unset number still has a definition, included in the list task API.
      if(!f && name==='Sati klijenata mesecno')throw Error('Nedostaje polje Sati klijenata mesecno u Tim.');
    }
    const desc=description(task,row);if(desc!==String(task.markdown_description||task.description||''))writes.push({kind:'description',taskId:task.id,value:desc});
    delete row.shares;
  }
  return {rows,warnings:[...new Set(warnings)],writes:[...writes,...links]};
}
module.exports={ROLES,norm,number,people,hours,shares,description,plan};
