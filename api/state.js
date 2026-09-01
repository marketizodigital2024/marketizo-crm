const tableName = process.env.SUPABASE_TABLE || "agency_crm_state";
const rowId = process.env.CRM_STATE_ID || "marketizo-main";
const crypto = require("crypto");
const EMPLOYEE_PASSWORD_PEPPER = process.env.EMPLOYEE_PASSWORD_PEPPER || "marketizo-employee-password-v1";

function hashEmployeePassword(password) {
  const input = `${EMPLOYEE_PASSWORD_PEPPER}|${String(password || "").trim()}`;
  let hashA = 2166136261;
  let hashB = 16777619;
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    hashA ^= code;
    hashA = Math.imul(hashA, 16777619);
    hashB ^= code + 17;
    hashB = Math.imul(hashB, 2166136261);
  }
  return `h1:${(hashA >>> 0).toString(16).padStart(8, "0")}-h2:${(hashB >>> 0).toString(16).padStart(8, "0")}`;
}

function secureEmployeePassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(`${String(password || "").trim()}|${EMPLOYEE_PASSWORD_PEPPER}`, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function sanitizeEmployeeAuth(payload = {}) {
  const copy = JSON.parse(JSON.stringify(payload));
  if (Array.isArray(copy.employees)) {
    copy.employees = copy.employees.map((employee) => {
      const normalized = { ...employee };
      delete normalized.password;
      delete normalized.passwordHash;
      return normalized;
    });
  }
  if (Array.isArray(copy.clients)) {
    copy.clients.forEach((client) => {
      delete client.loginPassword;
    });
  }
  return copy;
}

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

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

async function readStoredPayload(config) {
  const response = await fetch(`${config.url}/rest/v1/${tableName}?id=eq.${encodeURIComponent(rowId)}&select=payload`, {
    headers: supabaseHeaders(config.key),
  });
  if (!response.ok) throw new Error(`Čitanje postojećih naloga nije uspelo (${response.status}).`);
  const rows = await response.json();
  return rows[0]?.payload || {};
}

function preserveEmployeePasswords(payload, current) {
  if (!Array.isArray(payload?.employees)) return payload;
  const previous = Array.isArray(current?.employees) ? current.employees : [];
  return {
    ...payload,
    employees: payload.employees.map((employee) => {
      const currentEmployee = {
        ...employee,
        passwordHash: "",
      };
      if (String(employee.password || "").trim()) {
        currentEmployee.passwordHash = secureEmployeePassword(employee.password);
      }
      const match = previous.find((item) => item.id === employee.id) || previous.find((item) =>
        String(item.email || "").trim().toLowerCase() === String(employee.email || "").trim().toLowerCase()
      );
      if (!currentEmployee.passwordHash) {
        if (match?.passwordHash) currentEmployee.passwordHash = match.passwordHash;
        if (match?.password && !currentEmployee.passwordHash) currentEmployee.passwordHash = hashEmployeePassword(match.password);
      }
      delete currentEmployee.password;
      return currentEmployee;
    }),
  };
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
        payload: sanitizeEmployeeAuth(row?.payload || null),
        updatedAt: row?.updated_at || "",
      });
    }

    if (req.method === "PUT" || req.method === "POST") {
      const body = await readBody(req);
      let payload = body.payload;
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return json(res, 400, { configured: true, error: "Nedostaje payload objekat." });
      }
      payload = preserveEmployeePasswords(payload, await readStoredPayload(config));
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
