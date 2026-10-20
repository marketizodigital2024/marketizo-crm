'use strict';
const fs = require('node:fs'), crypto = require('node:crypto');
const { canonical, hash } = require('../lib/sign-workflow.js');
function verify(data, pdf) {
 if (!data?.manifest?.applicationKey || data.manifestSha256 !== hash(canonical(data.manifest))) throw Error('Manifest integrity mismatch');
 const key = data.manifest.applicationKey;
 if (key.algorithm !== 'Ed25519' || hash(key.publicKey) !== key.fingerprint || !crypto.verify(null, Buffer.from(data.manifestSha256, 'hex'), key.publicKey, Buffer.from(data.seal, 'base64'))) throw Error('Application signature mismatch');
 if (hash(pdf) !== data.finalSha256) throw Error('Final PDF integrity mismatch');
 const length = data.manifest.originalByteLength;
 if (!Number.isInteger(length) || length < 5 || length > pdf.length || hash(pdf.subarray(0, length)) !== data.manifest.originalSha256) throw Error('Original agreement bytes mismatch');
 return { fingerprint: key.fingerprint, originalSha256: data.manifest.originalSha256, finalSha256: data.finalSha256 };
}
if (require.main === module) {
 try { const result = verify(JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), fs.readFileSync(process.argv[3])); console.log(JSON.stringify({ integrityVerified: true, ...result, notice: 'Confirm this public-key fingerprint against the trusted issuer separately. This does not establish legal validity, signer identity, QES or a qualified timestamp.' }, null, 2)); }
 catch (e) { console.error(e.message); process.exitCode = 1; }
}
module.exports = { verify };
