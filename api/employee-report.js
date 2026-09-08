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
    if (body.action === "acknowledge") {
      const reportId = String(body.reportId || "");
      const leaderId = String(body.leaderId || "");
      if (!reportId || !leaderId) return json(res, 400, { ok: false, error: "Nedostaje izveštaj ili lider." });
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const row = await readRow(url, key);
        if (!row) return json(res, 404, { ok: false, error: "Glavni zapis baze nije pronađen." });
        const payload = JSON.parse(JSON.stringify(row.payload || {}));
        const leader = (payload.employees || []).find((item) => item.id === leaderId && item.status !== "Neaktivan" && item.isLeader);
        const report = (payload.employeeReports || []).find((item) => item.id === reportId && item.isFinalDailyReport === true);
        const reportEmployee = (payload.employees || []).find((item) => item.id === report?.employeeId);
        if (!leader || !report || (report.recipientId !== leaderId && reportEmployee?.leaderId !== leaderId)) {
          return json(res, 403, { ok: false, error: "Ovaj izveštaj nije dodeljen tom lideru." });
        }
        report.acknowledgedAt = new Date().toISOString();
        report.acknowledgedBy = leaderId;
        const updatedAt = new Date().toISOString();
        const response = await fetch(`${url}/rest/v1/${tableName}?id=eq.${encodeURIComponent(rowId)}&updated_at=eq.${encodeURIComponent(row.updated_at)}&select=updated_at`, {
          method: "PATCH",
          headers: headers(key, "return=representation"),
          body: JSON.stringify({ payload, updated_at: updatedAt }),
        });
        if (!response.ok) throw new Error(`Potvrda izveštaja nije uspela (${response.status}).`);
        const updatedRows = await response.json();
        if (updatedRows.length) return json(res, 200, { ok: true, report, updatedAt });
      }
      return json(res, 409, { ok: false, error: "Baza je trenutno zauzeta drugim upisima. Pokušaj ponovo." });
    }
    const employeeId = String(body.employeeId || "");
    const date = String(body.date || "");
    const note = String(body.note || "").trim().slice(0, 1200);
    const positive = String(body.positive || "").trim().slice(0, 800);
    const negative = String(body.negative || "").trim().slice(0, 800);
    if (!employeeId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !note) {
      return json(res, 400, { ok: false, error: "Nedostaje datum ili kratak rezime dana." });
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const row = await readRow(url, key);
      if (!row) return json(res, 404, { ok: false, error: "Glavni zapis baze nije pronađen." });
      const payload = JSON.parse(JSON.stringify(row.payload || {}));
      const employee = (payload.employees || []).find((item) => item.id === employeeId && item.status !== "Neaktivan");
      if (!employee) return json(res, 400, { ok: false, error: "Zaposleni nije pronađen ili nalog nije aktivan." });
      const minutes = (payload.employeeWorkLogs || [])
        .filter((log) => log.employeeId === employeeId && log.date === date)
        .reduce((sum, log) => sum + Number(log.minutes || Number(log.hours || 0) * 60), 0);
      payload.employeeReports = Array.isArray(payload.employeeReports) ? payload.employeeReports : [];
      let report = payload.employeeReports.find((item) => item.employeeId === employeeId && item.date === date && item.isFinalDailyReport === true);
      const now = new Date().toISOString();
      if (report) {
        Object.assign(report, { recipientId: body.recipientId || employee.leaderId || "", minutes, hours: Math.round((minutes / 60) * 10000) / 10000, note, positive, negative, updatedAt: now });
      } else {
        report = {
          id: `daily-report-${employeeId}-${date}`,
          employeeId,
          recipientId: body.recipientId || employee.leaderId || "",
          date,
          title: "Dnevni izveštaj za lidera",
          activityName: "Završni dnevni izveštaj",
          minutes,
          hours: Math.round((minutes / 60) * 10000) / 10000,
          note,
          positive,
          negative,
          isFinalDailyReport: true,
          createdAt: now,
        };
        payload.employeeReports.unshift(report);
      }
      const updatedAt = new Date().toISOString();
      const response = await fetch(`${url}/rest/v1/${tableName}?id=eq.${encodeURIComponent(rowId)}&updated_at=eq.${encodeURIComponent(row.updated_at)}&select=updated_at`, {
        method: "PATCH",
        headers: headers(key, "return=representation"),
        body: JSON.stringify({ payload, updated_at: updatedAt }),
      });
      if (!response.ok) throw new Error(`Čuvanje izveštaja nije uspelo (${response.status}).`);
      const updatedRows = await response.json();
      if (updatedRows.length) return json(res, 200, { ok: true, report, updatedAt });
    }
    return json(res, 409, { ok: false, error: "Baza je trenutno zauzeta drugim upisima. Pokušaj ponovo." });
  } catch (error) {
    return json(res, 500, { ok: false, error: error?.message || "Čuvanje izveštaja nije uspelo." });
  }
};
