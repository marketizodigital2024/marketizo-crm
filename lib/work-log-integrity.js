"use strict";

// A row-count check cannot detect a serializer dropping fields on every row.
// Preserve legacy rows as-is, but never let a populated association disappear.
const fields = ["activityId", "activityName", "activityCategory", "clientId", "clientName"];
const text = value => String(value ?? "").trim();

function metadataLoss(previous, desired) {
  const logs = new Map((desired.employeeWorkLogs || []).map(log => [log.id, log]));
  const activities = new Map((desired.employeeActivities || []).map(activity => [activity.id, activity]));
  const losses = [];
  for (const before of previous.employeeWorkLogs || []) {
    const after = logs.get(before.id);
    if (!after) continue; // Explicit row deletion has its own authorization/shrink guard.
    const activity = activities.get(after.activityId);
    const internal = activity && text(activity.category).toLowerCase() === "interno"
      && after.activityName === activity.name && after.activityCategory === activity.category;
    for (const field of fields) {
      if (field.startsWith("client") && internal) continue;
      if (text(before[field]) && !text(after[field])) losses.push({ id: before.id, field });
    }
    if (text(before.activityId) && before.activityId !== after.activityId && !activity) losses.push({ id: before.id, field: "activityId" });
    if (text(before.activityId) && activity) {
      if ((before.activityId !== after.activityId || before.activityName !== after.activityName) && after.activityName !== activity.name) losses.push({ id: before.id, field: "activityName" });
      if ((before.activityId !== after.activityId || before.activityCategory !== after.activityCategory) && after.activityCategory !== activity.category) losses.push({ id: before.id, field: "activityCategory" });
    }
  }
  return [...new Map(losses.map(item => [JSON.stringify([item.id, item.field]), item])).values()];
}

// Apply prospectively. Unchanged incomplete historical rows must not block
// another employee's save or force a guessed historical client assignment.
function missingWorkLogAssociations(previous, desired) {
  const existing = new Map((previous.employeeWorkLogs || []).map(log => [log.id, log]));
  const activities = new Map((desired.employeeActivities || []).map(a => [a.id, a]));
  const clients = new Map((desired.clients || []).map(c => [c.id, c]));
  const invalid = [];
  for (const log of desired.employeeWorkLogs || []) {
    const before = existing.get(log.id);
    const activity = activities.get(log.activityId);
    const descriptionChanged = !before || before.activityId !== log.activityId || before.note !== log.note;
    if (descriptionChanged && activity && ["ostalo", "druge aktivnosti"].includes(text(activity.category || "Ostalo").toLowerCase()) && !text(log.note)) {
      invalid.push({ id: log.id, field: "note" });
    }
    if (before) continue;
    if (!activity || activity.active === false || !text(activity.name)
      || log.activityName !== activity.name || log.activityCategory !== (activity.category || "Ostalo")) {
      invalid.push({ id: log.id, field: "activityId" });
      continue;
    }
    if (text(activity.category).toLowerCase() === "interno") continue;
    const client = clients.get(log.clientId);
    if (!text(log.clientId) || !client || !text(client.name) || client.status === "Arhiviran"
      || log.clientName !== client.name) invalid.push({ id: log.id, field: "clientId" });
  }
  return invalid;
}

module.exports = { metadataLoss, missingWorkLogAssociations };
