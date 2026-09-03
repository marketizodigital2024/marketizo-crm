const LEVELS = new Set(["GREEN", "YELLOW", "RED", "URGENT"]);

export async function analyzeMessage(openai, model, input) {
  const response = await openai.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    temperature: 0,
    messages: [
      {
        role: "system",
        content: [
          "You monitor WhatsApp client groups for Marketizo, a marketing agency.",
          "Classify the latest message using GREEN, YELLOW, RED, or URGENT.",
          "GREEN: normal operations. YELLOW: delay, unanswered concern, or mild dissatisfaction.",
          "RED: serious dissatisfaction, repeated failure, churn risk, money/results dispute.",
          "URGENT: immediate legal, safety, public-reputation, account-security, or same-day crisis.",
          "Set notifyOwner=true only for something Miljan as owner genuinely needs in real time: RED/URGENT risk, cancellation/refund/payment/legal/reputation/security issue, repeated unresolved failure, explicit request for Miljan/owner, or exceptional praise such as a testimonial, referral, or major result.",
          "Set notifyOwner=false for routine SMM work, normal questions, scheduling, approvals, content revisions, ordinary delays, mild dissatisfaction that the team can resolve, and generic thanks or compliments.",
          "Do not draft or send a client reply.",
          "Set isPraise=true only when the message contains an explicit compliment, thanks, satisfaction, or positive feedback.",
          "Return JSON only: level, summary, reason, recommendedAction, isPraise, notifyOwner, ownerReason.",
          "Write summary, reason, and recommendedAction in Serbian."
        ].join(" ")
      },
      {
        role: "user",
        content: JSON.stringify(input)
      }
    ]
  });

  const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
  const level = String(parsed.level || "GREEN").toUpperCase();

  return {
    level: LEVELS.has(level) ? level : "GREEN",
    summary: String(parsed.summary || "Nema sazetka."),
    reason: String(parsed.reason || ""),
    recommendedAction: String(parsed.recommendedAction || ""),
    isPraise: parsed.isPraise === true,
    notifyOwner: parsed.notifyOwner === true,
    ownerReason: String(parsed.ownerReason || "")
  };
}

export async function analyzeFollowup(openai, model, input) {
  const response = await openai.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    temperature: 0,
    messages: [
      {
        role: "system",
        content: [
          "You track unresolved client issues and explicit delivery commitments in Marketizo WhatsApp groups.",
          "Use the recent conversation, the currently open issue, and the latest message.",
          "issueAction must be NONE, OPEN, KEEP_OPEN, or RESOLVE.",
          "OPEN only when a client reports a concrete problem or dissatisfaction that needs action.",
          "RESOLVE only when the conversation provides real evidence that the problem was fixed or the client accepted the solution. A team reply or promise alone is not resolution.",
          "KEEP_OPEN when the issue continues, is merely acknowledged, or is awaiting work/client confirmation.",
          "For a new explicit promise with a clear date or time, set commitment=true and return commitmentSummary, commitmentOwner, and commitmentDueAt as an ISO 8601 timestamp with timezone.",
          "Do not create a commitment from vague wording such as soon, later, or we will check. Set commitment=false when there is no clear deadline.",
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
