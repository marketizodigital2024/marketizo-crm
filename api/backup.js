const system = require('../lib/system-backup.js');
const production = require('../lib/work-production-backup.js');
const questionnaires = require('../lib/questionnaire-backup.js');
const TABLE = process.env.SUPABASE_TABLE || "agency_crm_state";
const ROW_ID = process.env.CRM_STATE_ID || "marketizo-main";
const KPI_ROW_ID = "marketizo-kpi-v1";
const BACKUP_SLOTS = 30;
const BLOB_PREFIX = "marketizo-crm/daily/";

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function headers(key, prefer = "") {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

function viennaTime(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Vienna", weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

function backupCounts(state = {}) {
  return {
    employees: Array.isArray(state.employees) ? state.employees.length : 0,
    clients: Array.isArray(state.clients) ? state.clients.length : 0,
    workLogs: Array.isArray(state.employeeWorkLogs) ? state.employeeWorkLogs.length : 0,
    absences: Array.isArray(state.employeeAbsences) ? state.employeeAbsences.length : 0,
    activities: Array.isArray(state.employeeActivities) ? state.employeeActivities.length : 0,
  };
}

function summarizeBackup(row) {
  const state = row.payload?.state || {};
  const logs = Array.isArray(state.employeeWorkLogs) ? state.employeeWorkLogs : [];
  const dates = logs.map((log) => String(log.date || "")).filter(Boolean).sort();
  const storedCounts = row.counts || row.payload?.counts || null;
  return {
    slot: row.id,
    backupDate: row.backupDate || row.payload?.backupDate || "",
    sourceUpdatedAt: row.sourceUpdatedAt || row.payload?.sourceUpdatedAt || "",
    updatedAt: row.updated_at || "",
    workLogs: logs.length || storedCounts?.workLogs || null,
    firstWorkLogDate: dates[0] || row.firstWorkLogDate || row.payload?.firstWorkLogDate || "",
    lastWorkLogDate: dates[dates.length - 1] || row.lastWorkLogDate || row.payload?.lastWorkLogDate || "",
    septemberWorkLogs: logs.length
      ? logs.filter((log) => String(log.date || "").startsWith("2026-09-")).length
      : (row.septemberWorkLogs || row.payload?.septemberWorkLogs || null),
    septemberDates: logs.length
      ? [...new Set(logs.map((log) => String(log.date || "")).filter((date) => date.startsWith("2026-09-")))].sort()
      : (row.septemberDates || row.payload?.septemberDates || []),
  };
}

async function blobClient() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  return import("@vercel/blob");
}

async function listBlobBackups() {
  const blob = await blobClient();
  if (!blob) return { configured: false, blobs: [] };
  const blobs=[];let cursor;do{const page=await blob.list({prefix:BLOB_PREFIX,limit:1000,...(cursor?{cursor}:{})});blobs.push(...(page.blobs||[]));cursor=page.cursor;if(blobs.length>10000)throw Error('Previše kopija za bezbedno automatsko čišćenje.');}while(cursor);
  const result={blobs};
  return {
    configured: true,
    blobs: (result.blobs || []).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)),
  };
}

async function writeIndependentBackup(source, date, now, kpiSource = null, questionnaireSource = null, productionSource = null, systemDomains = null) {
  const blob = await blobClient();
  if (!blob) throw new Error("Vercel Blob backup nije povezan.");
  const document = {
    format: "marketizo-crm-backup-v1",
    backupDate: date,
    createdAt: now.toISOString(),
    sourceUpdatedAt: source.updated_at || "",
    state: source.payload,
    kpi: kpiSource?.payload || null,
    questionnaires: questionnaireSource,
    workProduction: productionSource,
    workProductionRequired: true,
    systemDomains,
    systemDomainsRequired: true,
  };
  document.integrity = production.documentIntegrity(document);
  const streaming=require('../lib/json-stream.js'),expected=streaming.digest(document);
  const body=require('node:stream').Readable.from(streaming.chunks(document));
  const pathname = `${BLOB_PREFIX}${date}-${require("node:crypto").randomUUID()}.json`;
  const uploaded = await blob.put(pathname, body, {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: false,
  });
  const verifiedCounts=await(async()=>{try{
    const downloaded=await blob.get(uploaded.pathname,{access:'private',useCache:false});
    if(!downloaded||downloaded.statusCode!==200||!downloaded.stream)throw Error('Vercel Blob backup nije moguće ponovo pročitati.');
    const actual=await streaming.readDigest(downloaded.stream);
    if(actual.size!==expected.size||actual.sha256!==expected.sha256)throw Error('Vercel Blob backup nije prošao proveru integriteta.');
    return backupCounts(source.payload);
  }catch(error){try{await blob.del(uploaded.pathname);}catch{}throw error;}})();
  let retained = null;
  let retentionWarning = "";
  try {
    const inventory = await listBlobBackups();
    const days=[...new Set(inventory.blobs.map(b=>b.pathname.slice(BLOB_PREFIX.length,BLOB_PREFIX.length+10)))].sort().reverse();
    const keep=new Set(days.slice(0,30));
    const obsolete=inventory.blobs.filter(b=>!keep.has(b.pathname.slice(BLOB_PREFIX.length,BLOB_PREFIX.length+10)));
    if (obsolete.length) await blob.del(obsolete.map((item) => item.url));
    retained = inventory.blobs.length-obsolete.length;
  } catch (error) {
    // The uploaded file was already read back and verified above. Inventory
    // cleanup is useful, but it must not invalidate a confirmed backup.
    retentionWarning = error?.message || "Backup retention cleanup failed";
  }
  return {
    pathname: uploaded.pathname,
    size: expected.size,
    retained,
    retentionWarning: retentionWarning || undefined,
    verified: true,
    counts: verifiedCounts,
    questionnaires: questionnaires.summary(document.questionnaires),
    workProduction: production.summary(document.workProduction),
    systemDomains: system.summary(document.systemDomains),
  };
}

module.exports = async function handler(req, res) {
 if(require('../lib/environment.js').blockProductionFeatureInPreview(res,typeof process==='undefined'?{}:process.env))return;
  if (!["GET","POST"].includes(req.method)) return send(res, 405, { error: "Method not allowed" });

  const url = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return send(res, 503, { error: "Supabase is not configured" });

  if (String(req.query?.inspect || "") === "1") {
    try {
      const { accessSession, readStoredState } = require("./state.js").helpers;
      const row = await readStoredState({ url, key });
      if (accessSession(req, row.payload, key)?.role !== "full-admin") return send(res, 401, { error: "Unauthorized" });
      if (String(req.query?.download || "") === "1") {
        const snap = await system.readSnapshot(url,key,fetch);
        const now=new Date(),v=viennaTime(now);
        return system.streamDocument(res,production.sealDocument({format:"marketizo-crm-backup-v1",backupDate:`${v.year}-${v.month}-${v.day}`,createdAt:now.toISOString(),sourceUpdatedAt:snap.updated_at,state:snap.payload,kpi:snap.kpi?.payload||null,questionnaires:snap.questionnaires,workProduction:snap.production,workProductionRequired:true,systemDomains:snap.systemDomains,systemDomainsRequired:true}));
      }

      if (String(req.query?.verify || "") === "1") {
        const pathname = String(req.query?.pathname || "");
        if (!/^marketizo-crm\/daily\/\d{4}-\d{2}-\d{2}(?:-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})?\.json$/.test(pathname)) return send(res, 400, { ok: false, error: "Nevažeća putanja backupa." });
        const blob = await blobClient();
        if (!blob) return send(res, 503, { ok: false, error: "Nezavisni backup nije povezan." });
        const downloaded = await blob.get(pathname, { access: "private", useCache: false });
        if (!downloaded || downloaded.statusCode !== 200 || !downloaded.stream) return send(res, 404, { ok: false, error: "Backup nije pronađen." });
        const document = JSON.parse(await new Response(downloaded.stream).text());
        const state = document.state;
        const integrityVerified = production.verifyDocument(document);
        if (document.systemDomainsRequired && (!system.valid(document.systemDomains) || !integrityVerified)) return send(res,422,{ok:false,error:"Backup dodatnih domena nije potvrđen."});
        if (document.format !== "marketizo-crm-backup-v1" || !state || Array.isArray(state) || !Array.isArray(state.employees) || !state.employees.length || !Array.isArray(state.clients) || !Array.isArray(state.employeeWorkLogs)) return send(res, 422, { ok: false, error: "Backup nije prošao proveru strukture." });
        if(document.workProductionRequired && !integrityVerified) return send(res,422,{ok:false,error:"Backup nije prošao proveru kontrolnog zbira."});
        if(document.workProductionRequired && !production.summary(document.workProduction).included) return send(res,422,{ok:false,error:"Backup nema obavezne podatke o količini."});
        const checksum = require("node:crypto").createHash("sha256").update(JSON.stringify(state)).digest("hex");
        return send(res, 200, { ok: true, verified: true, pathname, backupDate: document.backupDate,
          sourceUpdatedAt: document.sourceUpdatedAt, currentRevision: document.sourceUpdatedAt === row.updatedAt,
          questionnaires: questionnaires.summary(document.questionnaires),
          systemDomains: system.summary(document.systemDomains),
          workProduction: production.summary(document.workProduction),
          integrityVerified,
          counts: backupCounts(state), checksum, includesKpi: document.kpi != null,
          contractFiles: state.clients.filter(client => Boolean(client.contractFileData)).length,
          credentialsHashed: [...state.employees.map(e => e.password), ...state.clients.map(c => c.loginPassword)]
            .filter(Boolean).every(value => String(value).startsWith("crm$bcrypt-sha256$v1$")) });
      }
      const independent = await listBlobBackups();
      let rows = [];
      let recentById = new Map();
      let databaseWarning = "";
      // Do not download every multi-megabyte backup payload just to list them.
      // That response grows on every run and can make PostgREST return 500.
      const response = await fetch(`${url}/rest/v1/${TABLE}?and=(id.like.backup-*,id.not.like.backup-system-*)&select=id,updated_at&order=updated_at.desc`, {
        headers: headers(key),
      });
      if (response.ok) rows = await response.json();
      else databaseWarning = `Backup list failed (${response.status})`;
      if (rows.length) {
        const recentResponse = await fetch(`${url}/rest/v1/${TABLE}?and=(id.like.backup-*,id.not.like.backup-system-*)&select=id,payload,updated_at&order=updated_at.desc&limit=3`, {
          headers: headers(key),
        });
        if (recentResponse.ok) {
          const recentRows = await recentResponse.json();
          recentById = new Map(recentRows.map((row) => [row.id, row]));
        } else {
          databaseWarning = databaseWarning || `Recent backup check failed (${recentResponse.status})`;
        }
      }
      return send(res, 200, {
        ok: true,
        databaseWarning: databaseWarning || undefined,
        independent: {
          configured: independent.configured,
          count: independent.blobs.length,
          backups: independent.blobs.slice(0, 30).map((item) => ({
            pathname: item.pathname,
            size: item.size,
            uploadedAt: item.uploadedAt,
          })),
        },
        backups: rows.map((row) => summarizeBackup({ ...row, ...(recentById.get(row.id) || {}) })),
      });
    } catch (error) {
      return send(res, 500, { error: error?.message || "Backup inspection failed" });
    }
  }

  const cronSecret = process.env.CRON_SECRET || "";
  const authorization = String(req.headers.authorization || "");
  const cronAuthorized = cronSecret && authorization === `Bearer ${cronSecret}`;
  if (!cronAuthorized) {
    if (req.method !== "POST") return send(res, 401, { error: "Unauthorized" });
    const { accessSession, readStoredState } = require("./state.js").helpers;
    const current = await readStoredState({ url, key });
    if (accessSession(req, current.payload, key)?.role !== "full-admin") return send(res, 401, { error: "Unauthorized" });
  }
  if (process.env.VERCEL_ENV === "preview") return send(res, 409, { error: "Backup se pokreće samo iz glavne aplikacije." });

  try {
    const now = new Date();
    const vienna = viennaTime(now);
    const date = `${vienna.year}-${vienna.month}-${vienna.day}`;
    // Every authorized run writes and reads back the complete current snapshot.
    // An older same-day file must not suppress newly added backup domains.
    console.info('backup-phase',{stage:'snapshot-start',rss:process.memoryUsage?.().rss});
    const source = await system.readSnapshot(url,key,fetch);
    console.info('backup-phase',{stage:'snapshot-ready',rss:process.memoryUsage?.().rss});
    const productionSource = source.production;
    const kpiSource = source.kpi;

    const dayNumber = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86400000);
    const backupId = `backup-daily-${dayNumber % BACKUP_SLOTS}`;
    const workLogs = Array.isArray(source.payload.employeeWorkLogs) ? source.payload.employeeWorkLogs : [];
    const workLogDates = workLogs.map((log) => String(log.date || "")).filter(Boolean).sort();
    // Create and verify the independent copy first. The rotating database copy
    // is secondary and must not prevent a recoverable backup from being made.
    const questionnaireSource = source.questionnaires;
    const independent = await writeIndependentBackup(source, date, now, kpiSource, questionnaireSource, productionSource, source.systemDomains);

    console.info('backup-phase',{stage:'independent-verified',rss:process.memoryUsage?.().rss});
    let databaseWarning='',databaseVerified=false;
    try{
    const domainArchive=await system.writeDatabaseArchive(url,key,source.systemDomains,fetch,TABLE);
    const backupResponse = await require('../lib/database-request.js').request(fetch,`${url}/rest/v1/${TABLE}?on_conflict=id`, {
      method: "POST",
      headers: headers(key, "resolution=merge-duplicates,return=minimal"),
      body: JSON.stringify({
        id: backupId,
        payload: {
          backupDate: date,
          sourceUpdatedAt: source.updated_at || "",
          counts: backupCounts(source.payload),
          firstWorkLogDate: workLogDates[0] || "",
          lastWorkLogDate: workLogDates[workLogDates.length - 1] || "",
          septemberWorkLogs: workLogs.filter((log) => String(log.date || "").startsWith("2026-09-")).length,
          septemberDates: [...new Set(workLogs.map((log) => String(log.date || "")).filter((item) => item.startsWith("2026-09-")))].sort(),
          state: source.payload,
          kpi: kpiSource?.payload || null,
          questionnaires: questionnaireSource,
          workProduction: productionSource,
          workProductionRequired: true,
          systemDomainsArchive: domainArchive,
          systemDomainsRequired: true,
        },
        updated_at: now.toISOString(),
      }),
    });
    if(!backupResponse.ok)throw Error(`Backup write failed (${backupResponse.status})`);
      const check=await require('../lib/database-request.js').request(fetch,`${url}/rest/v1/${TABLE}?id=eq.${backupId}&select=payload`,{headers:headers(key)},20000);
      if(!check.ok)throw Error('Ponovno čitanje DB kopije nije uspelo.');
      const saved=(await check.json())[0]?.payload;
      if(!saved||!production.equal(saved.state,source.payload)||!production.equal(saved.kpi,kpiSource?.payload||null)||!questionnaires.equal(saved.questionnaires,questionnaireSource)||!production.equal(saved.workProduction,productionSource)||!production.equal(saved.systemDomainsArchive,domainArchive))throw Error('DB kopija nije prošla proveru sadržaja.');
      databaseVerified=true;
    }catch(error){databaseWarning=error.message;}


    return send(res, 200, {
      ok: true,
      backupDate: date,
      slot: backupId,
      employees: Array.isArray(source.payload.employees) ? source.payload.employees.length : 0,
      clients: Array.isArray(source.payload.clients) ? source.payload.clients.length : 0,
      workLogs: Array.isArray(source.payload.employeeWorkLogs) ? source.payload.employeeWorkLogs.length : 0,
      independent,
      questionnaires: questionnaires.summary(questionnaireSource),
      workProduction: production.summary(productionSource),
      systemDomains: system.summary(source.systemDomains),
      databaseVerified,
      databaseWarning: databaseWarning || undefined,
    });
  } catch (error) {
    return send(res, 500, { error: error?.message || "Backup failed" });
  }
};


