export function buildReasoningOptions(model, reasoningEffort) {
  return /^gpt-(?:5|6)(?:[.-]|$)/i.test(String(model))
    ? { reasoning_effort: reasoningEffort }
    : { temperature: 0 };
}
