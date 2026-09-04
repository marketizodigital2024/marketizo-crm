const TABLE = process.env.SUPABASE_TABLE || "agency_crm_state";
const ROW_ID = process.env.CRM_STATE_ID || "marketizo-main";
const BACKUP_PREFIX = "marketizo-crm/daily/";

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function supabaseHeaders(key, prefer = "") {
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

function counts(state) {
  return {
    employees: Array.isArray(state?.employees) ? state.employees.length : 0,
    clients: Array.isArray(state?.clients) ? state.clients.length : 0,
    workLogs: Array.isArray(state?.employeeWorkLogs) ? state.employeeWorkLogs.length : 0,
    absences: Array.isArray(state?.employeeAbsences) ? state.employeeAbsences.length : 0,
    activities: Array.isArray(state?.employeeActivities) ? state.employeeActivities.length : 0,
  };
}

function validBackup(document) {
  return document?.format === "marketizo-crm-backup-v1"
    && document.state && typeof document.state === "object" && !Array.isArray(document.state)
    && counts(document.state).employees > 0;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "Method not allowed" });
  const authorization = String(req.headers.authorization || "");
  if (!process.env.CRON_SECRET || authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return send(res, 401, { ok: false, error: "Unauthorized" });
  }
  const url = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key || !process.env.BLOB_READ_WRITE_TOKEN) {
    return send(res, 503, { ok: false, error: "Backup storage is not configured" });
  }

  try {
    const body = await readBody(req);
    const pathname = String(body.pathname || "");
    if (!pathname.startsWith(BACKUP_PREFIX) || !pathname.endsWith(".json")) {
      return send(res, 400, { ok: false, error: "Nevažeća putanja backupa." });
    }
    const blob = await import("@vercel/blob");
    const downloaded = await blob.get(pathname, { access: "private" });
    if (!downloaded || downloaded.statusCode !== 200 || !downloaded.stream) {
      return send(res, 404, { ok: false, error: "Backup nije pronađen." });
    }
    const document = JSON.parse(await new Response(downloaded.stream).text());
    if (!validBackup(document)) return send(res, 422, { ok: false, error: "Backup nije prošao proveru strukture." });

    const sourceResponse = await fetch(`${url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(ROW_ID)}&select=payload,updated_at`, {
      headers: supabaseHeaders(key),
    });
    if (!sourceResponse.ok) throw new Error(`State fetch failed (${sourceResponse.status})`);
    const current = (await sourceResponse.json())[0];
    const result = {
      ok: true,
      dryRun: body.confirm !== "RESTORE_MARKETIZO_BACKUP",
      pathname,
      backupDate: document.backupDate || "",
      sourceUpdatedAt: document.sourceUpdatedAt || "",
      backupCounts: counts(document.state),
      currentCounts: counts(current?.payload),
    };
    if (result.dryRun) return send(res, 200, result);
    if (!current?.payload || !current.updated_at) throw new Error("Trenutno live stanje nije pronađeno.");

    const now = new Date();
    const emergencyPath = `marketizo-crm/pre-restore/${now.toISOString().replace(/[:.]/g, "-")}.json`;
    await blob.put(emergencyPath, JSON.stringify({
      format: "marketizo-crm-backup-v1",
      backupDate: now.toISOString().slice(0, 10),
      createdAt: now.toISOString(),
      sourceUpdatedAt: current.updated_at,
      state: current.payload,
    }), { access: "private", contentType: "application/json", addRandomSuffix: false });

    const updatedAt = new Date().toISOString();
    const restoreResponse = await fetch(`${url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(ROW_ID)}&updated_at=eq.${encodeURIComponent(current.updated_at)}&select=updated_at`, {
      method: "PATCH",
      headers: supabaseHeaders(key, "return=representation"),
      body: JSON.stringify({ payload: document.state, updated_at: updatedAt }),
    });
    if (!restoreResponse.ok) throw new Error(`Restore failed (${restoreResponse.status})`);
    const restoredRows = await restoreResponse.json();
    if (!restoredRows.length) return send(res, 409, { ok: false, error: "Live podaci su se promenili tokom vraćanja. Restore je zaustavljen." });
    return send(res, 200, { ...result, dryRun: false, restoredAt: updatedAt, emergencyBackup: emergencyPath });
  } catch (error) {
    return send(res, 500, { ok: false, error: error?.message || "Restore failed" });
  }
};
