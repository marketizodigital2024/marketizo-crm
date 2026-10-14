const dbFetch = (...args) => require("../lib/database-request.js").request(fetch, ...args);
const { accessSession, readStoredState, supabaseConfig, supabaseHeaders, preserveDailyPrewriteBackup } = require("./state.js").helpers;
const tableName = process.env.SUPABASE_TABLE || "agency_crm_state";
const rowId = process.env.CRM_STATE_ID || "marketizo-main";
const MAX_ATTEMPTS = 8;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  const chunks = [];
  let length = 0;
  for await (const chunk of req) {
    length += Buffer.byteLength(chunk);
    if (length > 16384) throw new Error("Zahtev za aktivnost je prevelik.");
    chunks.push(Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

const normalized = (value) => String(value || "").trim().toLowerCase();
const pause = (attempt) => new Promise((resolve) => setTimeout(resolve, Math.min(800, 45 * (2 ** attempt))));

module.exports = async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) return json(res, 405, { ok: false, error: "Metod nije podržan." });
  const config = supabaseConfig();
  if (!config.configured) return json(res, 503, { ok: false, error: "Online baza nije povezana." });
  try {
    const submitted = req.method === "POST" ? (await readBody(req)).activity : null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const current = await readStoredState(config);
      const access = accessSession(req, current.payload, config.key);
      if (!access) return json(res, 401, { ok: false, error: "Prijava je obavezna." });
      if (!["full-admin", "operational-admin"].includes(access.role)) return json(res, 403, { ok: false, error: "Samo administrator može da definiše aktivnosti." });
      if (!current.updatedAt) return json(res, 404, { ok: false, error: "Glavni zapis baze nije pronađen." });
      const activities = Array.isArray(current.payload.employeeActivities) ? current.payload.employeeActivities : [];
      if (req.method === "GET") return json(res, 200, { ok: true, activities, updatedAt: current.updatedAt });
      const id = String(submitted?.id || "").trim();
      const name = String(submitted?.name || "").trim();
      const category = String(submitted?.category || "").trim();
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id) || !name || name.length > 200 || !category || category.length > 100 || /[<>\r\n]/.test(name + category)) {
        return json(res, 400, { ok: false, error: "Unesi ispravan naziv i kategoriju aktivnosti." });
      }
      const existing = activities.find((item) => item.id === id)
        || activities.find((item) => normalized(item.name) === normalized(name));
      if (existing) {
        if (normalized(existing.name) !== normalized(name) || normalized(existing.category) !== normalized(category) || existing.active === false) {
          return json(res, 409, { ok: false, error: "Aktivnost sa tim nazivom već postoji. Izaberi postojeću aktivnost ili drugi naziv." });
        }
        return json(res, 200, { ok: true, duplicate: true, activity: existing, activities, updatedAt: current.updatedAt });
      }
      const activity = { id, name, category, active: true, createdAt: new Date().toISOString(), createdBy: access.employee.id };
      // Read the latest full payload on the server; the browser submits only this new catalog record.
      const payload = {
        ...current.payload,
        employeeActivities: [...activities, activity],
        employeeActivityCategoryMap: { ...(current.payload.employeeActivityCategoryMap || {}), [name]: category },
        employeeActivityCategories: [...new Set([...(current.payload.employeeActivityCategories || []), category])],
      };
      await preserveDailyPrewriteBackup(config, current);
      const updatedAt = new Date(Math.max(Date.now(), Date.parse(current.updatedAt) + 1)).toISOString();
      const response = await dbFetch(`${config.url}/rest/v1/${tableName}?id=eq.${encodeURIComponent(rowId)}&updated_at=eq.${encodeURIComponent(current.updatedAt)}&select=updated_at`, {
        method: "PATCH",
        headers: { ...supabaseHeaders(config.key), Prefer: "return=representation" },
        body: JSON.stringify({ payload, updated_at: updatedAt }),
      });
      if (!response.ok) {
        if ((response.status >= 500 || response.status === 429) && attempt < MAX_ATTEMPTS - 1) { await pause(attempt); continue; }
        return json(res, response.status, { ok: false, error: `Upis aktivnosti nije uspeo (${response.status}).` });
      }
      const rows = await response.json();
      if (Array.isArray(rows) && rows.length === 1) return json(res, 200, { ok: true, activity, activities: payload.employeeActivities, updatedAt });
      // Another employee wrote while the backup/write ran. Re-read and append to that newer version.
      if (attempt < MAX_ATTEMPTS - 1) await pause(attempt);
    }
    return json(res, 409, { ok: false, error: "Baza je trenutno zauzeta drugim upisima. Pokušaj ponovo; unos je zadržan." });
  } catch (error) {
    return json(res, 500, { ok: false, error: error?.message || "Upis aktivnosti nije uspeo." });
  }
};

const originalHandler = module.exports;
module.exports = Object.assign((req, res) => require("../lib/database-request.js").withRequestBudget(() => originalHandler(req, res)), originalHandler);
