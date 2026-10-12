const fs = require("node:fs"), vm = require("node:vm"), assert = require("node:assert/strict");
const app = fs.readFileSync(__dirname + "/../app.js", "utf8");
const start = app.indexOf('document.getElementById("employeeActivityForm")?.addEventListener');
const end = app.indexOf('document.getElementById("employeeLateForm")', start);
let handler, sequence = 0, saves = 0, resets = 0, successes = 0, failed = true, resolveSave;
const values = { activityName: "Nova aktivnost", category: "__new__", newCategory: "Nova kategorija" };
const button = { disabled: false }, categoryInput = { hidden: false, required: true };
const form = { dataset: {}, querySelector(selector) { return selector.includes("submit") ? button : categoryInput; }, reset() { resets++; } };
const initialLog = { id: "existing-log", minutes: 90 };
const concurrentLog = { id: "concurrent-log", minutes: 60 };
const ctx = {
  state: { employeeActivities: [], employeeActivityCategories: [], employeeWorkLogs: [initialLog] },
  onlineHydrationComplete: true, window: { MarketizoRemote: {} },
  document: { getElementById() { return { addEventListener(type, fn) { handler = fn; } }; } },
  FormData: class { get(key) { return values[key]; } },
  crypto: { randomUUID() { return "catalog-" + ++sequence; } },
  localStorage: { setItem() {} }, loadState(value) { return value; },
  alert() {}, renderAll() {}, showToast(title, message, kind) { if (kind === "ok") successes++; },
  saveState() { saves++; return new Promise(resolve => { resolveSave = resolve; }); }
};
vm.createContext(ctx); vm.runInContext(app.slice(start, end), ctx);
const event = { currentTarget: form, preventDefault() {} };
(async () => {
  const first = handler(event);
  assert.equal(button.disabled, true);
  assert.equal(successes, 0); assert.equal(resets, 0);
  await handler(event); assert.equal(saves, 1);
  const pendingId = ctx.state.employeeActivities[0].id;
  // A coworker's work entry arrives while this save fails.
  ctx.state.employeeWorkLogs.push(concurrentLog);
  resolveSave({ ok: false, error: "fixture write failure" }); await first;
  assert.equal(ctx.state.employeeActivities.length, 0);
  assert.equal(resets, 0); assert.equal(successes, 0);
  assert.equal(button.disabled, false);
  assert.deepEqual(ctx.state.employeeWorkLogs, [initialLog, concurrentLog]);
  assert.equal(values.activityName, "Nova aktivnost");
  const retry = handler(event);
  assert.equal(ctx.state.employeeActivities[0].id, pendingId);
  const canonical = structuredClone(ctx.state);
  canonical.employeeWorkLogs.push({ id: "newest-log", minutes: 30 });
  resolveSave({ ok: true, payload: canonical }); await retry;
  assert.equal(ctx.state.employeeActivities.length, 1);
  assert.equal(ctx.state.employeeWorkLogs.length, 3);
  assert.equal(resets, 1); assert.equal(successes, 1);
  assert.equal(categoryInput.hidden, true); assert.equal(categoryInput.required, false);
  assert.equal(form.dataset.saving, undefined);
  ctx.onlineHydrationComplete = false;
  await handler(event); assert.equal(saves, 2);
  // Category initialization must not launch another full-state save on submit.
  const setup = app.slice(app.indexOf("function setupEmployeeActivityCategories()"), app.indexOf("setupEmployeeActivityCategories();"));
  assert.ok(!setup.includes('form.addEventListener("submit"'));
  console.log("PASS: catalog confirmation, failure retention, retry ID, double click, canonical coworker logs, hydration guard, single submit save.");
})().catch(error => { console.error(error); process.exitCode = 1; });
