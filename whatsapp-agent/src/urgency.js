const NORMALIZED_ACKNOWLEDGEMENTS = new Set([
  "ok", "okej", "okay", "vazi", "super", "hvala", "hvala puno", "dogovoreno",
  "u redu", "moze", "odlicno", "top", "jasno"
]);

export function normalizedText(value) {
  return String(value || "")
    .toLocaleLowerCase("sr-Latn")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function isAcknowledgement(value) {
  return NORMALIZED_ACKNOWLEDGEMENTS.has(normalizedText(value));
}

export function hasOwnerMention(value) {
  return /\b(miljan\w*|ivana\w*|vlasnik\w*|gazda|direktor\w*|owner|sef\w*)\b/i.test(normalizedText(value));
}

export function needsUrgentAnalysis(value, context = {}) {
  const text = normalizedText(value);
  if (!text || isAcknowledgement(text)) return false;
  if (context.openIssue || context.activeCommitment || hasOwnerMention(text)) return true;

  return /\b(otkaz|raskid|prekid saradnje|refund|povracaj|vratite novac|necu platiti|ne placam|advokat|tuz|polic|prevar|hak|lozink|nalog blokiran|javno|recenzij|medij|bezbednost|sigurnost|hitno|odmah|danas mora|katastrof|skandal|nezadovolj|razocaran|izgubili poverenje|nikad vise|opet isti problem|ponovo isti problem|kasni|probijen rok|nema lead|nema lid|leadovi ne rade|kampanja ne radi|budzet potrosen|garancij|30 lead|30 lid|prodaja pala|racun suspendovan)\b/i.test(text);
}

export function likelyRequiresTeamReply(value) {
  const text = normalizedText(value);
  if (!text || isAcknowledgement(text)) return false;
  return /\?|\b(molim|mozete|moze li|kada|kad ce|gde|zasto|treba|potrebno|poslati|proverite|javite|odgovor|pomoc)\b/i.test(String(value || ""));
}
