const crypto = require("node:crypto");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TABLE = process.env.SUPABASE_TABLE || "agency_crm_state";
const ROW_ID = process.env.CRM_STATE_ID || "marketizo-main";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

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
  try {
    const [encoded, signature] = String(token || "").split(".");
    if (!encoded || !signature) return null;
    const expected = crypto.createHmac("sha256", secret()).update(encoded).digest("base64url");
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    return payload.exp > Date.now() && payload.role === "client" ? payload : null;
  } catch {
    return null;
  }
}

async function readClients() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(ROW_ID)}&select=clients:payload->clients`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!response.ok) throw new Error(`State fetch failed (${response.status})`);
  const rows = await response.json();
  return Array.isArray(rows[0]?.clients) ? rows[0].clients : [];
}

function publicClient(client) {
  return { id: client.id, name: client.name, loginEmail: client.loginEmail };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  if (!SUPABASE_URL || !SUPABASE_KEY || !secret()) return send(res, 500, { error: "Auth is not configured" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const clients = await readClients();
    if (body.action === "login") {
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const client = clients.find((item) => item.status !== "Arhiviran" && String(item.loginEmail || "").trim().toLowerCase() === email && String(item.loginPassword || "") === password);
      if (!client) return send(res, 401, { error: "Pogrešan email ili lozinka." });
      const expiresAt = Date.now() + SESSION_TTL_MS;
      return send(res, 200, { ok: true, token: sign({ clientId: client.id, email, role: "client", exp: expiresAt }), expiresAt, client: publicClient(client) });
    }
    if (body.action === "validate") {
      const session = verify(body.token);
      const client = session && clients.find((item) => item.id === session.clientId && item.status !== "Arhiviran");
      if (!client) return send(res, 401, { error: "Sesija je istekla." });
      return send(res, 200, { ok: true, expiresAt: session.exp, client: publicClient(client) });
    }
    return send(res, 400, { error: "Unknown action" });
  } catch (error) {
    return send(res, 500, { error: error.message || "Auth failed" });
  }
};
