export function validateReview(groups, review) {
  const expected = new Set(groups);
  const reviewed = new Set(Array.isArray(review.reviewedGroups) ? review.reviewedGroups : []);
  if (reviewed.size !== expected.size || [...expected].some(name => !reviewed.has(name))) {
    throw Error('Daily review omitted or invented a group; retrying this batch');
  }
  const alerts = Array.isArray(review.alerts) ? review.alerts : [];
  const seen = new Set();
  for (const alert of alerts) {
    if (!expected.has(alert.group) || seen.has(alert.group)) throw Error('Daily review contains unknown or repeated group');
    seen.add(alert.group);
    if (!['URGENT', 'RED', 'YELLOW', 'PRAISE'].includes(alert.severity)) throw Error('Invalid report severity');
    if (typeof alert.summary !== 'string' || !alert.summary.trim() || alert.summary.length > 1000) throw Error('Invalid report summary');
    if (String(alert.nextAction || '').length > 500) throw Error('Report action exceeds limit');
    if (String(alert.evidence || '').length > 500) throw Error('Report evidence exceeds limit');
  }
  return alerts;
}

export function renderDailyReport({ date, reviewedCount, groupCount, alerts, coverage }) {
  const symbols = { URGENT: '🔴 Hitno', RED: '🔴 Rizik', YELLOW: '🟡 Potrebna pažnja', PRAISE: '🟢 Važna pohvala' };
  const header = `*DNEVNI PREGLED — ${date}*\nPregledano ${reviewedCount}/${groupCount} grupa. ClickUp dodela: ${coverage.matchedGroups}/${coverage.clientGroups}.`;
  const warnings = [];
  if (coverage.unmappedActiveClients?.length) warnings.push(`Aktivni klijenti bez potvrđene grupe: ${coverage.unmappedActiveClients.join(', ')}.`);
  if (!coverage.clickupFresh) warnings.push('ClickUp dodele nisu sveže potvrđene; poslednja poznata raspodela može biti zastarela.');
  if (coverage.unmatchedGroups.length) warnings.push(`Nepovezane grupe (${coverage.unmatchedGroups.length}): ${coverage.unmatchedGroups.join(', ')}.`);
  if (coverage.unreadableGroups.length) warnings.push(`Čitanje nije potvrđeno za: ${coverage.unreadableGroups.join(', ')}.`);
  if (coverage.historyGapGroups.length) warnings.push(`Moguća rupa u istoriji za: ${coverage.historyGapGroups.join(', ')}.`);
  const overview = [header, ...warnings, alerts.length ? `${alerts.length} klijenata zahteva pažnju ili ima važan pozitivan signal.` : 'U pročitanim porukama nema potvrđenog problema koji traži tvoju intervenciju.'].join('\n\n');
  const paragraphs = alerts.map(alert => [
    `*${alert.group}* — ${symbols[alert.severity]}`,
    alert.summary,
    alert.nextAction ? `*Sledeći korak:* ${alert.nextAction}` : '',
    alert.evidence ? `*Osnov:* ${alert.evidence}` : ''
  ].filter(Boolean).join('\n\n'));
  const combined = [overview, ...paragraphs].join('\n\n');
  if (combined.length <= 3500) return [combined];
  // Whole clients stay in one message; never split one client into short fragments.
  if (overview.length > 3500) throw Error('Coverage summary too long to send without truncation');
  return [overview, ...paragraphs];
}
