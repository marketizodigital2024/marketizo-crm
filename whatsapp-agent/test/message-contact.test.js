import test from "node:test";
import assert from "node:assert/strict";
import { messageAuthorId, resolveGroupMessageContact } from "../src/message-contact.js";

const group = { from: "111@g.us", author: "222@lid" };
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
