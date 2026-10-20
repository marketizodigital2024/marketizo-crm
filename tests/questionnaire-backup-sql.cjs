const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create role service_role;
 create table agency_crm_state(id text primary key,payload jsonb,updated_at timestamptz);
 create table agency_crm_employee_auth(id text primary key,email text,password text,employee_data jsonb,updated_at timestamptz);
 create table marketizo_questionnaires(namespace text,id text,payload jsonb,updated_at timestamptz,primary key(namespace,id));`);
 await db.exec(fs.readFileSync(__dirname+'/../supabase/20261008_atomic_crm_restore.sql','utf8'));
 await db.exec(fs.readFileSync(__dirname+'/../migrations/questionnaire-backup.sql','utf8'));
 const at='2026-10-20T10:00:00Z',state={employees:[{id:'test',email:'fixture@example.invalid',password:'test',position:'Scenario'}],employeeWorkLogs:[{id:'retained'}]};
 await db.query('insert into agency_crm_state values ($1,$2,$3)',['marketizo-main',state,at]);
 await db.query('insert into agency_crm_state values ($1,$2,$3)',['marketizo-kpi-v1',{fixture:1},at]);
 const saved={format:'marketizo-questionnaires-v1',namespace:'production',rows:[
  {id:'template:business-sr',payload:{questions:['Sačuvano pitanje'],version:3},updated_at:at},
  {id:'invite-test',payload:{recordType:'invite',status:'Popunjen',answers:{0:'Sačuvani odgovor'},questions:['Pitanje']},updated_at:at}],
  defaultTemplates:{'accounts-de':{questions:['Testfrage'],version:1}}};
 await db.query('insert into marketizo_questionnaires values ($1,$2,$3,$4)',['production','newer',{recordType:'invite',answers:{0:'Noviji odgovor'}},at]);
 await db.query('insert into marketizo_questionnaires values ($1,$2,$3,$4)',['preview','untouched',{recordType:'invite'},at]);
 const snapshot=async()=> (await db.query('select marketizo_questionnaire_snapshot() as s')).rows[0].s;
 const restore=async(backup,expected,expectedAt=at)=> (await db.query('select marketizo_restore_complete_backup($1,$2,$3,$4,$5,$6) as r',[state,{fixture:2},expectedAt,at,backup,expected])).rows[0].r;
 let current=await snapshot();
 assert.equal((await restore(saved,{...current,rows:[]})).ok,false);
 assert.equal((await snapshot()).rows[0].id,'newer');
 assert.equal((await restore(saved,current,'2026-01-01Z')).ok,false);
 assert.equal((await snapshot()).rows[0].id,'newer');
 const bad={...saved,rows:[...saved.rows,{id:'bad',payload:{recordType:'invite'},updated_at:'invalid timestamp'}]};
 await assert.rejects(()=>restore(bad,current));
 assert.equal((await snapshot()).rows[0].id,'newer');
 assert.deepEqual((await db.query("select payload from agency_crm_state where id='marketizo-kpi-v1'")).rows[0].payload,{fixture:1});
 const r=await restore(saved,current);assert.equal(r.ok,true);assert.equal(r.questionnairesRestored,true);
 const restored=await snapshot();assert.equal(restored.rows.length,3);
 assert.deepEqual(restored.rows.find(r=>r.id==='invite-test').payload,saved.rows[1].payload);
 assert.deepEqual(restored.rows.find(r=>r.id==='template:business-sr').payload,saved.rows[0].payload);
 assert.notEqual(restored.rows.find(r=>r.id==='invite-test').updated_at,current.rows[0].updated_at);
 assert.equal((await db.query("select count(*)::int as n from marketizo_questionnaires where namespace='preview'")).rows[0].n,1);
 assert.equal((await db.query("select employee_data->>'position' as p from agency_crm_employee_auth where id='test'")).rows[0].p,'Scenario');
 const latest=(await db.query("select updated_at from agency_crm_state where id='marketizo-main'")).rows[0].updated_at;
 // Legacy backup does not wipe questionnaires; a changed KPI rejects the restore first.
 const kpiAt=(await db.query("select updated_at from agency_crm_state where id='marketizo-kpi-v1'")).rows[0].updated_at;
 const legacy=(await db.query('select marketizo_restore_complete_backup($1,$2,$3,$4,null,null) as r',[state,null,latest,kpiAt])).rows[0].r;
 assert.equal(legacy.ok,true);assert.equal(legacy.questionnairesRestored,false);assert.deepEqual(await snapshot(),restored);
 assert.equal((await db.query("select has_function_privilege('anon','marketizo_restore_complete_backup(jsonb,jsonb,timestamptz,timestamptz,jsonb,jsonb)','execute') as allowed")).rows[0].allowed,false);
 await db.close();console.log('PASS: actual PostgreSQL restore roundtrip, templates/defaults/answers, stale revision rejection, transaction rollback, preview isolation, employee auth and legacy backups.');
})().catch(e=>{console.error(e);process.exitCode=1});
