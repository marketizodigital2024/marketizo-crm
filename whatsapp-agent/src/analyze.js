const LEVELS = new Set(["GREEN", "YELLOW", "RED", "URGENT"]);

function reasoningOptions(model) {
  return String(model).startsWith("gpt-6")
    ? { reasoning_effort: process.env.OPENAI_REASONING_EFFORT || "xhigh" }
    : { temperature: 0 };
}

async function requestAnalysis(openai, model, systemPrompt, input) {
  const response = await openai.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    ...reasoningOptions(model),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: JSON.stringify(input) }
    ]
  });
  return JSON.parse(response.choices[0]?.message?.content || "{}");
}

function needsSeniorJudgment(input, firstPass) {
  const text = String(input.message || "").toLocaleLowerCase("sr-Latn");
  const consequentialLanguage = /\b(otkaz|raskid|refund|povra[cć]|novac|plat|advokat|tu[zž]|polic|prevar|hak|lozink|javno|recenzij|nezadovolj|razo[cč]aran|katastrof|nikad|opet|ponovo|kasni|rok|lead|kampanj|bud[zž]et|miljan|ivana|vlasnik|direktor)\b/i.test(text);
  const ambiguousTone = /[?!]{2,}|\b(ali|ipak|stvarno|iskreno|na[zž]alost|ne razumem|nije jasno|o[cč]ekiv)\b/i.test(text);
  return firstPass.level !== "GREEN"
    || firstPass.notifyOwner === true
    || firstPass.isPraise === true
    || Boolean(input.openIssue)
    || Boolean(input.activeCommitment)
    || consequentialLanguage
    || ambiguousTone;
}

const MESSAGE_PROMPT = [
  "You monitor WhatsApp client groups for Marketizo, a marketing agency.",
  "Act as an experienced agency operating director, not as a keyword classifier. Infer what the situation means for the client relationship, delivery quality, team accountability, cash, reputation, lead guarantee, and the owners' ability to intervene effectively.",
  "Use judgment across the full supplied context. Consider changes in tone, repeated patterns, expectation gaps, hidden dependencies, whether the named owner can realistically fix the issue, and whether the team's current recovery plan is credible and timely.",
  "The three levels YELLOW, RED and URGENT describe consequence and urgency only. They are not a checklist and must never replace contextual judgment. GREEN means no material concern.",
  "Ask internally: if Miljan knew this now, would it materially change a decision, priority, person he contacts, or risk he accepts? Notify him when the answer is yes, even if no exact keyword rule matches. Do not notify him when the team clearly owns the issue and has a credible resolution already underway before meaningful harm occurs.",
  "Classify the latest message using GREEN, YELLOW, RED, or URGENT.",
  "GREEN: normal operations. YELLOW: delay, unanswered concern, or mild dissatisfaction. RED: serious dissatisfaction, repeated failure, churn risk, money/results dispute. URGENT: immediate legal, safety, public-reputation, account-security, or same-day crisis.",
  "Use a strict owner-escalation threshold. Set notifyOwner=true only when at least one condition is supported by evidence in the supplied conversation: the same or substantially similar unresolved problem has occurred at least three separate times; the client shows serious dissatisfaction or loss of trust; cancellation, refund, non-payment, legal, public-reputation, security, campaign-results or 30-lead-guarantee risk is raised; the client explicitly needs a decision from Miljan or Ivana that the team cannot make; or there is exceptional praise such as a testimonial, referral, confirmed sale, major measurable result, or unusually strong praise of the agency/team.",
  "A first or second operational occurrence is not an owner alert unless its consequence is independently severe. Never count repeated sentences inside one exchange as three occurrences. If claiming repetition, state the three separate occurrences visible in recentConversation/openIssue; otherwise set notifyOwner=false.",
  "Set notifyOwner=false for anything the team can reasonably solve without Miljan: routine SMM work, normal questions, scheduling, approvals, content revisions, ordinary delays, a client waiting for a reply, a client not replying, a missed internal commitment, first/second technical issue, mild dissatisfaction, and generic thanks or compliments. Keep recording these for the daily report even when they are not real-time alerts.",
  "Judge the latest message in the supplied recentConversation and openIssue context. A short follow-up, joke, emoji, thanks, or acknowledgement does not erase an unresolved RED issue; only concrete evidence of resolution does.",
  "The summary must state the specific event, complaint, failed deliverable, disputed result, or business risk. Never use vague labels.",
  "The ownerReason must explain the concrete business impact. recommendedAction must say who should do what next; do not use generic advice.",
  "Set requiresTeamReply=false when the client is merely confirming, acknowledging, agreeing, thanking, reacting positively, or closing the conversation. Set it true only when the message reasonably expects a team response.",
  "Do not draft or send a client reply. Set isPraise=true only for explicit meaningful positive feedback.",
  "Return JSON only: level, summary, reason, recommendedAction, isPraise, notifyOwner, ownerReason, requiresTeamReply.",
  "Write summary, reason, and recommendedAction in natural Serbian."
].join(" ");

export async function analyzeMessage(openai, routineModel, smartModel, input) {
  const firstPass = await requestAnalysis(openai, routineModel, MESSAGE_PROMPT, input);
  const useSeniorJudgment = smartModel !== routineModel && needsSeniorJudgment(input, firstPass);
  const parsed = useSeniorJudgment
    ? await requestAnalysis(openai, smartModel, `${MESSAGE_PROMPT} You are the senior final judge. Reconsider the first-pass assessment; do not rubber-stamp it. Prefer the conclusion best supported by the full conversation and business consequences.`, { ...input, firstPass })
    : firstPass;
  const level = String(parsed.level || "GREEN").toUpperCase();

  return {
    level: LEVELS.has(level) ? level : "GREEN",
    summary: String(parsed.summary || "Nema sazetka."),
    reason: String(parsed.reason || ""),
    recommendedAction: String(parsed.recommendedAction || ""),
    isPraise: parsed.isPraise === true,
    notifyOwner: parsed.notifyOwner === true,
    ownerReason: String(parsed.ownerReason || ""),
    requiresTeamReply: parsed.requiresTeamReply === true,
    judgedBy: useSeniorJudgment ? smartModel : routineModel
  };
}

export async function analyzeFollowup(openai, model, input) {
  const response = await openai.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    ...reasoningOptions(model),
    messages: [
      {
        role: "system",
        content: [
          "You track unresolved client issues and explicit delivery commitments in Marketizo WhatsApp groups.",
          "Reason like an experienced agency operations director. Reconstruct the actual state of the work from the conversation, distinguish evidence from optimistic wording, and identify the operational consequence of ambiguity or delay.",
          "Use the recent conversation, the currently open issue, and the latest message.",
          "issueAction must be NONE, OPEN, KEEP_OPEN, or RESOLVE.",
          "OPEN only when a client reports a concrete problem or dissatisfaction that needs action.",
          "RESOLVE only when the conversation provides real evidence that the problem was fixed or the client accepted the solution. A team reply or promise alone is not resolution.",
          "KEEP_OPEN when the issue continues, is merely acknowledged, or is awaiting work/client confirmation.",
          "Create a commitment only when source is team and a team member explicitly promises a future action with a clear delivery date or time. Return commitmentSummary, commitmentOwner, and commitmentDueAt as an ISO 8601 timestamp with timezone.",
          "A link, video, post, script, or other deliverable already attached or sent is evidence of delivery, not a future commitment. Wording such as 'video za ponedeljak', 'post za sledeću nedelju', a planned publication date, or a content title/date describes intended use and must not become a delivery deadline.",
          "Do not create a commitment from a client message, vague wording such as soon/later/we will check, or a date that belongs to content scheduling rather than a promised team action. Set commitment=false in those cases.",
          "If a promise names only a date and no time, use 17:30 Europe/Vienna on that date, never midnight.",
          "Set commitmentCompleted=true only when the latest message clearly confirms delivery/completion of the current commitment.",
          "Return JSON only: issueAction, issueSummary, resolutionEvidence, commitment, commitmentSummary, commitmentOwner, commitmentDueAt, commitmentCompleted.",
          "Write summaries and evidence in Serbian."
        ].join(" ")
      },
      { role: "user", content: JSON.stringify(input) }
    ]
  });
  const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
  const action = String(parsed.issueAction || "NONE").toUpperCase();
  return {
    issueAction: ["NONE", "OPEN", "KEEP_OPEN", "RESOLVE"].includes(action) ? action : "NONE",
    issueSummary: String(parsed.issueSummary || ""),
    resolutionEvidence: String(parsed.resolutionEvidence || ""),
    commitment: parsed.commitment === true,
    commitmentSummary: String(parsed.commitmentSummary || ""),
    commitmentOwner: String(parsed.commitmentOwner || ""),
    commitmentDueAt: String(parsed.commitmentDueAt || ""),
    commitmentCompleted: parsed.commitmentCompleted === true
  };
}
