const fs = require("node:fs"), vm = require("node:vm"), assert = require("node:assert/strict");
const app = fs.readFileSync(__dirname + "/../app.js", "utf8");
const start = app.indexOf('document.getElementById("employeeActivityForm")?.addEventListener');
const end = app.indexOf('document.getElementById("employeeLateForm")', start);
let handler, sequence = 0, saves = 0, resets = 0, successes = 0, resolveSave;
const values = { activityName: "Team Building", category: "Interno" };
const button = { disabled: false }, categoryInput = { hidden: false, required: true };
const form = { dataset: {}, querySelector(selector) { return selector.includes("submit") ? button : categoryInput; }, reset() { resets++; } };
const initialLog = { id: "existing-log", minutes: 90 }, concurrentLog = { id: "concurrent-log", minutes: 60 };
let submitted;
const ctx = {
  state: { employeeActivities: [], employeeActivityCategories: [], employeeWorkLogs: [initialLog] },
  window: { MarketizoRemote: { addActivity(activity) { submitted = activity; saves++; return new Promise(resolve => { resolveSave = resolve; }); } } },
  document: { getElementById() { return { addEventListener(type, fn) { handler = fn; } }; } },
  FormData: class { get(key) { return values[key]; } },
  crypto: { randomUUID() { return "catalog-" + ++sequence; } },
  saveState(options) { assert.equal(options.remote, false); },
  renderAll() {}, showToast(title, message, kind) { if (kind === "ok") successes++; }
};
vm.createContext(ctx); vm.runInContext(app.slice(start, end), ctx);
const event = { currentTarget: form, preventDefault() {} };
(async () => {
  const first = handler(event);
  assert.equal(button.disabled, true); assert.equal(successes, 0); assert.equal(resets, 0);
  assert.equal(ctx.state.employeeActivities.length, 0); // Nothing provisional enters shared local state.
  await handler(event); assert.equal(saves, 1);
  const pendingId = submitted.id;
  ctx.state.employeeWorkLogs.push(concurrentLog);
  resolveSave({ ok: false, error: "fixture write failure" }); await first;
  assert.equal(resets, 0); assert.equal(successes, 0); assert.equal(button.disabled, false);
  assert.deepEqual(ctx.state.employeeWorkLogs, [initialLog, concurrentLog]);
  const retry = handler(event); assert.equal(submitted.id, pendingId);
  resolveSave({ ok: true, activity: submitted, activities: [submitted] }); await retry;
  assert.equal(ctx.state.employeeActivities.length, 1);
  assert.deepEqual(ctx.state.employeeWorkLogs, [initialLog, concurrentLog]);
  assert.equal(resets, 1); assert.equal(successes, 1);
  assert.equal(categoryInput.hidden, true); assert.equal(categoryInput.required, false);
  assert.equal(form.dataset.saving, undefined);
  values.activityName = "Another activity";
  const changed = handler(event); assert.notEqual(submitted.id, pendingId);
  resolveSave({ ok: false }); await changed;
  const changedId = submitted.id;
  values.activityName = "Changed after failure";
  const changedAgain = handler(event); assert.notEqual(submitted.id, changedId);
  resolveSave({ ok: false }); await changedAgain;
  console.log("PASS: compact catalog save, failure retention, stable retry ID, changed-input ID, double click, coworker logs and confirmed reset.");
})().catch(error => { console.error(error); process.exitCode = 1; });
