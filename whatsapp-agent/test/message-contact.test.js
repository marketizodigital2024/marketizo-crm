import test from "node:test";
import assert from "node:assert/strict";
import { messageAuthorId, resolveGroupMessageContact, wakeContactRecoveryQueue } from "../src/message-contact.js";

const group = { from: "111@g.us", author: "222@lid" };
test("new contact recovery wakes retained failures once without losing retry evidence or prepared alerts", () => {
  const state = { jobs: { a: { id: "a", attempts: 100, retryAt: 999999, preparedAlert: { body: "retained" } } } };
  assert.equal(wakeContactRecoveryQueue(state, "v1", 1000), true);
  assert.equal(state.jobs.a.retryAt, 31000);
  assert.equal(state.jobs.a.attempts, 100);
  assert.equal(state.jobs.a.preparedAlert.body, "retained");
  state.jobs.a.retryAt = 999999;
  assert.equal(wakeContactRecoveryQueue(state, "v1", 2000), false);
  assert.equal(state.jobs.a.retryAt, 999999);
});
test("upstream t:t contact failure keeps the exact group author without inventing a phone or name", async () => {
  const events = [];
  const c = await resolveGroupMessageContact(group, async () => { throw Error("t: t"); }, e => events.push(e));
  assert.equal(c.id._serialized, group.author);
  assert.equal(c.identitySource, "message_author");
  assert.equal(c.number, undefined);
  assert.equal(c.name, undefined);
  assert.equal(c.pushname, undefined);
  assert.deepEqual(events, [{ code: "contact_lookup_unavailable" }]);
  const verifiedTeamIds = new Set([group.author]);
  assert.equal(verifiedTeamIds.has(c.id._serialized), true);
});
test("successful contact lookup is preserved", async () => {
  const contact = { id: { _serialized: "222@lid" }, pushname: "Demo" };
  assert.equal(await resolveGroupMessageContact(group, async () => contact), contact);
});
test("contact metadata failure cannot bypass private owner authentication or missing author", async () => {
  for (const message of [{ ...group, from: "111@c.us" }, { ...group, author: "" }, { ...group, author: "111@g.us" }]) {
    await assert.rejects(resolveGroupMessageContact(message, async () => { throw Error("t: t"); }), /t: t/);
  }
});
test("wire IDs support normalized objects; LID never becomes a phone number", async () => {
  assert.equal(messageAuthorId({ author: { $1: "222@lid" } }), "222@lid");
  const c = await resolveGroupMessageContact({ ...group, author: "333@c.us" }, async () => null);
  assert.equal(c.number, "333");
  assert.equal(c.id._serialized, "333@c.us");
});
