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
        payload: row?.payload || null,
        updatedAt: row?.updated_at || "",
      });
    }

    if (req.method === "PUT" || req.method === "POST") {
      const body = await readBody(req);
      const payload = body.payload;
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return json(res, 400, { configured: true, error: "Nedostaje payload objekat." });
      }
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
