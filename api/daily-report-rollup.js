const TABLE = process.env.SUPABASE_TABLE || "agency_crm_state";
const ROW_ID = process.env.CRM_STATE_ID || "marketizo-main";

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function headers(key, prefer = "") {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

function viennaParts(date = new Date()) {
  return Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vienna", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date).map(({ type, value }) => [type, value]));
}

function expectedMinutes(employee, date) {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  if (day < 1 || day > 5) return 0;
  const month = date.slice(0, 7);
  const weeklyHours = Number(employee.weeklyHoursByMonth?.[month] ?? employee.weeklyHours ?? 38.5);
  // Full-time target is 38.5h: 8h Monday-Thursday and 6.5h Friday.
  if (weeklyHours >= 38) return day === 5 ? 390 : 480;
  return Math.round((weeklyHours * 60) / 5);
}

function summarizeLogs(logs) {
  if (!logs.length) return "Nema upisanih aktivnosti do 17:30.";
  const grouped = new Map();
  logs.forEach((log) => {
    const activity = String(log.activityName || "Aktivnost");
    const client = String(log.clientName || "Bez klijenta");
    const key = `${activity} · ${client}`;
    grouped.set(key, (grouped.get(key) || 0) + Number(log.minutes || Number(log.hours || 0) * 60));
  });
  return [...grouped.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, minutes]) => `${label}: ${Math.round(minutes)} min`)
    .join("; ");
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  const secret = process.env.CRON_SECRET || "";
  if (!secret || String(req.headers.authorization || "") !== `Bearer ${secret}`) return send(res, 401, { error: "Unauthorized" });
  const url = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return send(res, 503, { error: "Supabase is not configured" });

  const now = new Date();
  const parts = viennaParts(now);
  const date = String(req.query?.date || `${parts.year}-${parts.month}-${parts.day}`);
  const dryRun = String(req.query?.dryRun || "") === "1";
  const scheduledInvocation = String(req.headers["user-agent"] || "").includes("vercel-cron");
  if (scheduledInvocation && !dryRun && `${parts.hour}:${parts.minute}` !== "17:30") {
    return send(res, 200, { ok: true, skipped: true, reason: "Not 17:30 in Vienna", localTime: `${parts.hour}:${parts.minute}` });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return send(res, 400, { error: "Invalid date" });

  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const sourceResponse = await fetch(`${url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(ROW_ID)}&select=payload,updated_at`, { headers: headers(key) });
      if (!sourceResponse.ok) throw new Error(`State fetch failed (${sourceResponse.status})`);
      const source = (await sourceResponse.json())[0];
      if (!source?.payload) return send(res, 404, { error: "Main state is empty" });
      const payload = JSON.parse(JSON.stringify(source.payload));
      payload.employeeReports = Array.isArray(payload.employeeReports) ? payload.employeeReports : [];
      const activeEmployees = (payload.employees || []).filter((employee) => employee.status !== "Neaktivan" && (!employee.startDate || employee.startDate <= date));
      const created = [];
      const updated = [];

      for (const employee of activeEmployees) {
        const expected = expectedMinutes(employee, date);
        if (!expected) continue;
        const absent = (payload.employeeAbsences || []).some((absence) =>
          absence.employeeId === employee.id && absence.status === "Odobreno" && date >= absence.startDate && date <= absence.endDate
        );
        if (absent) continue;
        const logs = (payload.employeeWorkLogs || []).filter((log) => log.employeeId === employee.id && log.date === date);
        const minutes = Math.round(logs.reduce((sum, log) => sum + Number(log.minutes || Number(log.hours || 0) * 60), 0));
        const autoNote = summarizeLogs(logs);
        const existing = payload.employeeReports.find((report) => report.employeeId === employee.id && report.date === date && report.isFinalDailyReport === true);
        const recipientId = employee.isLeader ? "admin" : (employee.leaderId || "admin");
        if (existing) {
          existing.minutes = minutes;
          existing.hours = Math.round((minutes / 60) * 10000) / 10000;
          existing.recipientId = existing.recipientId || recipientId;
          existing.expectedMinutes = expected;
          existing.missingMinutes = Math.max(0, expected - minutes);
          existing.autoSummary = autoNote;
          existing.rollupUpdatedAt = now.toISOString();
          updated.push(employee.id);
          continue;
        }
        payload.employeeReports.unshift({
          id: `daily-report-${employee.id}-${date}`,
          employeeId: employee.id,
          recipientId,
          date,
          title: "Automatski dnevni presek u 17:30",
          activityName: "Dnevni presek rada",
          minutes,
          hours: Math.round((minutes / 60) * 10000) / 10000,
          expectedMinutes: expected,
          missingMinutes: Math.max(0, expected - minutes),
          note: autoNote,
          autoSummary: autoNote,
          positive: "",
          negative: minutes < expected ? `Nedostaje ${expected - minutes} min do dnevne kvote.` : "",
          isFinalDailyReport: true,
          isAutomaticRollup: true,
          createdAt: now.toISOString(),
        });
        created.push(employee.id);
      }

      if (dryRun) return send(res, 200, { ok: true, dryRun: true, date, created: created.length, updated: updated.length, employeeIds: [...created, ...updated] });
      const updatedAt = now.toISOString();
      const saveResponse = await fetch(`${url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(ROW_ID)}&updated_at=eq.${encodeURIComponent(source.updated_at)}&select=updated_at`, {
        method: "PATCH",
        headers: headers(key, "return=representation"),
        body: JSON.stringify({ payload, updated_at: updatedAt }),
      });
      if (!saveResponse.ok) throw new Error(`Rollup save failed (${saveResponse.status})`);
      const saved = await saveResponse.json();
      if (saved.length) return send(res, 200, { ok: true, date, created: created.length, updated: updated.length, updatedAt });
    }
    return send(res, 409, { error: "State changed during rollup; retry later" });
  } catch (error) {
    return send(res, 500, { error: error?.message || "Daily rollup failed" });
  }
};
