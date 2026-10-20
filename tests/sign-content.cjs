'use strict';
const assert = require('node:assert/strict');
const { validateDraft, assertReady, renderHtml } = require('../lib/sign-content.js');
const fixture = () => ({ title: 'Ugovor čćžšđ ÄÖÜ', category: 'clients', content: { version: 1, blocks: [{ type: 'heading', runs: [{ text: 'Član 1', bold: true }] }, { type: 'paragraph', runs: [{ text: '<img src=x onerror=alert(1)> & "Usluge"', italic: true }] }] }, recipients: [{ name: 'Test Primer', email: 'TEST@example.com', country: 'at', partyType: 'business' }], signatureMethod: 'simple', legalReview: 'approved', note: '' });
const safe = validateDraft(fixture());
assert.equal(safe.signatureMethod, 'qes'); assert.equal(safe.legalReview, 'pending'); assert.equal(safe.governingLaw, 'AT'); assert.equal(safe.recipients[0].email, 'test@example.com'); assert.equal(safe.recipients[0].country, 'AT');
assertReady(safe); const html = renderHtml(safe);
assert.ok(html.includes('&lt;img')); assert.ok(!html.includes('<img')); assert.ok(html.includes('Član 1')); assert.ok(html.includes('NACRT')); assert.ok(!html.includes('<script'));
assert.equal(validateDraft(fixture(), 'template').recipients.length, 0);
for (const alter of [x => x.content.blocks.push({ type: 'script', runs: [] }), x => x.category = 'invalid', x => x.content.blocks[0].runs[0].text = 'a'.repeat(80001), x => x.recipients[0].email = 'a@b.com\nBCC:test@evil.com', x => x.recipients.push({ ...x.recipients[0] })]) {
  const x = fixture(); alter(x); assert.throws(() => validateDraft(x));
}
const empty = fixture(); empty.content.blocks = []; assert.throws(() => assertReady(validateDraft(empty)), /prazan/);
const placeholder = fixture(); placeholder.content.blocks[0].runs[0].text = '{{client_name}}'; assert.throws(() => assertReady(validateDraft(placeholder)), /promenljive/);
const noEmail = fixture(); noEmail.recipients[0].email = ''; assert.throws(() => assertReady(validateDraft(noEmail)), /potpisnika/);
console.log('PASS: structured Sign content validates recipients and limits, escapes executable markup, preserves Unicode, rejects unfinished contracts and cannot accept a browser-selected signature level or legal approval.');
