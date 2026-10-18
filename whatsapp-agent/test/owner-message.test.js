import test from "node:test";
import assert from "node:assert/strict";
import { splitOwnerMessage, sendOwnerMessage } from "../src/owner-message.js";
import { createOutbox } from "../src/outbox.js";

test("oversized owner answers retain every character, prefer paragraphs and preserve emoji", () => {
  for (const text of ["x".repeat(9000), "🔴".repeat(4000), "a".repeat(2100) + "\n\n" + "b".repeat(2000) + "\n\n" + "c".repeat(2000)]) {
    const parts = splitOwnerMessage(text);
    assert.equal(parts.join(""), text);
    assert.ok(parts.every(p => p.length <= 3500 && p.length > 0));
    assert.ok(parts.every(p => !/[\uD800-\uDBFF]$/.test(p) && !/^[\uDC00-\uDFFF]/.test(p)));
  }
  assert.equal(splitOwnerMessage("a".repeat(2100) + "\n\n" + "b".repeat(2000))[0].length, 2102);
});
test("partial delivery retry uses durable outbox deduplication instead of resending the first part", async () => {
  let state; const transmitted = []; let failSecond = true;
  const outbox = createOutbox({ load: () => state, save: s => { state = s; }, isReady: () => true,
    transmit: async (_to, body, label) => {
      if (label.endsWith("2/2") && failSecond) throw Error("temporary send failure");
      transmitted.push({ body, label });
      return { id: { _serialized: `sent-${transmitted.length}` }, ack: 2 };
    }, checkDelivery: async () => null, logger: { log() {}, error() {} }
  });
  const body = "a".repeat(2200) + "\n\n" + "b".repeat(2200);
  await assert.rejects(sendOwnerMessage(outbox.send, "owner", body, "report"), /temporary/);
  failSecond = false;
  await sendOwnerMessage(outbox.send, "owner", body, "report");
  assert.equal(transmitted.length, 2);
  assert.equal(transmitted.map(x => x.body).join("\n\n"), body);
  assert.equal(outbox.status().delivered, 2);
});
