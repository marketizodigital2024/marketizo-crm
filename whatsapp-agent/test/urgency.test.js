import test from "node:test";
import assert from "node:assert/strict";
import { hasOwnerMention, isAcknowledgement, likelyRequiresTeamReply, needsUrgentAnalysis } from "../src/urgency.js";

test("routine and acknowledgement messages do not call AI", () => {
  assert.equal(needsUrgentAnalysis("Hvala puno"), false);
  assert.equal(needsUrgentAnalysis("Video je spreman za pregled"), false);
  assert.equal(isAcknowledgement("Važi!"), true);
});

test("serious risks and owner mentions call AI", () => {
  assert.equal(needsUrgentAnalysis("Tražimo raskid i povraćaj novca"), true);
  assert.equal(needsUrgentAnalysis("Miljane, treba nam tvoja odluka"), true);
  assert.equal(hasOwnerMention("Ivana može li da odluči?"), true);
});

test("an open issue remains under AI review", () => {
  assert.equal(needsUrgentAnalysis("Imate li novosti?", { openIssue: { summary: "problem" } }), true);
});

test("reply tracking uses a local heuristic", () => {
  assert.equal(likelyRequiresTeamReply("Možete li proveriti kampanju?"), true);
  assert.equal(likelyRequiresTeamReply("Super, hvala"), false);
});
