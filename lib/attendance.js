'use strict';
const calendar = require('./business-calendar.js');
const crypto = require('node:crypto');
const scheduleRules=require('./attendance-schedule.js');
const zone = 'Europe/Vienna';
const dateValid = d => {try{return /^20\d\d-\d\d-\d\d$/.test(d || '') && new Date(`${d}T12:00:00Z`).toISOString().slice(0,10) === d;}catch{return false;}};
const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function dates(from,to) {
  if (!dateValid(from) || !dateValid(to) || to < from || (Date.parse(to)-Date.parse(from))/86400000 > 366) throw Error('Izaberite period do 367 dana.');
  const out=[]; for(let t=Date.parse(from);t<=Date.parse(to);t+=86400000)out.push(new Date(t).toISOString().slice(0,10)); return out;
}
function localInstant(value) {
  if(!/^20\d\d-\d\d-\d\dT\d\d:\d\d$/.test(value || '') || !dateValid(value.slice(0,10)) || +value.slice(11,13)>23 || +value.slice(14)>59)throw Error('Unesite ispravan datum i vreme.');
  const target=Date.parse(`${value}:00Z`), matches=[];
  const fmt=new Intl.DateTimeFormat('sv-SE',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  for(const offset of [60,120]){const t=target-offset*60000;if(fmt.format(t).replace(' ','T')===value)matches.push(t);}
  if(matches.length!==1)throw Error('Ovo vreme ne postoji ili je dvosmisleno zbog promene sata u Beču. Izaberite nedvosmisleno vreme.');
  return matches[0];
}
function validate(input,schedule=null) {
  if(!dateValid(input.date) || input.date>today())throw Error('Datum rada mora biti danas ili ranije.');
  const start=localInstant(input.start),end=localInstant(input.end);
  if(input.start.slice(0,10)!==input.date || end<=start || end-start>24*3600000)throw Error('Kraj mora biti posle početka, najviše 24 sata kasnije.');
  if(!Array.isArray(input.breaks) || input.breaks.length>12)throw Error('Najviše 12 pauza po danu.');
  const intervals=input.breaks.map(b=>({start:localInstant(b.start),end:localInstant(b.end),value:{start:b.start,end:b.end}})).sort((a,b)=>a.start-b.start);
  let last=start,total=0;
  for(const b of intervals){if(b.start<start || b.end>end || b.end<=b.start || b.start<last)throw Error('Pauze moraju biti unutar smene i bez preklapanja.');total+=(b.end-b.start)/60000;last=b.end;}
  const grossMinutes=(end-start)/60000;
  if(total>=grossMinutes)throw Error('Pauza ne može zauzeti celu smenu.');
  return {date:input.date,start:input.start,end:input.end,breaks:intervals.map(b=>b.value),grossMinutes,breakMinutes:total,netMinutes:grossMinutes-total,...(schedule&&input.confirmed===true?{schedule:{...schedule},confirmedAt:new Date().toISOString()}:{}),timeZone:zone,note:String(input.note||'').trim().slice(0,1000)};
}
function nextRecord(previous,input,actor,schedule=null) {
  const entry=validate(input,schedule);
  if(previous && input.revision!==previous.revision)throw Object.assign(Error('Zapis je u međuvremenu izmenjen. Osvežite prikaz pre čuvanja.'),{status:409});
  const now=new Date().toISOString();
  return {...entry,employeeId:input.employeeId,revision:crypto.randomUUID(),createdAt:previous?.createdAt||now,updatedAt:now,updatedBy:actor,
    history:[...(previous?.history||[]),...(previous?[{...previous,history:undefined}]:[])]};
}
function hourRows(state,records,employees,from,to) {
  const work=new Map(), recorded=new Map(records.map(r=>[`${r.employeeId}|${r.date}`,r]));
  for(const l of state.employeeWorkLogs||[]){if(l.date<from||l.date>to)continue;const k=`${l.employeeId}|${l.date}`;const v=work.get(k)||{work:0,pause:0};const n=Number(l.minutes ?? Number(l.hours||0)*60);if(!Number.isFinite(n)||n<0)continue;if(String(l.activityName||'').trim().toLowerCase()==='pauza')v.pause+=n;else v.work+=n;work.set(k,v);}
  const rows=[];
  for(const e of employees)for(const date of dates(from,to)){
    if(e.startDate && date<e.startDate || e.endDate && date>e.endDate)continue;
    const key=`${e.id}|${date}`,r=recorded.get(key),w=work.get(key),plan=r?.schedule||scheduleRules.forEmployee(e,date);
    const contract=require('../cost-calculation.js').weeklyHours(e,date.slice(0,7));
    const legacyTarget=calendar.isWorkingDay(date)&&Number.isFinite(contract)&&contract>0?require('../comp-time.js').scheduledMinutes(contract,date):0;
    const legacyExtra=w&&Number.isFinite(contract)&&contract>0?Math.max(0,w.work+(contract>=38?w.pause:0)-legacyTarget):'';
    let extra=r?(plan?Math.max(0,r.netMinutes-plan.netMinutes):''):legacyExtra;
    const absence=(state.employeeAbsences||[]).filter(a=>a.employeeId===e.id&&a.status==='Odobreno'&&a.startDate<=date&&a.endDate>=date).map(a=>a.type).join(', ');
    const estimated=!r&&w&&!absence?scheduleRules.estimated(e,date,w.work):null;if(estimated)extra=estimated.extraMinutes;
    if(!r&&!w&&!absence&&!calendar.isWorkingDay(date))continue;
    rows.push([e.name,date,r?.start||'',r?.end||'',r?r.breaks.map(b=>`${b.start} – ${b.end}`).join('; '):'',r?r.grossMinutes:'',r?r.breakMinutes:'',r?r.netMinutes:'',w?.work??'',w?.pause??'',absence,r?'Evidentirano':w?'Samo aktivnosti — početak/kraj nisu evidentirani':absence?'Odsustvo — nema unosa vremena':'Nije evidentirano',r?.note||'',scheduleRules.summary(plan),plan?.netMinutes??'',extra,r&&plan?r.netMinutes-plan.netMinutes:'',scheduleRules.warning(r),estimated?.start||'',estimated?.end||'',estimated?estimated.breaks.map(b=>b.start+' – '+b.end).join('; '):'',estimated?'Izračunato iz rasporeda i aktivnosti — nije potvrđeno':'']);
  }
  return rows;
}
function absenceRows(state,employees,from,to) {
  const map=new Map(employees.map(e=>[e.id,e]));
  return (state.employeeAbsences||[]).filter(a=>map.has(a.employeeId)&&a.startDate<=to&&a.endDate>=from).map(a=>[
    map.get(a.employeeId).name,a.type,a.startDate,a.endDate,a.status,
    dates(a.startDate<from?from:a.startDate,a.endDate>to?to:a.endDate).filter(calendar.isWorkingDay).length
  ]).sort((a,b)=>a[2].localeCompare(b[2])||a[0].localeCompare(b[0]));
}
function vacationSummary(state,employees,reference) {
  // Same entitlement/override semantics as the CRM; no source values are rewritten.
  return employees.map(e=>{
    const annual=Number(e.vacationDays??25), start=e.startDate;
    if(!dateValid(start))return[e.name,reference,annual,'','','','Nedostaje datum početka rada'];
    if(reference<start)return[e.name,reference,0,0,0,0,'Pre početka rada'];
    const anniversary=n=>{const d=new Date(`${start}T00:00:00Z`);d.setUTCFullYear(d.getUTCFullYear()+n);return d;};
    const ref=new Date(`${reference}T00:00:00Z`);let years=0;while(anniversary(years+1)<=ref)years++;
    let current=annual;const six=new Date(`${start}T00:00:00Z`);six.setUTCMonth(six.getUTCMonth()+6);
    if(!years&&ref<six)current=annual*((ref-anniversary(0))/86400000+1)/((anniversary(1)-anniversary(0))/86400000);
    const overrides=e.monthlyAbsenceDays||{};let used=reference.slice(0,4)>=today().slice(0,4)?Number(e.openingVacationUsed||0):0,reserved=0;
    for(const [month,values]of Object.entries(overrides))if(month.slice(0,4)>=start.slice(0,4)&&month.slice(0,4)<=reference.slice(0,4))used+=Number(values['Godišnji odmor']||0);
    for(const a of state.employeeAbsences||[])if(a.employeeId===e.id&&a.type==='Godišnji odmor'&&a.status==='Odobreno'){
      const lo=a.startDate<start?start:a.startDate,hi=a.endDate>`${reference.slice(0,4)}-12-31`?`${reference.slice(0,4)}-12-31`:a.endDate;
      if(hi<lo)continue;
      // Count long absences without imposing the export range limit.
      for(let t=Date.parse(lo);t<=Date.parse(hi);t+=86400000){const d=new Date(t).toISOString().slice(0,10);if(!calendar.isWorkingDay(d)||Object.hasOwn(overrides,d.slice(0,7)))continue;if(d>reference)reserved++;else used++;}
    }
    const earned=years*annual+current,round=n=>Math.round(n*100)/100;
    return[e.name,reference,round(earned),round(used),reserved,round(earned-used-reserved),'Obračun CRM-a; uključuje početno stanje i mesečne korekcije'];
  });
}
const hourHeaders=['Zaposleni','Datum','Početak (Beč)','Kraj (Beč)','Pauze (Beč)','Prisustvo min','Pauze min','Neto rad min','Aktivnosti bez pauze min','Pauza u aktivnostima min','Odobreno odsustvo','Potpunost','Napomena','Fiksni raspored','Plan neto min','Dodatni rad min','Odstupanje neto min','Upozorenje','Izračunati početak','Izračunati kraj','Pauza po rasporedu','Izvor izračunatih vremena'];
function inspectionSheets(report,employees,type) {
  const deDate=s=>dateValid(s)?s.split('-').reverse().join('.'):'Nicht erfasst';
  const duration=n=>{const m=Math.round(Number(n)||0);return Math.floor(m/60)+':'+String(m%60).padStart(2,'0');};
  const kinds={'Godišnji odmor':'Urlaub','Bolovanje':'Krankenstand','Slobodan dan':'Freier Tag','Poklon dan':'Zusätzlicher freier Tag','Zeitausgleich':'Zeitausgleich'};
  return employees.map(e=>{
    const intro=[`Arbeitnehmer/in: ${e.name}`,`Dienstantritt: ${deDate(e.startDate)} | Zeitraum: ${deDate(report.from)} – ${deDate(report.to)}`];
    if(type==='hours'&&scheduleRules.isFilming(e)){
      let total=0,legacy=false;
      const rows=report.hours.filter(r=>r[0]===e.name&&(r[2]||r[8]!==''&&r[8]!==undefined)).map(r=>{const actual=!!r[2],minutes=Number(actual?r[7]:r[8])||0;total+=minutes;if(!actual)legacy=true;return[deDate(r[1]),duration(minutes)];});
      rows.push(['GESAMT',duration(total)]);
      return{name:legacy?'Arbeitsstundenübersicht (CRM)':'Arbeitsstundenübersicht',intro,headers:['Datum','Arbeitsstunden'],widths:[160,355],rows,summary:[]};
    }
    if(type==='hours'){
      const rows=report.hours.filter(r=>r[0]===e.name);let total=0,extra=0,missing=0,crmDays=0;const warnings=[];
      const hours=duration;
      const times=rows.map(r=>{
        const fromCRM=!r[2]&&r[8]!==''&&r[8]!==undefined,minutes=r[2]?r[7]:fromCRM?r[8]:null;
        if(minutes!==null)total+=Number(minutes)||0;if(fromCRM)crmDays++;extra+=Number(r[15])||0;
        if(!r[2]&&!r[10]&&r[1]<=today())missing++;if(r[17])warnings.push(deDate(r[1]));
        const time=v=>v?v.slice(11)+(v.slice(0,10)>r[1]?' (+1)':''):'Nicht erfasst';
        const estimated=!!r[18],breakText=r[2]?r[4]:estimated?r[20]:'';
        const breaks=r[2]||estimated?(breakText?breakText.split('; ').map(b=>b.split(' – ').map(time).join('–')).join('; '):'Keine Pause erfasst'):r[10]?(kinds[r[10]]||'Abwesenheit'):'Nicht erfasst';
        return[deDate(r[1]),r[10]&&!r[2]?'—':time(r[2]||r[18]),r[10]&&!r[3]?'—':time(r[3]||r[19]),minutes===null?'—':hours(minutes),r[15]===''||r[15]===undefined?'—':hours(r[15])];
      });
      times.push(['GESAMT','','',hours(total),hours(extra)]);
      return{name:rows.some(r=>r[18])?'Arbeitszeitübersicht (berechnet)':crmDays?'Arbeitszeitübersicht (CRM)':'Arbeitszeitaufzeichnung',intro,headers:['Datum','Beginn','Ende','Arbeitsstunden','Zusatzstunden'],widths:[90,90,90,125,120],rows:times,summary:[]};
    }
    const balance=report.vacations.find(r=>r[0]===e.name),annual=Number(e.vacationDays??25);
    intro.push(`Jahresurlaub laut CRM: ${annual} Arbeitstage`,balance?`Stand ${deDate(balance[1])}: Anspruch seit Eintritt ${balance[2]}, verbraucht ${balance[3]}, reserviert ${balance[4]}, verfügbar ${balance[5]} Tage.`:'Urlaubsstand: nicht erfasst');
    return{name:'Urlaubs- und Abwesenheitsaufzeichnung',intro,headers:['Von','Bis','Art','Tage im Zeitraum','Status'],widths:[70,70,155,110,110],
      rows:report.absences.filter(r=>r[0]===e.name&&r[4]==='Odobreno').map(r=>[deDate(r[2]),deDate(r[3]),kinds[r[1]]||'Sonstige genehmigte Abwesenheit',r[5],'Genehmigt']),
      summary:['Nur genehmigte Abwesenheiten; offene oder abgelehnte Anträge sind nicht enthalten.',
        'Arbeitstage laut CRM: Montag–Freitag, ohne österreichische Feiertage. Zeiträume bleiben im Original erhalten.',
        'Urlaubsstand: bestehender CRM-Rechenstand einschließlich Anfangswerten und Monatskorrekturen; Berechnungsmodell ab Dienstantritt.',
        'Angerechnete Vordienstzeiten und abweichende Urlaubsjahresvereinbarungen: im CRM nicht erfasst.',
        'Urlaubsentgelt und Auszahlungstermine: hier nicht erfasst; ergänzende Lohnverrechnungsunterlagen erforderlich.']};
  });
}
module.exports={dateValid,today,dates,localInstant,validate,nextRecord,hourRows,absenceRows,vacationSummary,hourHeaders,inspectionSheets};
