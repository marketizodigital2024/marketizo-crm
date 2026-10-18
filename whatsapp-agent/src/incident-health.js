/** Aggregate incident types only: never publish group IDs, names, messages or incident summaries. */
export function incidentHealth(incidents = {}) {
  const counts = { processing: 0, reports: 0, coverage: 0, roster: 0, other: 0 };
  for (const incident of Object.values(incidents)) {
    if (!incident || incident.resolvedAt) continue;
    const type = String(incident.key || "").split(":")[0];
    if (type === "processing") counts.processing += 1;
    else if (type === "daily-report") counts.reports += 1;
    else if (["active-client-groups", "group-mapping", "new-group", "new-group-sync"].includes(type)) counts.coverage += 1;
    else if (type === "team-roster") counts.roster += 1;
    else counts.other += 1;
  }
  return counts;
}
