const tableName = process.env.SUPABASE_TABLE || "agency_crm_state";
const rowId = process.env.CRM_STATE_ID || "marketizo-main";

function json(res, status, payload) {
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

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function readRow(url, key) {
  const response = await fetch(`${url}/rest/v1/${tableName}?id=eq.${encodeURIComponent(rowId)}&select=payload,updated_at`, {
    headers: headers(key),
  });
  if (!response.ok) throw new Error(`Čitanje baze nije uspelo (${response.status}).`);
  return (await response.json())[0] || null;
}

function appendText(current, next) {
  return [current, next].map((value) => String(value || "").trim()).filter(Boolean).join(" | ");
}

function updateDailyReport(payload, workLog, recipientId) {
  payload.employeeReports = Array.isArray(payload.employeeReports) ? payload.employeeReports : [];
  const minutes = Number(workLog.minutes || Math.round(Number(workLog.hours || 0) * 60));
  const report = payload.employeeReports.find((item) => item.employeeId === workLog.employeeId && item.date === workLog.date);
  if (report) {
    report.minutes = Number(report.minutes || Number(report.hours || 0) * 60) + minutes;
    report.hours = Math.round((report.minutes / 60) * 10000) / 10000;
    report.activityName = "Dnevni zbir aktivnosti";
    report.note = appendText(report.note, workLog.note);
    report.positive = appendText(report.positive, workLog.positive);
    report.negative = appendText(report.negative, workLog.negative);
    report.updatedAt = new Date().toISOString();
    return;
  }
  payload.employeeReports.unshift({
    id: `report-${workLog.id}`,
    employeeId: workLog.employeeId,
    recipientId: recipientId || "",
    date: workLog.date,
    title: "Dnevni izveštaj",
    hours: Math.round((minutes / 60) * 10000) / 10000,
    minutes,
    activityId: workLog.activityId || "",
    activityName: workLog.activityName || "Aktivnost",
    activityCategory: workLog.activityCategory || "Ostalo",
    clientId: workLog.clientId || "",
    clientName: workLog.clientName || "",
    positive: workLog.positive || "",
    negative: workLog.negative || "",
    note: workLog.note || "",
    createdAt: new Date().toISOString(),
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return json(res, 200, { ok: true });
  if (req.method !== "POST") return json(res, 405, { ok: false, error: "Metod nije podržan." });

  const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return json(res, 503, { ok: false, error: "Online baza nije povezana." });

  try {
    const body = await readBody(req);
    const workLog = body.workLog;
    if (!workLog?.id || !workLog?.employeeId || !workLog?.date || !workLog?.activityName || Number(workLog?.minutes || 0) < 1) {
      return json(res, 400, { ok: false, error: "Nedostaju obavezni podaci aktivnosti." });
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const row = await readRow(url, key);
      if (!row) return json(res, 404, { ok: false, error: "Glavni zapis baze nije pronađen." });
      const payload = JSON.parse(JSON.stringify(row.payload || {}));
      payload.employeeWorkLogs = Array.isArray(payload.employeeWorkLogs) ? payload.employeeWorkLogs : [];
      if (payload.employeeWorkLogs.some((item) => item.id === workLog.id)) {
        return json(res, 200, { ok: true, duplicate: true, workLogId: workLog.id });
      }
      payload.employeeWorkLogs.unshift(workLog);
      if (body.updateReport !== false) updateDailyReport(payload, workLog, body.recipientId);

      const updatedAt = new Date().toISOString();
      const response = await fetch(`${url}/rest/v1/${tableName}?id=eq.${encodeURIComponent(rowId)}&updated_at=eq.${encodeURIComponent(row.updated_at)}&select=updated_at`, {
        method: "PATCH",
        headers: headers(key, "return=representation"),
        body: JSON.stringify({ payload, updated_at: updatedAt }),
      });
      if (!response.ok) throw new Error(`Upis aktivnosti nije uspeo (${response.status}).`);
      const updatedRows = await response.json();
      if (updatedRows.length) return json(res, 200, { ok: true, workLogId: workLog.id, updatedAt });
    }
    return json(res, 409, { ok: false, error: "Baza je trenutno zauzeta drugim upisima. Pokušaj ponovo." });
  } catch (error) {
    return json(res, 500, { ok: false, error: error?.message || "Upis aktivnosti nije uspeo." });
  }
};
