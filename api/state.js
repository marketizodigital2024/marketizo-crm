const tableName = process.env.SUPABASE_TABLE || "agency_crm_state";
const rowId = process.env.CRM_STATE_ID || "marketizo-main";

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function supabaseConfig() {
  const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return { configured: Boolean(url && key), key, url };
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
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function normalizeLegacyAbsenceStatuses(payload) {
  if (!payload || !Array.isArray(payload.employeeAbsences)) return payload;
  return {
    ...payload,
    employeeAbsences: payload.employeeAbsences.map((absence) => ({
      ...absence,
      status: absence.status === "Evidentirano" ? "Odobreno" : absence.status,
    })),
  };
}

function hidePasswords(payload) {
  if (!payload) return payload;
  const copy = JSON.parse(JSON.stringify(normalizeLegacyAbsenceStatuses(payload)));
  if (Array.isArray(copy.employees)) copy.employees.forEach((employee) => delete employee.password);
  if (Array.isArray(copy.clients)) copy.clients.forEach((client) => delete client.loginPassword);
  return copy;
}

async function readStoredPayload(config) {
  const response = await fetch(`${config.url}/rest/v1/${tableName}?id=eq.${encodeURIComponent(rowId)}&select=payload`, {
    headers: supabaseHeaders(config.key),
  });
  if (!response.ok) throw new Error(`Čitanje postojećih naloga nije uspelo (${response.status}).`);
  const rows = await response.json();
  return rows[0]?.payload || {};
}

async function readStoredRow(config, id) {
  const response = await fetch(`${config.url}/rest/v1/${tableName}?id=eq.${encodeURIComponent(id)}&select=payload,updated_at`, {
    headers: supabaseHeaders(config.key),
  });
  if (!response.ok) throw new Error(`Čitanje baze nije uspelo (${response.status}).`);
  return (await response.json())[0] || null;
}

function mergeById(incoming, current) {
  const next = Array.isArray(incoming) ? incoming.map((item) => ({ ...item })) : [];
  const seen = new Set(next.map((item) => item?.id).filter(Boolean));
  (Array.isArray(current) ? current : []).forEach((item) => {
    if (!item?.id || seen.has(item.id)) return;
    next.push(item);
    seen.add(item.id);
  });
  return next;
}

function preserveConcurrentEmployeeData(payload, current) {
  return {
    ...payload,
    employeeWorkLogs: mergeById(payload?.employeeWorkLogs, current?.employeeWorkLogs),
    employeeReports: mergeById(payload?.employeeReports, current?.employeeReports),
    employeeAbsences: mergeById(payload?.employeeAbsences, current?.employeeAbsences),
  };
}

function preserveCredentials(payload, current) {
  const previous = Array.isArray(current?.employees) ? current.employees : [];
  const previousClients = Array.isArray(current?.clients) ? current.clients : [];
  return {
    ...payload,
    employees: Array.isArray(payload?.employees) ? payload.employees.map((employee) => {
      if (String(employee.password || "").trim()) return employee;
      const match = previous.find((item) => item.id === employee.id) || previous.find((item) =>
        String(item.email || "").trim().toLowerCase() === String(employee.email || "").trim().toLowerCase()
      );
      return match?.password ? { ...employee, password: match.password } : employee;
    }) : payload.employees,
    clients: Array.isArray(payload?.clients) ? payload.clients.map((client) => {
      if (String(client.loginPassword || "").trim()) return client;
      const match = previousClients.find((item) => item.id === client.id) || previousClients.find((item) =>
        String(item.loginEmail || "").trim().toLowerCase() === String(client.loginEmail || "").trim().toLowerCase()
      );
      return match?.loginPassword ? { ...client, loginPassword: match.loginPassword } : client;
    }) : payload.clients,
  };
}

function workLogSignature(log) {
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

async function recoverSep3Hours(config) {
  const targetDate = "2026-09-03";
  const backupId = "backup-daily-7";
  const [mainRow, backupRow] = await Promise.all([
    readStoredRow(config, rowId),
    readStoredRow(config, backupId),
  ]);
  if (!mainRow?.payload) return { status: 404, body: { ok: false, error: "Main state is empty" } };
  if (!backupRow?.payload?.state) return { status: 404, body: { ok: false, error: "Backup snapshot is missing" } };
  if (backupRow.payload.backupDate !== targetDate) {
    return { status: 409, body: { ok: false, error: `Backup slot contains ${backupRow.payload.backupDate || "unknown"}, expected ${targetDate}` } };
  }

  const current = JSON.parse(JSON.stringify(mainRow.payload));
  const currentLogs = Array.isArray(current.employeeWorkLogs) ? current.employeeWorkLogs : [];
  const backupLogs = (Array.isArray(backupRow.payload.state.employeeWorkLogs) ? backupRow.payload.state.employeeWorkLogs : [])
    .filter((log) => log.date === targetDate);
  const currentIds = new Set(currentLogs.map((log) => log.id).filter(Boolean));
  const currentSignatures = new Set(currentLogs.filter((log) => log.date === targetDate).map(workLogSignature));
  const missing = backupLogs.filter((log) => !currentIds.has(log.id) && !currentSignatures.has(workLogSignature(log)));

  if (!missing.length) {
    return { status: 200, body: {
      ok: true,
      restored: 0,
      backupDate: targetDate,
      backupLogsForDate: backupLogs.length,
      currentLogsForDate: currentLogs.filter((log) => log.date === targetDate).length,
    } };
  }

  current.employeeWorkLogs = [...missing, ...currentLogs];
  const response = await fetch(`${config.url}/rest/v1/${tableName}?id=eq.${encodeURIComponent(rowId)}&updated_at=eq.${encodeURIComponent(mainRow.updated_at)}&select=updated_at`, {
    method: "PATCH",
    headers: supabaseHeaders(config.key, "return=representation"),
    body: JSON.stringify({ payload: current, updated_at: new Date().toISOString() }),
  });
  if (!response.ok) throw new Error(`Recovery upis nije uspeo (${response.status}).`);
  const rows = await response.json();
  if (!rows.length) return { status: 409, body: { ok: false, error: "State changed during recovery; retry." } };

  const minutesByEmployee = missing.reduce((result, log) => {
    const employeeId = log.employeeId || "unknown";
    result[employeeId] = (result[employeeId] || 0) + Number(log.minutes || Math.round(Number(log.hours || 0) * 60));
    return result;
  }, {});
  return { status: 200, body: { ok: true, restored: missing.length, backupDate: targetDate, restoredMinutesByEmployee: minutesByEmployee } };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,PUT,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return json(res, 200, { ok: true });

  const config = supabaseConfig();
  if (!config.configured) {
    return json(res, req.method === "GET" ? 200 : 503, {
      configured: false,
      error: "Supabase nije povezan. Dodaj SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY u Vercel.",
      payload: null,
    });
  }

  try {
    if (req.method === "GET") {
      const requestUrl = new URL(req.url || "/api/state", "https://internal.local");
      if (requestUrl.searchParams.get("recover") === "sep3-c520d333d0718f97") {
        const result = await recoverSep3Hours(config);
        return json(res, result.status, result.body);
      }
      const response = await fetch(`${config.url}/rest/v1/${tableName}?id=eq.${encodeURIComponent(rowId)}&select=payload,updated_at`, {
        headers: supabaseHeaders(config.key),
      });
      if (!response.ok) {
        return json(res, response.status, {
          configured: true,
          error: await response.text(),
          payload: null,
        });
      }
      const rows = await response.json();
      const row = rows[0];
      return json(res, 200, {
        configured: true,
        empty: !row,
        payload: hidePasswords(row?.payload || null),
        updatedAt: row?.updated_at || "",
      });
    }

    if (req.method === "PUT" || req.method === "POST") {
      const body = await readBody(req);
      let payload = body.payload;
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return json(res, 400, { configured: true, error: "Nedostaje payload objekat." });
      }
      const current = await readStoredPayload(config);
      payload = normalizeLegacyAbsenceStatuses(payload);
      payload = preserveConcurrentEmployeeData(payload, current);
      payload = preserveCredentials(payload, current);
      const response = await fetch(`${config.url}/rest/v1/${tableName}?on_conflict=id`, {
        method: "POST",
        headers: {
          ...supabaseHeaders(config.key),
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({
          id: rowId,
          payload,
          updated_at: new Date().toISOString(),
        }),
      });
      if (!response.ok) {
        return json(res, response.status, {
          configured: true,
          error: await response.text(),
        });
      }
      return json(res, 200, { configured: true, ok: true });
    }

    return json(res, 405, { configured: true, error: "Metod nije podržan." });
  } catch (error) {
    return json(res, 500, {
      configured: true,
      error: error?.message || "Greška online baze.",
    });
  }
};
