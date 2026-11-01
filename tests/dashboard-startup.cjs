'use strict';
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync(__dirname + '/../app.js', 'utf8');
const start = source.indexOf('async function hydrateOnlineState(');
const hydration = source.slice(start, source.indexOf('\n}', start) + 2);
async function scenario(result) {
  const calls = [], frames = [], timers = [];
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const context = {
    onlineHydrationComplete: false, state: { stale: true }, Event: function () {}, console,
    loadState: payload => { calls.push('normalize'); return structuredClone(payload); },
    setAdminLoadStatus: ready => calls.push(ready ? 'ready' : 'loading'),
    showToast() {}, renderAll: options => { assert.equal(options.cacheNotifications, false); calls.push('render'); },
    window: { location: { protocol: 'https:' }, dispatchEvent() {},
      requestAnimationFrame: callback => frames.push(callback), setTimeout: callback => timers.push(callback),
      MarketizoRemote: {
        load: async options => { assert.equal(options.writeLocal, false); await gate; return result; },
        adoptBaseline: state => { calls.push('baseline'); assert.equal(state.stale, undefined); },
        cache: state => { calls.push('cache'); assert.equal(state.stale, undefined); },
      },
    },
  };
  vm.createContext(context); vm.runInContext(hydration, context);
  const pending = context.hydrateOnlineState();
  assert.deepEqual(calls, ['loading']);
  assert.equal(context.onlineHydrationComplete, false, 'Slow reads cannot enable protected writes');
  release(); await pending;
  if (result.payload) {
    assert.deepEqual(calls, ['loading', 'normalize', 'baseline', 'ready', 'render']);
    assert.equal(context.onlineHydrationComplete, true);
    assert.equal(frames.length, 1); frames.shift()();
    assert.equal(calls.includes('cache'), false, 'Cache serialization yields a paint opportunity');
    timers.shift()(); assert.equal(calls.filter(x => x === 'cache').length, 1);
  } else {
    assert.equal(context.onlineHydrationComplete, false);
    assert.equal(calls.includes('render'), false); assert.equal(frames.length, 0);
  }
}
(async () => {
  await scenario({ payload: { clients: [] } });
  await scenario({ configured: true, error: 'Offline fixture' });
  const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
  const css = fs.readFileSync(__dirname + '/../styles.css', 'utf8');
  assert.match(html, /<body class="crm-online-loading">/);
  assert.match(css, /\.crm-online-loading main > #admin.active[^}]*display: block !important/);
  assert.match(css, /\.crm-online-loading #admin .dashboard-kpis strong,[\s\S]*?visibility: hidden/);
  console.log('PASS dashboard startup: slow/failing reads remain protected; normalized baseline precedes rendering; optional cache runs once after paint; initial metrics remain masked');
})().catch(error => { console.error(error); process.exitCode = 1; });
