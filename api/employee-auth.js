const crypto = require("node:crypto");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TABLE = process.env.SUPABASE_TABLE || "agency_crm_state";
const ROW_ID = process.env.CRM_STATE_ID || "marketizo-main";
const AUTH_TABLE = "agency_crm_employee_auth";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const FULL_ADMIN_EMPLOYEE_IDS = new Set(["emp-miljan", "emp-ivana"]);

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function secret() {
  return process.env.EMPLOYEE_SESSION_SECRET || SUPABASE_KEY;
}

function sign(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function verify(token) {
  const [encoded, signature] = String(token || "").split(".");
  if (!encoded || !signature) return null;
  const expected = crypto.createHmac("sha256", secret()).update(encoded).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  return payload.exp > Date.now() ? payload : null;
}

async function readEmployees() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(ROW_ID)}&select=employees:payload->employees`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  if (!response.ok) throw new Error(`State fetch failed (${response.status})`);
  const rows = await response.json();
  return Array.isArray(rows[0]?.employees) ? rows[0].employees : [];
}

async function readFastEmployees({ email = "", id = "" } = {}) {
  const filters = [];
  if (email) filters.push(`email=eq.${encodeURIComponent(email)}`);
  if (id) filters.push(`id=eq.${encodeURIComponent(id)}`);
  const query = filters.length ? `&${filters.join("&")}` : "";
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${AUTH_TABLE}?select=employee_data${query}&limit=2`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`Employee auth fetch failed (${response.status})`);
  const rows = await response.json();
  return rows.map((row) => row.employee_data).filter(Boolean);
}

function publicEmployee(employee) {
  return { id: employee.id, email: employee.email, name: employee.name, isOperationalAdmin: employee.isOperationalAdmin === true };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  if (!SUPABASE_URL || !SUPABASE_KEY || !secret()) return send(res, 500, { error: "Auth is not configured" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    if (["login", "adminLogin", "operationalAdminLogin", "fullAdminLogin"].includes(body.action)) {
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      let employees = await readFastEmployees({ email }).catch(() => []);
      if (!employees.length) employees = await readEmployees();
      const employee = employees.find((item) =>
        item.active !== false && String(item.email || "").trim().toLowerCase() === email &&
        String(item.password || "") === password
      );
      if (!employee) return send(res, 401, { error: "Pogrešan email ili lozinka." });
      if (body.action === "operationalAdminLogin" && employee.isOperationalAdmin !== true) {
        return send(res, 403, { error: "Ovaj nalog nema pristup operativnoj administraciji." });
      }
      if (body.action === "fullAdminLogin" && !FULL_ADMIN_EMPLOYEE_IDS.has(employee.id)) {
        return send(res, 403, { error: "Ovaj nalog nema pristup glavnoj administraciji." });
      }
      if (body.action === "adminLogin" && !FULL_ADMIN_EMPLOYEE_IDS.has(employee.id) && employee.isOperationalAdmin !== true) {
        return send(res, 403, { error: "Ovaj nalog nema administratorski pristup." });
      }
      const expiresAt = Date.now() + SESSION_TTL_MS;
      const tokenRole = body.action === "fullAdminLogin" || (body.action === "adminLogin" && FULL_ADMIN_EMPLOYEE_IDS.has(employee.id))
        ? "full-admin"
        : body.action === "operationalAdminLogin" || employee.isOperationalAdmin === true
          ? "operational-admin"
          : "employee";
      const token = sign({ employeeId: employee.id, email, role: tokenRole, exp: expiresAt });
      return send(res, 200, { ok: true, token, role: tokenRole, expiresAt, employee: publicEmployee(employee) });
    }

    if (body.action === "validate") {
      const session = verify(body.token);
      if (!session) return send(res, 401, { error: "Sesija je istekla." });
      let employees = await readFastEmployees({ id: session.employeeId }).catch(() => []);
      if (!employees.length) employees = await readEmployees();
      const employee = employees.find((item) =>
        item.active !== false && (item.id === session.employeeId || String(item.email || "").toLowerCase() === session.email)
      );
      if (!employee) return send(res, 401, { error: "Nalog nije aktivan." });
      return send(res, 200, { ok: true, expiresAt: session.exp, employee: publicEmployee(employee) });
    }

    return send(res, 400, { error: "Unknown action" });
  } catch (error) {
    return send(res, 500, { error: error.message || "Auth failed" });
  }
}
