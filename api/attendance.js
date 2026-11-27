'use strict';
const core=require('../lib/attendance.js');
const json=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));};
function createHandler(deps={}) {return async function(req,res){
  res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return json(res,405,{error:'Method not allowed'});}
  const h=deps.helpers||require('./state.js').helpers;
  try {
    const config=h.supabaseConfig();if(!config.configured)return json(res,503,{error:'Baza nije podešena.'});
    const current=await h.readStoredState(config),state=current.payload;
    const access=h.accessSession(req,state,config.key);
    if(!access||access.role==='client')return json(res,401,{error:'Prijavite se u CRM.'});
    const owner=access.role==='full-admin',actor=access.employee.id;
    const employees=(state.employees||[]).filter(e=>owner||e.id===actor);
    const query=new URL(req.url,'https://crm.invalid').searchParams;
    const employeeId=req.method==='POST'?req.body?.employeeId:query.get('employeeId');
    if(employeeId&&!employees.some(e=>e.id===employeeId))return json(res,403,{error:'Nemate pristup ovom zaposlenom.'});
    const selected=employeeId?employees.filter(e=>e.id===employeeId):employees;
    const table=process.env.SUPABASE_TABLE||'agency_crm_state';
    const ns=process.env.VERCEL_ENV==='preview'?'preview':process.env.CRM_STATE_ID||'marketizo-main';
    const prefix=`attendance-v1:${ns}:`;
    const headers=h.supabaseHeaders(config.key);
    const request=deps.request||((...a)=>require('../lib/database-request.js').request(fetch,...a));
    async function read(from,to,id){
      const params=new URLSearchParams({select:'id,payload',id:id?`eq.${prefix}${id}`:`like.${prefix}*`,order:'id.asc',limit:'1000'});
      const rows=[];
      for(let offset=0;;offset+=1000){params.set('offset',String(offset));const r=await request(`${config.url}/rest/v1/${table}?${params}`,{headers});if(!r.ok)throw Error('Čitanje evidencije nije uspelo.');const page=await r.json();rows.push(...page);if(page.length<1000)break;if(offset>20000)throw Error('Suviše veliki izveštaj. Izaberite kraći period.');}
      return rows;
    }
    if(req.method==='POST'){
      const body=req.body;
      if(!body||typeof body!=='object'||!employeeId)return json(res,400,{error:'Nedostaju podaci.'});
      const employee=selected[0],schedule=require('../lib/attendance-schedule.js').forEmployee(employee,body.date);
      const data=core.validate(body,schedule);
      if(employee.startDate&&data.date<employee.startDate||employee.endDate&&data.date>employee.endDate)return json(res,400,{error:'Datum je van perioda zaposlenja.'});
      const day=Date.parse(data.date),lo=new Date(day-86400000).toISOString().slice(0,10),hi=new Date(day+86400000).toISOString().slice(0,10);
      const documents=await read(lo,hi,employeeId),id=`${prefix}${employeeId}`,document=documents[0]?.payload;
      const nearby=Object.values(document?.records||{}).filter(r=>r.date>=lo&&r.date<=hi);
      const previous=document?.records?.[data.date];
      const entry=core.nextRecord(previous,body,actor,schedule);
      if(nearby.some(r=>r.date!==data.date&&core.localInstant(r.start)<core.localInstant(entry.end)&&core.localInstant(r.end)>core.localInstant(entry.start)))return json(res,400,{error:'Smena se preklapa sa susednim danom.'});
      // A separate row, never a PATCH to marketizo-main or existing activity/absence rows.
      const payload={employeeId,records:{...(document?.records||{}),[data.date]:entry},revision:require('node:crypto').randomUUID()};
      const params=new URLSearchParams({id:`eq.${id}`,'payload->>revision':`eq.${document?.revision||''}`});
      const response=await request(`${config.url}/rest/v1/${table}${document?'?'+params:''}`,{
        method:document?'PATCH':'POST',headers:{...headers,Prefer:'return=representation'},
        body:JSON.stringify(document?{payload,updated_at:new Date().toISOString()}:{id,payload,updated_at:new Date().toISOString()})
      });
      if(response.status===409)return json(res,409,{error:'Drugi unos je sačuvan u međuvremenu. Osvežite prikaz.'});
      if(!response.ok)throw Error('Čuvanje nije uspelo. Unos nije potvrđen.');
      const saved=await response.json();if(saved.length!==1||saved[0].payload?.revision!==payload.revision)return json(res,409,{error:'Unos nije potvrđen. Osvežite prikaz.'});
      return json(res,200,{ok:true,record:saved[0].payload.records[data.date]});
    }
    const from=query.get('from')||core.today().slice(0,7)+'-01',to=query.get('to')||core.today();core.dates(from,to);
    const records=(await read(from,to,owner?employeeId:actor)).flatMap(r=>Object.values(r.payload.records||{})).filter(r=>r.date>=from&&r.date<=to&&selected.some(e=>e.id===r.employeeId));
    const report={from,to,generatedAt:new Date().toISOString(),timeZone:'Europe/Vienna',schedules:Object.fromEntries(selected.map(e=>[e.id,require('../lib/attendance-schedule.js').forEmployee(e,from)])),employees:employees.map(e=>({id:e.id,name:e.name,status:e.status})),
      records:records.map(({history,...r})=>r),hours:core.hourRows(state,records,selected,from,to),
      absences:core.absenceRows(state,selected,from,to),vacations:core.vacationSummary(state,selected,to>core.today()?core.today():to),canSelectEmployee:owner};
    const format=query.get('format'),type=query.get('type')||'hours';
    if(format){
      if(!['xlsx','pdf'].includes(format)||!['hours','absences'].includes(type))return json(res,400,{error:'Nepoznat izvoz.'});
      const totals=selected.map(e=>{const rows=report.hours.filter(r=>r[0]===e.name);return[e.name,rows.filter(r=>r[2]).length,rows.filter(r=>!r[2]&&!r[10]).length,rows.reduce((n,r)=>n+(Number(r[7])||0),0),rows.reduce((n,r)=>n+(Number(r[8])||0),0),rows.reduce((n,r)=>n+(Number(r[9])||0),0),rows.reduce((n,r)=>n+(Number(r[15])||0),0)];});
      const sheets=type==='hours'?[{name:'Radno vreme',headers:core.hourHeaders,rows:report.hours},{name:'Ukupno',headers:['Zaposleni','Dana sa početkom i krajem','Dana bez vremena (bez odsustva)','Neto min iz potpunih unosa','Aktivnosti bez pauze min','Pauze iz aktivnosti min','Dodatni rad min'],rows:totals}]:[
        {name:'Odsustva',headers:['Zaposleni','Tip','Od','Do','Status','Radni dani u periodu'],rows:report.absences},
        {name:'Stanje odmora',headers:['Zaposleni','Stanje na dan','Stečeno dana','Iskorišćeno dana','Rezervisano dana','Preostalo dana','Napomena'],rows:report.vacations}];
      if(sheets.reduce((n,s)=>n+s.rows.length,0)>1000)return json(res,400,{error:'Za izvoz izaberite jednog zaposlenog ili kraći period (najviše 1000 redova).'});
      const output=deps.exports||require('../lib/attendance-export.js');
      const meta=[`Marketizo Digital e.U. | ${from} – ${to} | Europe/Vienna`,`Generisano: ${report.generatedAt}`,
        type==='hours'?'Neto rad = stvarno prisustvo minus pauze. Aktivnosti su odvojen izvor; kazne i korekcije salda nisu odbijene.':'Dani odsustva su radni dani u izabranom periodu. Status razlikuje zahteve od odobrenih odsustava.',
        'Dodatni rad: pozitivni dnevni višak iz potvrđenih vremena, a za dane bez njih iz aktivnosti prema tadašnjem CRM dnevnom fondu. To nije preneti saldo niti obračun zarade. Prazna vremena nisu rekonstruisana. Stanje odmora je obračun postojećih CRM podataka, uključujući početna stanja/korekcije.'];
      const bytes=format==='pdf'?await output.pdf(selected.flatMap(e=>core.inspectionSheets({...report,hours:core.hourRows(state,records,[e],from,to),absences:core.absenceRows(state,[e],from,to),vacations:core.vacationSummary(state,[e],to>core.today()?core.today():to)},[e],type)),[
        'Marketizo Digital e.U. | Inhaber: Miljan Marinjes','Simmeringer Hauptstraße 24, 1110 Wien',
        `Erstellt am ${new Intl.DateTimeFormat('de-AT',{timeZone:'Europe/Vienna',dateStyle:'medium',timeStyle:'short'}).format(new Date(report.generatedAt))}`
      ]):await output.xlsx(sheets,meta);
      res.setHeader('Content-Type',format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const person=selected.length===1?selected[0].name:'svi-zaposleni';
      const safe=String(person).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'dj').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80)||'zaposleni';
      res.setHeader('Content-Disposition',`attachment; filename="marketizo-${safe}-${type}-${from}-${to}.${format}"`);res.statusCode=200;return res.end(bytes);
    }
    return json(res,200,report);
  }catch(e){return json(res,e.status||(/datum|vreme|period|pauz|smenu|sata|Kraj|Datum|Najviše|Pauz/i.test(e.message)?400:503),{error:e.status||/datum|vreme|period|pauz|smenu|sata|Kraj|Datum|Najviše|Pauz/i.test(e.message)?e.message:'Evidencija trenutno nije dostupna. Pokušajte ponovo.'});}
};}
module.exports=createHandler();module.exports.createHandler=createHandler;
