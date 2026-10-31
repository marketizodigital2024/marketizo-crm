const production = require('../lib/work-production-backup.js');
const questionnaires = require('../lib/questionnaire-backup.js');
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
  const cronAuthorized = !!process.env.CRON_SECRET && authorization === `Bearer ${process.env.CRON_SECRET}`;
  if (!authorization) return send(res,401,{ok:false,error:"Unauthorized"});
  const url = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key || !process.env.BLOB_READ_WRITE_TOKEN) {
    return send(res, 503, { ok: false, error: "Backup storage is not configured" });
  }

  try {
    const body = await readBody(req);
    if (process.env.VERCEL_ENV === "preview") return send(res, 409, {ok:false,error:"Restore provera se pokreće samo iz glavne aplikacije."});
    if (!cronAuthorized) {
      const { accessSession, readStoredState } = require("./state.js").helpers;
      const current = await readStoredState({url,key});
      if (accessSession(req,current.payload,key)?.role !== "full-admin" || body.confirm) return send(res,401,{ok:false,error:"Unauthorized"});
    }
    const pathname = String(body.pathname || "");
    if (!pathname.startsWith(BACKUP_PREFIX) || !pathname.endsWith(".json")) {
      return send(res, 400, { ok: false, error: "Nevažeća putanja backupa." });
    }
    const blob = await import("@vercel/blob");
    const downloaded = await blob.get(pathname, { access: "private", useCache: false });
    if (!downloaded || downloaded.statusCode !== 200 || !downloaded.stream) {
      return send(res, 404, { ok: false, error: "Backup nije pronađen." });
    }
    const document = JSON.parse(await new Response(downloaded.stream).text());
    if (!validBackup(document)) return send(res, 422, { ok: false, error: "Backup nije prošao proveru strukture." });

    if(document.workProductionRequired && !production.verifyDocument(document)) return send(res,422,{ok:false,error:"Backup nije prošao proveru kontrolnog zbira."});
    const productionCounts = production.summary(document.workProduction);
    if(document.workProductionRequired && !productionCounts.included) return send(res,422,{ok:false,error:"Backup nema obavezne podatke o količini."});
    const questionnaireCounts = questionnaires.summary(document.questionnaires);
    const currentQuestionnaires = await questionnaires.readSnapshot(url,key);
    const current = await production.readSnapshot(url,key,fetch);
    const kpiResponse = await fetch(`${url}/rest/v1/${TABLE}?id=eq.marketizo-kpi-v1&select=payload,updated_at`, { headers: supabaseHeaders(key) });
    if (!kpiResponse.ok) throw new Error(`KPI fetch failed (${kpiResponse.status})`);
    const currentKpi = (await kpiResponse.json())[0];
    const result = {
      ok: true,
      dryRun: body.confirm !== "RESTORE_MARKETIZO_BACKUP",
      pathname,
      backupDate: document.backupDate || "",
      sourceUpdatedAt: document.sourceUpdatedAt || "",
      backupCounts: counts(document.state),
      currentCounts: counts(current?.payload),
      includesKpi: document.kpi != null,
      questionnaires: questionnaireCounts,
      workProduction: productionCounts,
      currentWorkProduction: production.summary(current.production),
      restoreAllowed: productionCounts.included || current.production.outputs.length===0,
      currentQuestionnaires: questionnaires.summary(currentQuestionnaires),
      includesEmployeeAuth: true,
    };
    if (result.dryRun) return send(res, 200, result);
    if(!result.restoreAllowed) return send(res,409,{ok:false,error:"Stara kopija ne sadrži količine. Vraćanje bi ih razdvojilo od sati; koristi potpunu noviju kopiju."});
    if (!current?.payload || !current.updated_at) throw new Error("Trenutno live stanje nije pronađeno.");

    const now = new Date();
    const emergencyPath = `marketizo-crm/pre-restore/${now.toISOString().replace(/[:.]/g, "-")}.json`;
    const emergencyDocument = {
      format: "marketizo-crm-backup-v1",
      backupDate: now.toISOString().slice(0, 10),
      createdAt: now.toISOString(),
      sourceUpdatedAt: current.updated_at,
      state: current.payload,
      kpi: currentKpi?.payload || null,
      questionnaires: currentQuestionnaires,
      workProduction: current.production,
      workProductionRequired: true,
    };
    emergencyDocument.integrity = production.documentIntegrity(emergencyDocument);
    await blob.put(emergencyPath, JSON.stringify(emergencyDocument), { access: "private", contentType: "application/json", addRandomSuffix: false });
    const emergencyRead = await blob.get(emergencyPath, { access:"private", useCache:false });
    if (!emergencyRead || emergencyRead.statusCode !== 200 || !emergencyRead.stream || !questionnaires.equal(JSON.parse(await new Response(emergencyRead.stream).text()), emergencyDocument)) throw new Error("Sigurnosna kopija pre vraćanja nije potvrđena.");

    const restoreResponse = await fetch(`${url}/rest/v1/rpc/marketizo_restore_complete_backup_with_production`, {
      method: "POST",
      headers: supabaseHeaders(key),
      body: JSON.stringify({ p_state: document.state, p_kpi: document.kpi || null, p_expected_state_at: current.updated_at, p_expected_kpi_at: currentKpi?.updated_at || null, p_questionnaires: document.questionnaires || null, p_expected_questionnaires: currentQuestionnaires, p_production: document.workProduction || null, p_expected_production: current.production }),
    });
    if (!restoreResponse.ok) throw new Error(`Restore failed (${restoreResponse.status})`);
    const restored = await restoreResponse.json();
    if (!restored.ok) return send(res, 409, { ok: false, error: "Live podaci su se promenili tokom vraćanja. Restore je zaustavljen." });
    return send(res, 200, { ...result, ...restored, dryRun: false, emergencyBackup: emergencyPath });
  } catch (error) {
    return send(res, 500, { ok: false, error: error?.message || "Restore failed" });
  }
};


