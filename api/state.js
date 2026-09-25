const tableName = process.env.SUPABASE_TABLE || "agency_crm_state";
const rowId = process.env.CRM_STATE_ID || "marketizo-main";
const BACKUP_SLOTS = 30;
const employeeAuthTable = "agency_crm_employee_auth";
const crypto = require("node:crypto");

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

function supabaseHeaders(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

function verifyEmployeeToken(token, key) {
  const [encoded, signature] = String(token || "").split(".");
  if (!encoded || !signature) return null;
  const secret = process.env.EMPLOYEE_SESSION_SECRET || key;
  const expected = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  return payload.exp > Date.now() && payload.role === "operational-admin" ? payload : null;
}

function operationalSession(req, current, key) {
  const token = String(req.headers?.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const session = verifyEmployeeToken(token, key);
  const employee = (current?.employees || []).find((item) => item.id === session?.employeeId && item.status !== "Neaktivan" && item.isOperationalAdmin === true);
  return employee ? { session, employee } : null;
}

const clientFinancialKeys = ["revenue", "cpl", "package", "billingDay", "paymentStatus", "invoiceStatus", "paymentMethod", "invoices", "invoiceStartMonth", "invoiceExcludedMonths", "websitePrice", "hostingPrice", "domainPrice"];

function hideOperationalFinancials(payload) {
  const copy = hidePasswords(payload);
  copy.employees = (copy.employees || []).map((employee) => ({ ...employee, salary: undefined, openingHourBalance: undefined }));
  copy.clients = (copy.clients || []).map((client) => {
    const safe = { ...client };
    clientFinancialKeys.forEach((key) => delete safe[key]);
    return safe;
  });
  delete copy.packages;
  delete copy.backup;
  return copy;
}

function mergeOperationalPayload(submitted, current, actor) {
  const currentClients = new Map((current.clients || []).map((client) => [client.id, client]));
  const submittedClients = Array.isArray(submitted.clients) ? submitted.clients : current.clients || [];
  const clients = submittedClients.map((client) => {
    const previous = currentClients.get(client.id) || {};
    const merged = { ...previous, ...client };
    clientFinancialKeys.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(previous, key)) merged[key] = previous[key];
      else delete merged[key];
    });
    return merged;
  });
  const submittedIds = new Set(clients.map((client) => client.id));
  (current.clients || []).forEach((client) => { if (!submittedIds.has(client.id)) clients.push(client); });
  const mergeCollectionWithoutDelete = (key) => {
    const previous = Array.isArray(current[key]) ? current[key] : [];
    const desired = Array.isArray(submitted[key]) ? submitted[key] : previous;
    const result = desired.map((item) => ({ ...item }));
    const ids = new Set(result.map((item) => item.id));
    previous.forEach((item) => { if (!ids.has(item.id)) result.push(item); });
    return result;
  };
  return {
    ...current,
    clients,
    companyPlans: Array.isArray(submitted.companyPlans) ? submitted.companyPlans : current.companyPlans,
    clientLeads: Array.isArray(submitted.clientLeads) ? submitted.clientLeads : current.clientLeads,
    employeeActivities: mergeCollectionWithoutDelete("employeeActivities"),
    employeeWorkLogs: mergeCollectionWithoutDelete("employeeWorkLogs"),
    employeeAbsences: mergeCollectionWithoutDelete("employeeAbsences"),
    employeeLateRecords: mergeCollectionWithoutDelete("employeeLateRecords"),
    operationalAuditLog: [{ id: crypto.randomUUID(), actorId: actor.id, actorName: actor.name, action: "operational-state-save", createdAt: new Date().toISOString() }, ...(current.operationalAuditLog || [])].slice(0, 500),
  };
}

function viennaDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Vienna", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

async function preserveDailyPrewriteBackup(config, current) {
  if (!current?.payload || !current.updatedAt) return;
  const now = new Date();
  const backupDate = viennaDateKey(now);
  const dayNumber = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86400000);
  const backupId = `backup-prewrite-${dayNumber % BACKUP_SLOTS}`;
  const existingResponse = await fetch(`${config.url}/rest/v1/${tableName}?id=eq.${encodeURIComponent(backupId)}&select=payload`, {
    headers: supabaseHeaders(config.key),
  });
  if (!existingResponse.ok) throw new Error(`Provera dnevnog backupa nije uspela (${existingResponse.status}).`);
  const existingRows = await existingResponse.json();
  if (existingRows[0]?.payload?.backupDate === backupDate) return;
  const backupResponse = await fetch(`${config.url}/rest/v1/${tableName}?on_conflict=id`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(config.key),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      id: backupId,
      payload: { backupDate, sourceUpdatedAt: current.updatedAt, state: current.payload },
      updated_at: now.toISOString(),
    }),
  });
  if (!backupResponse.ok) throw new Error(`Dnevni backup pre upisa nije uspeo (${backupResponse.status}).`);
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function hidePasswords(payload) {
  if (!payload) return payload;
  const copy = JSON.parse(JSON.stringify(payload));
  if (Array.isArray(copy.employees)) copy.employees.forEach((employee) => delete employee.password);
  if (Array.isArray(copy.clients)) copy.clients.forEach((client) => delete client.loginPassword);
  return copy;
}

async function readStoredState(config) {
  const response = await fetch(`${config.url}/rest/v1/${tableName}?id=eq.${encodeURIComponent(rowId)}&select=payload,updated_at`, {
    headers: supabaseHeaders(config.key),
  });
  if (!response.ok) throw new Error(`Čitanje postojećih naloga nije uspelo (${response.status}).`);
  const rows = await response.json();
  return { payload: rows[0]?.payload || {}, updatedAt: rows[0]?.updated_at || "" };
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

const protectedCollections = [
  "clients",
  "employees",
  "employeeWorkLogs",
  "employeeAbsences",
  "employeeActivities",
];

function unsafeCollectionShrink(payload, current) {
  for (const key of protectedCollections) {
    const previous = Array.isArray(current?.[key]) ? current[key] : [];
    const next = Array.isArray(payload?.[key]) ? payload[key] : [];
    if (previous.length < 10) continue;
    const allowedDrop = Math.max(1, Math.floor(previous.length * 0.05));
    if (next.length < previous.length - allowedDrop) {
      return { key, previous: previous.length, next: next.length, allowedDrop };
    }
  }
  return null;
}

async function syncEmployeeAuth(config, employees = []) {
  const rows = employees
    .filter((employee) => employee?.id && String(employee.email || "").trim())
    .map((employee) => ({
      id: employee.id,
      email: String(employee.email).trim().toLowerCase(),
      password: String(employee.password || ""),
      employee_data: employee,
      updated_at: new Date().toISOString(),
    }));
  if (!rows.length) return;
  const response = await fetch(`${config.url}/rest/v1/${employeeAuthTable}?on_conflict=id`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(config.key),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!response.ok) throw new Error(`Sinhronizacija prijava nije uspela (${response.status}).`);
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
      const row = await readStoredState(config);
      const access = operationalSession(req, row.payload, config.key);
      if (/^Bearer\s+/i.test(String(req.headers?.authorization || "")) && !access) {
        return json(res, 403, { configured: true, error: "Operativna administratorska sesija nije važeća.", payload: null });
      }
      return json(res, 200, {
        configured: true,
        empty: !row.payload,
        payload: access ? hideOperationalFinancials(row.payload) : hidePasswords(row.payload || null),
        updatedAt: row.updatedAt || "",
        accessRole: access ? "operational-admin" : "full-admin",
      });
    }

    if (req.method === "PUT" || req.method === "POST") {
      const body = await readBody(req);
      let payload = body.payload;
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return json(res, 400, { configured: true, error: "Nedostaje payload objekat." });
      }
      const current = await readStoredState(config);
      const hasBearer = /^Bearer\s+/i.test(String(req.headers?.authorization || ""));
      const access = operationalSession(req, current.payload, config.key);
      if (hasBearer && !access) return json(res, 403, { configured: true, error: "Operativna administratorska sesija nije važeća." });
      const baseUpdatedAt = String(body.baseUpdatedAt || "");
      if (current.updatedAt && baseUpdatedAt !== current.updatedAt) {
        return json(res, 409, {
          configured: true,
          conflict: true,
          error: "Podaci su u međuvremenu promenjeni. Učitana je najnovija verzija; ponovi izmenu.",
          updatedAt: current.updatedAt,
        });
      }
      const unsafeShrink = unsafeCollectionShrink(payload, current.payload);
      if (unsafeShrink) {
        return json(res, 409, {
          configured: true,
          conflict: true,
          unsafeShrink: true,
          error: `Zaustavljen je neuobičajen gubitak podataka u ${unsafeShrink.key} (${unsafeShrink.previous} → ${unsafeShrink.next}). Osveži stranicu i pokušaj ponovo.`,
          updatedAt: current.updatedAt,
        });
      }
      await preserveDailyPrewriteBackup(config, current);
      if (access) payload = mergeOperationalPayload(payload, current.payload, access.employee);
      payload = preserveCredentials(payload, current.payload);
      const updatedAt = new Date().toISOString();
      const response = await fetch(`${config.url}/rest/v1/${tableName}?on_conflict=id`, {
        method: "POST",
        headers: {
          ...supabaseHeaders(config.key),
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({
          id: rowId,
          payload,
          updated_at: updatedAt,
        }),
      });
      if (!response.ok) {
        return json(res, response.status, {
          configured: true,
          error: await response.text(),
        });
      }
      // Login remains fast after an employee/email/password change. The main
      // state write is already committed, so a temporary auth-sync issue must
      // not roll it back or make the user repeat the business-data save.
      await syncEmployeeAuth(config, payload.employees).catch(() => null);
      return json(res, 200, { configured: true, ok: true, updatedAt });
    }

    return json(res, 405, { configured: true, error: "Metod nije podržan." });
  } catch (error) {
    return json(res, 500, {
      configured: true,
      error: error?.message || "Greška online baze.",
    });
  }
};
