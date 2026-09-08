const { createHmac, randomUUID, timingSafeEqual } = require("crypto");
const tableName = process.env.SUPABASE_TABLE || "agency_crm_state";
const rowId = process.env.CRM_STATE_ID || "marketizo-main";
const BACKUP_SLOTS = 30;

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function headers(key, prefer = "") {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}) };
}

function verifySession(token, secret) {
  try {
    const [encoded, signature] = String(token || "").split(".");
    if (!encoded || !signature) return null;
    const expected = createHmac("sha256", secret).update(encoded).digest("base64url");
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function readRow(url, key) {
  const response = await fetch(`${url}/rest/v1/${tableName}?id=eq.${encodeURIComponent(rowId)}&select=payload,updated_at`, { headers: headers(key) });
  if (!response.ok) throw new Error(`Čitanje baze nije uspelo (${response.status}).`);
  return (await response.json())[0] || null;
}

function viennaDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Vienna", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function isDirectReport(leader, employee) {
  if (employee.leaderId === leader.id) return true;
  const leaderName = String(leader.name || "").toLowerCase();
  const employeeName = String(employee.name || "").toLowerCase();
  return leaderName.includes("sladjan") && employeeName.includes("milica blagojevic");
}

async function preserveDailyPrewriteBackup(url, key, row) {
  if (!row?.payload || !row.updated_at) return;
  const now = new Date();
  const backupDate = viennaDateKey(now);
  const dayNumber = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86400000);
  const backupId = `backup-prewrite-${dayNumber % BACKUP_SLOTS}`;
  const existingResponse = await fetch(`${url}/rest/v1/${tableName}?id=eq.${encodeURIComponent(backupId)}&select=payload`, { headers: headers(key) });
  if (!existingResponse.ok) throw new Error(`Provera dnevnog backupa nije uspela (${existingResponse.status}).`);
  const existingRows = await existingResponse.json();
  if (existingRows[0]?.payload?.backupDate === backupDate) return;
  const backupResponse = await fetch(`${url}/rest/v1/${tableName}?on_conflict=id`, {
    method: "POST",
    headers: headers(key, "resolution=merge-duplicates,return=minimal"),
    body: JSON.stringify({ id: backupId, payload: { backupDate, sourceUpdatedAt: row.updated_at, state: row.payload }, updated_at: now.toISOString() }),
  });
  if (!backupResponse.ok) throw new Error(`Dnevni backup pre upisa nije uspeo (${backupResponse.status}).`);
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return json(res, 200, { ok: true });
  if (req.method !== "POST") return json(res, 405, { ok: false, error: "Metod nije podržan." });
  const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return json(res, 503, { ok: false, error: "Online baza nije povezana." });

  try {
    const body = await readBody(req);
    const leaderId = String(body.leaderId || "");
    const employeeId = String(body.employeeId || "");
    const title = String(body.title || "").trim().slice(0, 160);
    const target = String(body.target || "").trim().slice(0, 1200);
    const category = String(body.category || "Razvoj").trim().slice(0, 80);
    const startDate = String(body.startDate || "");
    const endDate = String(body.endDate || "");
    if (!leaderId || !employeeId || !title || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || startDate > endDate) {
      return json(res, 400, { ok: false, error: "Proveri zaposlenog, naziv i datume cilja." });
    }
    const session = verifySession(body.sessionToken, process.env.EMPLOYEE_SESSION_SECRET || key);
    if (!session || session.employeeId !== leaderId) return json(res, 401, { ok: false, error: "Sesija lidera je istekla. Prijavi se ponovo." });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const row = await readRow(url, key);
      if (!row) return json(res, 404, { ok: false, error: "Glavni zapis baze nije pronađen." });
      const payload = JSON.parse(JSON.stringify(row.payload || {}));
      const leader = (payload.employees || []).find((item) => item.id === leaderId && item.status !== "Neaktivan" && item.isLeader);
      const employee = (payload.employees || []).find((item) => item.id === employeeId && item.status !== "Neaktivan");
      if (!leader || !employee || !isDirectReport(leader, employee)) {
        return json(res, 403, { ok: false, error: "Cilj možeš dodati samo zaposlenom koji je dodeljen tebi." });
      }
      payload.employeeGoals = Array.isArray(payload.employeeGoals) ? payload.employeeGoals : [];
      const duplicate = payload.employeeGoals.some((goal) => goal.employeeId === employeeId && String(goal.title || "").trim().toLowerCase() === title.toLowerCase() && goal.startDate === startDate && goal.endDate === endDate);
      if (duplicate) return json(res, 409, { ok: false, error: "Isti cilj već postoji za ovog zaposlenog i period." });
      const now = new Date().toISOString();
      const goal = { id: `leader-goal-${randomUUID()}`, employeeId, assignedBy: leaderId, assignedByRole: "leader", category, title, target, startDate, endDate, progress: 0, status: "U toku", note: "", completedDate: "", createdAt: now };
      const notification = { id: `notification-${goal.id}`, key: `goal-created-${goal.id}`, scope: "employee", targetId: employeeId, type: "info", title: "Dodat ti je cilj", message: `${title}: ${target || "bez dodatnog opisa"} · rok ${endDate}.`, read: false, hiddenUntil: "", createdAt: now };
      payload.employeeGoals.unshift(goal);
      payload.notifications = Array.isArray(payload.notifications) ? payload.notifications : [];
      payload.notifications.unshift(notification);
      await preserveDailyPrewriteBackup(url, key, row);
      const updatedAt = new Date().toISOString();
      const response = await fetch(`${url}/rest/v1/${tableName}?id=eq.${encodeURIComponent(rowId)}&updated_at=eq.${encodeURIComponent(row.updated_at)}&select=updated_at`, {
        method: "PATCH",
        headers: headers(key, "return=representation"),
        body: JSON.stringify({ payload, updated_at: updatedAt }),
      });
      if (!response.ok) throw new Error(`Čuvanje cilja nije uspelo (${response.status}).`);
      const updatedRows = await response.json();
      if (updatedRows.length) return json(res, 200, { ok: true, goal, notification, updatedAt });
    }
    return json(res, 409, { ok: false, error: "Baza je trenutno zauzeta drugim upisima. Pokušaj ponovo." });
  } catch (error) {
    return json(res, 500, { ok: false, error: error?.message || "Čuvanje cilja nije uspelo." });
  }
};
