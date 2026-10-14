const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const output = path.join(root, 'public');
fs.mkdirSync(output, { recursive: true });
let count = 0;
for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (entry.isFile() && /\.(html|js|css|png|webmanifest)$/.test(entry.name)) {
    fs.copyFileSync(path.join(root, entry.name), path.join(output, entry.name));
    count++;
  }
}
fs.cpSync(path.join(root, 'icons'), path.join(output, 'icons'), { recursive: true });
fs.mkdirSync(path.join(output, 'lib'), { recursive: true });
fs.copyFileSync(path.join(root, 'lib/state-patch.js'), path.join(output, 'lib/state-patch.js'));
let references = 0;
for (const file of fs.readdirSync(output).filter(name => name.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(output, file), 'utf8');
  for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    const reference = match[1].split('?')[0];
    if (/^(https?:|data:|blob:|mailto:|tel:)/.test(reference) || reference.startsWith('/api/') || !path.extname(reference)) continue;
    assert(fs.existsSync(path.join(output, reference.replace(/^\//, ''))), `${file}: missing ${reference}`);
    references++;
  }
}
for (const privatePath of ['api', 'migrations', 'tests', 'node_modules', 'vercel.json', 'package.json', 'supabase-setup.sql', 'source.tar.gz']) {
  assert(!fs.existsSync(path.join(output, privatePath)), `Private build source exposed: ${privatePath}`);
}
assert.deepEqual(fs.readdirSync(path.join(output, 'lib')), ['state-patch.js']);
console.log(`Static build: ${count} root assets, icons and browser state-patch library; server source, tests, migrations and dependencies excluded.`);
console.log(`PASS: ${references} local HTML asset references exist; private-source exclusions verified.`);
