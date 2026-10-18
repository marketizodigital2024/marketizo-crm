import test from "node:test";
import assert from "node:assert/strict";
import { createGroupMonitor } from "../src/group-monitor.js";
test("a restored fresh cursor still gets a real startup read before unchanged-chat optimization", async () => {
  let calls = 0; const successes = [];
  const chat = { id: "111@g.us", isGroup: true, name: "Demo", timestamp: 900 };
  const state = { groups: { "111@g.us": { lastReadAt: 999000, active: true, monitored: true } } };
  const monitor = createGroupMonitor({ getChats: async () => [chat], fetchMessages: async () => { calls++; return []; },
    idOf: x => x, isReady: () => true, load: () => state, save() {}, remember() {}, enqueue() {}, onInventory() {},
    onSuccess: k => successes.push(k), now: () => 1000000, logger: { log() {}, error() {} }
  });
  assert.equal(await monitor.reconcile(), true);
  assert.equal(calls, 1);
  assert.ok(successes.includes("group-read:111@g.us"));
  await monitor.reconcile();
  assert.equal(calls, 1);
});
