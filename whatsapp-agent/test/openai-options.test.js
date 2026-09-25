import test from "node:test";
import assert from "node:assert/strict";
import { buildReasoningOptions } from "../src/openai-options.js";

test("reasoning models omit unsupported temperature", () => {
  assert.deepEqual(buildReasoningOptions("gpt-5.6-luna", "xhigh"), { reasoning_effort: "xhigh" });
  assert.deepEqual(buildReasoningOptions("gpt-6-astra", "high"), { reasoning_effort: "high" });
});

test("legacy chat models keep deterministic temperature", () => {
  assert.deepEqual(buildReasoningOptions("gpt-4o-mini", "xhigh"), { temperature: 0 });
});
