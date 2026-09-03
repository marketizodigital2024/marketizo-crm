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
          "Do not draft or send a client reply.",
          "Set isPraise=true only when the message contains an explicit compliment, thanks, satisfaction, or positive feedback.",
          "Return JSON only: level, summary, reason, recommendedAction, isPraise.",
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
    isPraise: parsed.isPraise === true
  };
}
