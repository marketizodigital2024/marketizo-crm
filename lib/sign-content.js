'use strict';
// A deliberately small document schema. HTML is never accepted by the API.
const CATEGORIES = ['clients', 'employees', 'nda', 'annexes', 'other'];
const TYPES = ['paragraph', 'heading', 'bullet', 'ordered'];
class SignError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function fail(message) { throw new SignError(400, message); }
function text(value, max, label, required = false) {
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) fail(`Proveri polje: ${label}.`);
  const result = value.normalize('NFC').trim();
  if (required && !result) fail(`Popuni polje: ${label}.`);
  return result;
}
function validateContent(value) {
  if (!value || !Array.isArray(value.blocks) || value.blocks.length > 500 || value.version !== 1) fail('Dokument nije u podržanom formatu.');
  let total = 0;
  const blocks = value.blocks.map(block => {
    if (!block || !TYPES.includes(block.type) || !Array.isArray(block.runs) || block.runs.length > 300) fail('Proveri sadržaj dokumenta.');
    const runs = block.runs.map(run => {
      if (!run || typeof run.text !== 'string' || run.text.length > 10000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(run.text)) fail('Proveri tekst dokumenta.');
      total += run.text.length;
      return { text: run.text.normalize('NFC'), bold: run.bold === true, italic: run.italic === true, underline: run.underline === true };
    });
    return { type: block.type, level: block.type === 'heading' && block.level === 2 ? 2 : 1, runs };
  });
  if (total > 80000) fail('Dokument može imati najviše 80.000 znakova.');
  return { version: 1, blocks };
}
function validateDraft(input, kind = 'document') {
  if (!input || !CATEGORIES.includes(input.category)) fail('Izaberi kategoriju.');
  const title = text(input.title, 180, 'naziv', true);
  if (!Array.isArray(input.recipients) || input.recipients.length > 10) fail('Dozvoljeno je najviše deset potpisnika.');
  const seen = new Set();
  const recipients = input.recipients.map(r => {
    const email = text(r.email, 254, 'e-mail').toLowerCase();
    if (email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) fail('Proveri e-mail primaoca.');
    if (email && seen.has(email)) fail('Svaki potpisnik mora imati zasebnu e-mail adresu.');
    if (email) seen.add(email);
    const country = text(r.country, 2, 'zemlja').toUpperCase();
    if (country && !/^[A-Z]{2}$/.test(country)) fail('Zemlju unesi kao dve oznake, npr. AT ili DE.');
    return { name: text(r.name, 160, 'ime'), email, company: text(r.company || '', 180, 'firma'), capacity: text(r.capacity || '', 120, 'funkcija'), country, partyType: ['business', 'consumer', 'employee'].includes(r.partyType) ? r.partyType : 'business' };
  });
  const content = validateContent(input.content);
  return { title, category: input.category, content, recipients: kind === 'template' ? [] : recipients,
    governingLaw: 'AT', signatureMethod: 'qes', legalReview: 'pending',
    note: text(input.note || '', 2000, 'interna beleška') };
}
function assertReady(draft) {
  if (!draft.content.blocks.some(b => b.runs.some(r => r.text.trim()))) fail('Dokument je prazan.');
  if (!draft.recipients.length || draft.recipients.some(r => !r.name || !r.email || !r.country)) fail('Za svakog potpisnika popuni ime, e-mail i zemlju.');
  if (/\{\{[^}]*\}\}/.test(JSON.stringify(draft.content))) fail('Popuni sve promenljive šablona pre zaključavanja.');
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function renderHtml(draft) {
  const blocks = draft.content.blocks.map(b => {
    let body = b.runs.map(r => {
      let s = escapeHtml(r.text).replace(/\n/g, '<br>');
      if (r.bold) s = `<strong>${s}</strong>`;
      if (r.italic) s = `<em>${s}</em>`;
      if (r.underline) s = `<u>${s}</u>`;
      return s;
    }).join('');
    if (b.type === 'heading') return `<h${b.level + 1}>${body}</h${b.level + 1}>`;
    if (b.type === 'bullet') body = '• ' + body;
    if (b.type === 'ordered') body = '<span class="numbered"></span>' + body;
    return `<p>${body || '<br>'}</p>`;
  }).join('');
  return `<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(draft.title)}</title><style>body{max-width:760px;margin:40px auto;padding:24px;font:16px/1.65 Arial,sans-serif;color:#18202b;counter-reset:item}h1{line-height:1.2}p{white-space:pre-wrap;overflow-wrap:anywhere}.numbered:before{counter-increment:item;content:counter(item) '. '}.notice{border:1px solid #c7cbd0;padding:12px;font-size:13px}@media print{body{margin:0;max-width:none}h1,h2,h3{break-after:avoid}p{orphans:3;widows:3}}@page{size:A4;margin:22mm}</style></head><body><p class="notice">NACRT — nije potpisano. Pregled za pripremu ugovora; štampanje u PDF ne stvara kvalifikovani potpis.</p><h1>${escapeHtml(draft.title)}</h1>${blocks}</body></html>`;
}
module.exports = { CATEGORIES, SignError, validateDraft, assertReady, renderHtml };
