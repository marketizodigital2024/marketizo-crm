const TABLE = process.env.SUPABASE_TABLE || "agency_crm_state";
const ROW_ID = process.env.CRM_STATE_ID || "marketizo-main";
const BACKUP_SLOTS = 30;

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

function viennaTime(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Vienna", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return send(res, 405, { error: "Method not allowed" });

  const url = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return send(res, 503, { error: "Supabase is not configured" });

  if (String(req.query?.inspect || "") === "1") {
    try {
      const response = await fetch(`${url}/rest/v1/${TABLE}?id=like.backup-*&select=id,payload,updated_at&order=updated_at.desc`, {
        headers: headers(key),
      });
      if (!response.ok) throw new Error(`Backup list failed (${response.status})`);
      const rows = await response.json();
      return send(res, 200, {
        ok: true,
        backups: rows.map((row) => {
          const state = row.payload?.state || {};
          const logs = Array.isArray(state.employeeWorkLogs) ? state.employeeWorkLogs : [];
          const dates = logs.map((log) => String(log.date || "")).filter(Boolean).sort();
          return {
            slot: row.id,
            backupDate: row.payload?.backupDate || "",
            sourceUpdatedAt: row.payload?.sourceUpdatedAt || "",
            updatedAt: row.updated_at || "",
            workLogs: logs.length,
            firstWorkLogDate: dates[0] || "",
            lastWorkLogDate: dates[dates.length - 1] || "",
            septemberWorkLogs: logs.filter((log) => String(log.date || "").startsWith("2026-09-")).length,
            septemberDates: [...new Set(logs.map((log) => String(log.date || "")).filter((date) => date.startsWith("2026-09-")))].sort(),
          };
        }),
      });
    } catch (error) {
      return send(res, 500, { error: error?.message || "Backup inspection failed" });
    }
  }

  const cronSecret = process.env.CRON_SECRET || "";
  const authorization = String(req.headers.authorization || "");
  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return send(res, 401, { error: "Unauthorized" });
  }

  try {
    const sourceResponse = await fetch(`${url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(ROW_ID)}&select=payload,updated_at`, {
      headers: headers(key),
    });
    if (!sourceResponse.ok) throw new Error(`State fetch failed (${sourceResponse.status})`);
    const sourceRows = await sourceResponse.json();
    const source = sourceRows[0];
    if (!source?.payload) return send(res, 404, { error: "Main state is empty" });

    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const dayNumber = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86400000);
    const backupId = `backup-daily-${dayNumber % BACKUP_SLOTS}`;
    const backupResponse = await fetch(`${url}/rest/v1/${TABLE}?on_conflict=id`, {
      method: "POST",
      headers: headers(key, "resolution=merge-duplicates,return=minimal"),
      body: JSON.stringify({
        id: backupId,
        payload: {
          backupDate: date,
          sourceUpdatedAt: source.updated_at || "",
          state: source.payload,
        },
        updated_at: now.toISOString(),
      }),
    });
    if (!backupResponse.ok) throw new Error(`Backup write failed (${backupResponse.status})`);

    return send(res, 200, {
      ok: true,
      backupDate: date,
      slot: backupId,
      employees: Array.isArray(source.payload.employees) ? source.payload.employees.length : 0,
      clients: Array.isArray(source.payload.clients) ? source.payload.clients.length : 0,
      workLogs: Array.isArray(source.payload.employeeWorkLogs) ? source.payload.employeeWorkLogs.length : 0,
    });
  } catch (error) {
    return send(res, 500, { error: error?.message || "Backup failed" });
  }
};
