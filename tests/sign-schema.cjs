'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), crypto = require('node:crypto');
const { PGlite } = require('@electric-sql/pglite');
const { validateDraft } = require('../lib/sign-content.js');
(async () => {
  const db = new PGlite(); await db.waitReady;
  try {
    await db.exec("create role anon; create role authenticated; create role service_role; create table public.agency_crm_state(id text primary key,payload jsonb); grant select on public.agency_crm_state to service_role;");
    const original = { employees: [{ id: 'emp-miljan', active: true }, { id: 'emp-ivana', active: false }, { id: 'employee', active: true }], clients: [{ id: 'existing', name: 'Unchanged' }] };
    await db.query('insert into agency_crm_state values($1,$2)', ['marketizo-main', JSON.stringify(original)]);
    await db.exec(fs.readFileSync(require('node:path').join(__dirname, '../database/marketizo-sign.sql'), 'utf8'));
    const fixture = validateDraft({ title: 'Fixture šđö', category: 'clients', content: { version: 1, blocks: [{ type: 'paragraph', runs: [{ text: 'Agreed terms' }] }] }, recipients: [{ name: 'Test', email: 'test@example.com', country: 'AT' }] });
    const id = crypto.randomUUID(), templateId = crypto.randomUUID(), command = crypto.randomUUID();
    async function act(action, payload, actor = 'emp-miljan', commandId = crypto.randomUUID()) { return (await db.query('select marketizo_sign_command($1,$2,$3,$4,$5::jsonb) r', ['marketizo-main', actor, commandId, action, JSON.stringify(payload)])).rows[0].r; }
    const payload = { id, kind: 'document', revision: 0, data: fixture };
    await db.exec('set role service_role');
    assert.equal((await act('save', payload, 'employee')).status, 403); assert.equal((await act('save', payload, 'emp-ivana')).status, 403);
    let r = await act('save', payload, 'emp-miljan', command); assert.equal(r.ok, true); assert.equal(r.revision, 1);
    assert.equal((await act('save', payload, 'emp-miljan', command)).duplicate, true);
    assert.equal((await act('save', { ...payload, data: { ...fixture, title: 'Changed intent' } }, 'emp-miljan', command)).status, 409);
    assert.equal((await act('save', payload)).status, 409);
    assert.equal((await act('save', { id: templateId, kind: 'template', revision: 0, data: { ...fixture, recipients: [] } })).ok, true);
    assert.equal((await act('freeze', { id: templateId, kind: 'template', revision: 1 })).status, 409);
    const freeze = { id, kind: 'document', revision: 1 }; r = await act('freeze', freeze); assert.equal(r.ok, true); assert.equal(r.revision, 2);
    assert.equal((await act('save', { ...payload, revision: 2 })).status, 409);
    assert.equal((await act('archive', { id, kind: 'document', revision: 2 })).revision, 3);
    assert.equal((await act('restore', { id, kind: 'document', revision: 3 })).revision, 4);
    assert.equal((await db.query('select count(*)::integer n from marketizo_sign_versions')).rows[0].n, 1);
    assert.equal((await db.query('select snapshot from marketizo_sign_versions')).rows[0].snapshot.title, fixture.title);
    const events = (await db.query('select * from marketizo_sign_events where document_id=$1 order by sequence', [id])).rows;
    assert.equal(events.length, 4); assert.equal(events[0].previous_sha256, '0'.repeat(64)); events.slice(1).forEach((e, i) => assert.equal(e.previous_sha256, events[i].event_sha256));
    await assert.rejects(db.query('update marketizo_sign_documents set data=$1 where id=$2', [JSON.stringify({ ...fixture, title: 'Tamper' }), id]), /Frozen/);
    await assert.rejects(db.exec("update marketizo_sign_events set action='changed'"), /permission denied|immutable/);
    await assert.rejects(db.exec('delete from marketizo_sign_versions'), /permission denied|immutable/);
    await db.exec('reset role');
    assert.deepEqual((await db.query('select payload from agency_crm_state')).rows[0].payload, original);
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`);
      for (const table of ['marketizo_sign_documents', 'marketizo_sign_templates', 'marketizo_sign_versions', 'marketizo_sign_events', 'marketizo_sign_commands']) await assert.rejects(db.exec(`select * from ${table}`), /permission denied/);
      await assert.rejects(act('save', { ...payload, id: crypto.randomUUID() }), /permission denied/);
      await db.exec('reset role');
    }
    console.log('PASS: actual PostgreSQL Sign setup checks roles, idempotency, revision conflicts, template separation, immutable versions, audit chaining, archive/restore and CRM isolation.');
  } finally { await db.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
