const crypto = require("crypto");

const tableName = process.env.SUPABASE_TABLE || "agency_crm_state";
const rowId = process.env.CRM_STATE_ID || "marketizo-main";
const pepper = process.env.EMPLOYEE_PASSWORD_PEPPER || "marketizo-employee-password-v1";

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function legacyHash(password) {
  const input = `${pepper}|${String(password || "").trim()}`;
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

function matches(password, stored) {
  if (!stored) return false;
  if (!stored.startsWith("scrypt:")) return stored === legacyHash(password);
  const [, salt, expected] = stored.split(":");
  const actual = crypto.scryptSync(`${String(password || "").trim()}|${pepper}`, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { ok: false });
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "").trim();
    if (!email || !password) return json(res, 400, { ok: false });
    const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    if (!url || !key) return json(res, 503, { ok: false });
    const response = await fetch(`${url}/rest/v1/${tableName}?id=eq.${encodeURIComponent(rowId)}&select=payload`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!response.ok) return json(res, 503, { ok: false });
    const rows = await response.json();
    const employee = (rows[0]?.payload?.employees || []).find((item) =>
      String(item.email || "").trim().toLowerCase() === email && item.status !== "Neaktivan"
    );
    const stored = employee?.passwordHash || (employee?.password ? legacyHash(employee.password) : "");
    if (!employee || !matches(password, stored)) return json(res, 401, { ok: false });
    return json(res, 200, { ok: true, employeeId: employee.id });
  } catch {
    return json(res, 500, { ok: false });
  }
};
