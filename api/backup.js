const TABLE = process.env.SUPABASE_TABLE || "agency_crm_state";
const ROW_ID = process.env.CRM_STATE_ID || "marketizo-main";
const BACKUP_SLOTS = 30;
const BLOB_PREFIX = "marketizo-crm/daily/";

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
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Vienna", weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

async function blobClient() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  return import("@vercel/blob");
}

async function listBlobBackups() {
  const blob = await blobClient();
  if (!blob) return { configured: false, blobs: [] };
  const result = await blob.list({ prefix: BLOB_PREFIX, limit: 100 });
  return {
    configured: true,
    blobs: (result.blobs || []).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)),
  };
}

async function writeIndependentBackup(source, date, now) {
  const blob = await blobClient();
  if (!blob) throw new Error("Vercel Blob backup nije povezan.");
  const document = {
    format: "marketizo-crm-backup-v1",
    backupDate: date,
    createdAt: now.toISOString(),
    sourceUpdatedAt: source.updated_at || "",
    state: source.payload,
  };
  const body = JSON.stringify(document);
  const pathname = `${BLOB_PREFIX}${date}.json`;
  const uploaded = await blob.put(pathname, body, {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  const downloaded = await blob.get(uploaded.pathname, { access: "private" });
  if (!downloaded || downloaded.statusCode !== 200 || !downloaded.stream) {
    throw new Error("Vercel Blob backup nije moguće ponovo pročitati.");
  }
  const verified = JSON.parse(await new Response(downloaded.stream).text());
  const expectedCounts = {
    employees: Array.isArray(source.payload.employees) ? source.payload.employees.length : 0,
    clients: Array.isArray(source.payload.clients) ? source.payload.clients.length : 0,
    workLogs: Array.isArray(source.payload.employeeWorkLogs) ? source.payload.employeeWorkLogs.length : 0,
    absences: Array.isArray(source.payload.employeeAbsences) ? source.payload.employeeAbsences.length : 0,
    activities: Array.isArray(source.payload.employeeActivities) ? source.payload.employeeActivities.length : 0,
  };
  const verifiedCounts = {
    employees: Array.isArray(verified.state?.employees) ? verified.state.employees.length : 0,
    clients: Array.isArray(verified.state?.clients) ? verified.state.clients.length : 0,
    workLogs: Array.isArray(verified.state?.employeeWorkLogs) ? verified.state.employeeWorkLogs.length : 0,
    absences: Array.isArray(verified.state?.employeeAbsences) ? verified.state.employeeAbsences.length : 0,
    activities: Array.isArray(verified.state?.employeeActivities) ? verified.state.employeeActivities.length : 0,
  };
  if (verified.format !== "marketizo-crm-backup-v1" || verified.sourceUpdatedAt !== document.sourceUpdatedAt
    || JSON.stringify(verifiedCounts) !== JSON.stringify(expectedCounts)) {
    throw new Error("Vercel Blob backup nije prošao proveru integriteta.");
  }
  const inventory = await listBlobBackups();
  const obsolete = inventory.blobs.slice(30);
  if (obsolete.length) await blob.del(obsolete.map((item) => item.url));
  return {
    pathname: uploaded.pathname,
    size: Buffer.byteLength(body),
    retained: Math.min(inventory.blobs.length, 30),
    verified: true,
    counts: verifiedCounts,
  };
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
      const independent = await listBlobBackups();
      return send(res, 200, {
        ok: true,
        independent: {
          configured: independent.configured,
          count: independent.blobs.length,
          backups: independent.blobs.slice(0, 30).map((item) => ({
            pathname: item.pathname,
            size: item.size,
            uploadedAt: item.uploadedAt,
          })),
        },
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
    const now = new Date();
    const vienna = viennaTime(now);
    const date = `${vienna.year}-${vienna.month}-${vienna.day}`;
    const isPrimaryRun = vienna.hour === "17" && vienna.minute === "30";
    const isFallbackRun = vienna.hour === "18" && vienna.minute === "30";
    const isForcedRun = String(req.query?.force || "") === "1";

    if (!isForcedRun && !isPrimaryRun && !isFallbackRun) {
      return send(res, 200, { ok: true, skipped: true, reason: "Outside the Vienna backup window", viennaTime: `${vienna.hour}:${vienna.minute}` });
    }

    if (!isForcedRun && isFallbackRun) {
      const existing = await listBlobBackups();
      const todayPath = `${BLOB_PREFIX}${date}.json`;
      if (existing.configured && existing.blobs.some((item) => item.pathname === todayPath)) {
        return send(res, 200, { ok: true, skipped: true, reason: "Primary backup already verified", backupDate: date });
      }
    }

    const sourceResponse = await fetch(`${url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(ROW_ID)}&select=payload,updated_at`, {
      headers: headers(key),
    });
    if (!sourceResponse.ok) throw new Error(`State fetch failed (${sourceResponse.status})`);
    const sourceRows = await sourceResponse.json();
    const source = sourceRows[0];
    if (!source?.payload) return send(res, 404, { error: "Main state is empty" });

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

    const independent = await writeIndependentBackup(source, date, now);

    return send(res, 200, {
      ok: true,
      backupDate: date,
      slot: backupId,
      employees: Array.isArray(source.payload.employees) ? source.payload.employees.length : 0,
      clients: Array.isArray(source.payload.clients) ? source.payload.clients.length : 0,
      workLogs: Array.isArray(source.payload.employeeWorkLogs) ? source.payload.employeeWorkLogs.length : 0,
      independent,
    });
  } catch (error) {
    return send(res, 500, { error: error?.message || "Backup failed" });
  }
};
