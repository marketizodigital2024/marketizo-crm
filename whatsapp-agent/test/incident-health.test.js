import test from "node:test";
import assert from "node:assert/strict";
import { incidentHealth, recoveredCoverageKeys } from "../src/incident-health.js";
test("health separates incident types without exposing private group IDs or summaries", () => {
  const output = incidentHealth({
    a: { key: "processing:private-group@g.us", summary: "private content", resolvedAt: 0 },
    b: { key: "daily-report", resolvedAt: 123 },
    c: { key: "active-client-groups", resolvedAt: 0 },
    d: { key: "unknown:private-id", resolvedAt: 0 }
  });
  assert.deepEqual(output, { processing: 1, reports: 0, coverage: 1, roster: 0, other: 1 });
  assert.equal(/private|@g.us/.test(JSON.stringify(output)), false);
});
test("successful group read closes only its previous new-group alert after fresh active mapping", () => {
  assert.deepEqual(recoveredCoverageKeys("group-read:111@g.us", { assignmentsFresh: true, activeClient: true }), ["new-group:111@g.us"]);
  assert.deepEqual(recoveredCoverageKeys("group-read:111@g.us", { assignmentsFresh: false, activeClient: true }), []);
  assert.deepEqual(recoveredCoverageKeys("group-read:111@g.us", { assignmentsFresh: true, activeClient: false }), []);
  assert.deepEqual(recoveredCoverageKeys("group-read:111@c.us", { assignmentsFresh: true, activeClient: true }), []);
  assert.deepEqual(recoveredCoverageKeys("group-discovery", { assignmentsFresh: true }), ["new-group-sync"]);
});
