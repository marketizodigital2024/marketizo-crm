'use strict';
const assert = require('node:assert/strict');
const { validateDraft, assertReady, renderHtml } = require('../lib/sign-content.js');
const fixture = () => ({ title: 'Ugovor čćžšđ ÄÖÜ', category: 'clients', content: { version: 1, blocks: [{ type: 'heading', runs: [{ text: 'Član 1', bold: true }] }, { type: 'paragraph', runs: [{ text: '<img src=x onerror=alert(1)> & "Usluge"', italic: true }] }] }, recipients: [{ name: 'Test Primer', email: 'TEST@example.com', country: 'at', partyType: 'business' }], signatureMethod: 'simple', legalReview: 'approved', note: '' });
const safe = validateDraft(fixture());
assert.equal(safe.signatureMethod, 'ses'); assert.equal(safe.legalReview, 'pending'); assert.equal(safe.governingLaw, 'AT'); assert.equal(safe.recipients[0].email, 'test@example.com'); assert.equal(safe.recipients[0].country, 'AT');
assertReady(safe); const html = renderHtml(safe);
assert.ok(html.includes('&lt;img')); assert.ok(!html.includes('<img')); assert.ok(html.includes('Član 1')); assert.ok(html.includes('NACRT')); assert.ok(!html.includes('<script'));
const numbered = fixture(); numbered.content.blocks = [{ type: 'ordered', runs: [{ text: 'First' }] }, { type: 'ordered', runs: [{ text: 'Second' }] }, { type: 'paragraph', runs: [{ text: 'Break' }] }, { type: 'ordered', runs: [{ text: 'Restart' }] }];
assert.ok(renderHtml(validateDraft(numbered)).includes('<ol><li>First</li><li>Second</li></ol><p>Break</p><ol><li>Restart</li></ol>'));
assert.equal(validateDraft(fixture(), 'template').recipients.length, 0);
for (const alter of [x => x.content.blocks.push({ type: 'script', runs: [] }), x => x.category = 'invalid', x => x.content.blocks[0].runs[0].text = 'a'.repeat(80001), x => x.recipients[0].email = 'a@b.com\nBCC:test@evil.com', x => x.recipients.push({ ...x.recipients[0] })]) {
  const x = fixture(); alter(x); assert.throws(() => validateDraft(x));
}
const empty = fixture(); empty.content.blocks = []; assert.throws(() => assertReady(validateDraft(empty)), /prazan/);
const placeholder = fixture(); placeholder.content.blocks[0].runs[0].text = '{{client_name}}'; assert.throws(() => assertReady(validateDraft(placeholder)), /promenljive/);
const noEmail = fixture(); noEmail.recipients[0].email = ''; assert.throws(() => assertReady(validateDraft(noEmail)), /potpisnika/);
console.log('PASS: structured Sign content validates recipients and limits, escapes executable markup, preserves Unicode, rejects unfinished contracts and requires documented form approval separately from choosing SES or QES.');
const dossierId = '12345678-1234-4234-8234-123456789012';
const organized = { ...fixture(), dossier: { id: dossierId, type: 'employee', name: '  Test Zaposleni  ' }, parentDocumentId: '783f9585-50ad-4f62-bb33-ec7cb089b716' };
assert.equal(validateDraft(organized).dossier.name, 'Test Zaposleni');
assert.equal(validateDraft(organized).parentDocumentId, organized.parentDocumentId);
assert.equal(validateDraft(organized, 'template').dossier, null);
assert.equal(validateDraft(organized, 'template').parentDocumentId, null);
assert.throws(() => validateDraft({ ...organized, dossier: { ...organized.dossier, id: 'bad' } }));
assert.throws(() => validateDraft({ ...organized, dossier: null }));
assert.throws(() => validateDraft({ ...organized, dossier: { ...organized.dossier, type: 'unknown' } }));
assert.equal(validateDraft(fixture()).dossier, null); // Existing documents remain readable.

{
 const fixture={title:'Variant fixture',category:'employees',content:{version:1,blocks:[]},recipients:[],contractDetails:{audience:'contractor',engagement:'part_time'}};
 assert.equal(validateDraft(fixture,'template').contractDetails.engagement,'part_time');
 assert.equal(validateDraft({...fixture,contractDetails:{audience:'employee',engagement:'full_time'}}).contractDetails.engagement,'full_time');
 assert.throws(()=>validateDraft({...fixture,contractDetails:{audience:'contractor',engagement:'other'}}));
 assert.equal(validateDraft({...fixture,category:'clients',contractDetails:{audience:'client',engagement:'full_time'}}).contractDetails.engagement,undefined);
}
