const TABLE = process.env.SUPABASE_TABLE || "agency_crm_state";
const ROW_ID = process.env.CRM_STATE_ID || "marketizo-main";
const BACKUP_ID = "backup-daily-7";
const TARGET_DATE = "2026-09-03";

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

async function readRow(url, key, id) {
  const response = await fetch(`${url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}&select=payload,updated_at`, {
    headers: headers(key),
  });
  if (!response.ok) throw new Error(`Read failed (${response.status})`);
  return (await response.json())[0] || null;
}

function logSignature(log) {
  return [
    log.employeeId || "",
    log.date || "",
    Number(log.minutes || Math.round(Number(log.hours || 0) * 60)),
    log.activityId || "",
    log.activityName || "",
    log.clientId || "",
    log.clientName || "",
    log.note || "",
  ].join("|");
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return send(res, 405, { ok: false, error: "Method not allowed" });

  const url = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return send(res, 503, { ok: false, error: "Supabase is not configured" });

  try {
    const [mainRow, backupRow] = await Promise.all([
      readRow(url, key, ROW_ID),
      readRow(url, key, BACKUP_ID),
    ]);
    if (!mainRow?.payload) return send(res, 404, { ok: false, error: "Main state is empty" });
    if (!backupRow?.payload?.state) return send(res, 404, { ok: false, error: "Backup snapshot is missing" });
    if (backupRow.payload.backupDate !== TARGET_DATE) {
      return send(res, 409, { ok: false, error: `Backup slot contains ${backupRow.payload.backupDate || "unknown date"}, expected ${TARGET_DATE}` });
    }

    const current = JSON.parse(JSON.stringify(mainRow.payload));
    const backup = backupRow.payload.state;
    const currentLogs = Array.isArray(current.employeeWorkLogs) ? current.employeeWorkLogs : [];
    const backupLogs = (Array.isArray(backup.employeeWorkLogs) ? backup.employeeWorkLogs : []).filter((log) => log.date === TARGET_DATE);

    const currentIds = new Set(currentLogs.map((log) => log.id).filter(Boolean));
    const currentSignatures = new Set(currentLogs.filter((log) => log.date === TARGET_DATE).map(logSignature));
    const missingLogs = backupLogs.filter((log) => !currentIds.has(log.id) && !currentSignatures.has(logSignature(log)));

    if (!missingLogs.length) {
      return send(res, 200, {
        ok: true,
        restored: 0,
        backupDate: backupRow.payload.backupDate,
        backupLogsForDate: backupLogs.length,
        currentLogsForDate: currentLogs.filter((log) => log.date === TARGET_DATE).length,
        message: "No missing work logs found for target date",
      });
    }

    current.employeeWorkLogs = [...missingLogs, ...currentLogs];
    current.recoveryMarkers = Array.isArray(current.recoveryMarkers) ? current.recoveryMarkers : [];
    current.recoveryMarkers.push({
      type: "employee-hours",
      date: TARGET_DATE,
      restored: missingLogs.length,
      restoredAt: new Date().toISOString(),
      sourceBackup: BACKUP_ID,
    });

    const response = await fetch(`${url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(ROW_ID)}&updated_at=eq.${encodeURIComponent(mainRow.updated_at)}&select=updated_at`, {
      method: "PATCH",
      headers: headers(key, "return=representation"),
      body: JSON.stringify({ payload: current, updated_at: new Date().toISOString() }),
    });
    if (!response.ok) throw new Error(`Restore write failed (${response.status})`);
    const updatedRows = await response.json();
    if (!updatedRows.length) return send(res, 409, { ok: false, error: "State changed during restore. Retry once." });

    const byEmployee = missingLogs.reduce((acc, log) => {
      acc[log.employeeId || "unknown"] = (acc[log.employeeId || "unknown"] || 0) + Number(log.minutes || Math.round(Number(log.hours || 0) * 60));
      return acc;
    }, {});

    return send(res, 200, {
      ok: true,
      restored: missingLogs.length,
      backupDate: backupRow.payload.backupDate,
      restoredMinutesByEmployee: byEmployee,
    });
  } catch (error) {
    return send(res, 500, { ok: false, error: error?.message || "Recovery failed" });
  }
};
