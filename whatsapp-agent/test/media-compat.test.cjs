const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { patchMediaSource } = require('../scripts/patch-wwebjs-media.cjs');
const fixture = `async function download(msg, manager) {
  return manager.downloadManager.downloadAndMaybeDecrypt({
    directPath: msg.directPath,
    type: msg.type,
    signal: new AbortController().signal
  });
}`;
test('uncached voice download forwards audio MIME instead of triggering InvalidMediaFileType', async () => {
  const msg = { type: 'ptt', mimetype: 'audio/ogg; codecs=opus', directPath: '/synthetic' };
  const manager = { downloadManager: { downloadAndMaybeDecrypt: async options => {
    if (options.mimetype !== msg.mimetype) throw Error('InvalidMediaFileType');
    assert.equal(options.directPath, msg.directPath);
    assert.equal(options.type, 'ptt');
    return Buffer.from('synthetic audio');
  } } };
  const run = src => vm.runInNewContext(src + '; download', { AbortController });
  await assert.rejects(run(fixture)(msg, manager), /InvalidMediaFileType/);
  assert.equal((await run(patchMediaSource(fixture))(msg, manager)).toString(), 'synthetic audio');
});
test('backport is idempotent and fails closed when upstream structure changes', () => {
  const once = patchMediaSource(fixture);
  assert.equal(patchMediaSource(once), once);
  assert.throws(() => patchMediaSource('unknown version'), /Unsupported/);
});
