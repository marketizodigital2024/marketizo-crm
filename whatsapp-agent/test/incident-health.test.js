import test from "node:test";
import assert from "node:assert/strict";
import { incidentHealth } from "../src/incident-health.js";
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
