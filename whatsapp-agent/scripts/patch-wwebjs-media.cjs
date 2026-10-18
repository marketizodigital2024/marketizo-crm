// Compatibility backport: https://github.com/wwebjs/whatsapp-web.js/issues/201908
// WhatsApp's DownloadManager requires the declared MIME type for uncached audio/media.
const fs = require('node:fs');
const path = require('node:path');
function patchMediaSource(source) {
  const start = source.indexOf('.downloadManager.downloadAndMaybeDecrypt({');
  if (start < 0) throw Error('Unsupported WhatsApp media downloader: missing DownloadManager');
  const end = source.indexOf('});', start);
  if (end < 0) throw Error('Unsupported WhatsApp media downloader: missing options boundary');
  const options = source.slice(start, end);
  if (/mimetype\s*:\s*msg\.mimetype/.test(options)) return source;
  const updated = options.replace(/(type:\s*msg\.type,)(\r?\n)([ \t]*)/, '$1$2$3mimetype: msg.mimetype,$2$3');
  if (updated === options) throw Error('Unsupported WhatsApp media downloader: no declared message type');
  return source.slice(0, start) + updated + source.slice(end);
}
if (require.main === module) {
  const file = path.join(path.dirname(require.resolve('whatsapp-web.js/package.json')), 'src/structures/Message.js');
  const original = fs.readFileSync(file, 'utf8');
  const patched = patchMediaSource(original);
  if (patched !== original) fs.writeFileSync(file, patched);
  console.log('WhatsApp media compatibility: declared MIME type forwarded');
}
module.exports = { patchMediaSource };
