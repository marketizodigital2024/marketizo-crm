import "dotenv/config";
import QRCode from "qrcode";
import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import OpenAI, { toFile } from "openai";
import whatsapp from "whatsapp-web.js";
import { analyzeFollowup, analyzeMessage } from "./analyze.js";

const { Client, LocalAuth } = whatsapp;
const required = ["OPENAI_API_KEY", "ALERT_TO"];

for (const name of required) {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: Number(process.env.OPENAI_TIMEOUT_MS || 300000),
  maxRetries: Number(process.env.OPENAI_MAX_RETRIES || 2)
});
const routineModel = process.env.OPENAI_ROUTINE_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
const smartModel = process.env.OPENAI_SMART_MODEL || "gpt-6-astra";
const model = smartModel;
const reasoningEffort = process.env.OPENAI_REASONING_EFFORT || "xhigh";
const alertTo = process.env.ALERT_TO;
const alertNumber = alertTo.split("@")[0].replace(/\D/g, "");
const port = Number(process.env.PORT || 3000);
const pairingToken = crypto.randomBytes(24).toString("hex");
const pairingAlias = "/pair/marketizo-reconnect";
let qrDataUrl = null;
const teamGroupName = process.env.TEAM_GROUP_NAME || "Marketizo Digital";
const responseSlaMinutes = Number(process.env.RESPONSE_SLA_MINUTES || 180);
const responseTimezone = process.env.RESPONSE_TIMEZONE || "Europe/Vienna";
const whatsappOperationTimeoutMs = Number(process.env.WHATSAPP_OPERATION_TIMEOUT_MS || 45000);
const whatsappProtocolTimeoutMs = Number(process.env.WHATSAPP_PROTOCOL_TIMEOUT_MS || 120000);
const whatsappHealthIntervalMs = Number(process.env.WHATSAPP_HEALTH_INTERVAL_MS || 300000);
const whatsappHealthFailureLimit = Number(process.env.WHATSAPP_HEALTH_FAILURE_LIMIT || 2);
const reportDeliveryVersion = process.env.REPORT_DELIVERY_VERSION || "2026-09-10-hybrid-1";
const hybridTrialStartedAt = process.env.HYBRID_TRIAL_STARTED_AT || "2026-09-10";
const deploymentTestVersion = "2026-09-11-stability-test-1";
const yesterdayAnalysisTestVersion = "2026-09-11-yesterday-analysis-1";

function reasoningOptions() {
  return String(model).startsWith("gpt-6")
    ? { reasoning_effort: reasoningEffort }
    : { temperature: 0 };
}
const stateDirectory = process.env.WWEBJS_AUTH_PATH
  ? path.dirname(process.env.WWEBJS_AUTH_PATH)
  : process.cwd();
const responseStatePath = process.env.RESPONSE_WATCH_STATE_PATH
  || path.join(stateDirectory, "marketizo-response-watch.json");
const dailyStatePath = process.env.DAILY_REPORT_STATE_PATH
  || path.join(stateDirectory, "marketizo-daily-report.json");
const conversationStatePath = process.env.CONVERSATION_STATE_PATH
  || path.join(stateDirectory, "marketizo-group-context.json");
const followupStatePath = process.env.FOLLOWUP_STATE_PATH
  || path.join(stateDirectory, "marketizo-followups.json");
const clientWaitStatePath = process.env.CLIENT_WAIT_STATE_PATH
  || path.join(stateDirectory, "marketizo-client-wait.json");
const processedMessagesStatePath = process.env.PROCESSED_MESSAGES_STATE_PATH
  || path.join(stateDirectory, "marketizo-processed-messages.json");
const teamMemberIds = new Set();
const teamMemberNumbers = new Set();
const teamMemberNames = new Set();
const pendingByGroup = new Map();
const responseTimers = new Map();
const groupHistory = new Map();
const openIssues = new Map();
const commitments = new Map();
const commitmentTimers = new Map();
const awaitingClientByGroup = new Map();
const clientWaitTimers = new Map();
const teamAcknowledgedMessageIds = new Set();
const processedMessageIds = new Set();
const processingMessageIds = new Set();
let dailyState = { lastReportDate: "", lastReportVersion: "", lastMorningDate: "", lastWeeklyDate: "", events: [], modelUsage: {} };
const monitoredGroups = new Set(
  (process.env.MONITORED_GROUPS || "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
);

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "marketizo-client-care",
    dataPath: process.env.WWEBJS_AUTH_PATH || undefined
  }),
  puppeteer: {
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    protocolTimeout: whatsappProtocolTimeoutMs,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-extensions",
      "--disable-background-networking"
    ]
  }
});

let dailySchedulerStarted = false;
let morningReportInFlight = false;
let closingReportInFlight = false;
let whatsappReady = false;
let healthTimer = null;
let initializationTimer = null;
let consecutiveHealthFailures = 0;
let lastHealthCheckAt = 0;
let lastIncomingMessageAt = 0;
let lastProcessedMessageAt = 0;
let fatalExitScheduled = false;

const rawCompletionCreate = openai.chat.completions.create.bind(openai.chat.completions);
openai.chat.completions.create = async (params, options) => {
  const response = await rawCompletionCreate(params, options);
  const usage = response.usage || {};
  const key = String(params.model || "unknown");
  const current = dailyState.modelUsage?.[key] || { calls: 0, inputTokens: 0, outputTokens: 0 };
  dailyState.modelUsage = dailyState.modelUsage || {};
  dailyState.modelUsage[key] = {
    calls: current.calls + 1,
    inputTokens: current.inputTokens + Number(usage.prompt_tokens || 0),
    outputTokens: current.outputTokens + Number(usage.completion_tokens || 0)
  };
  saveDailyState();
  console.log(`[OPENAI_USAGE] trial=${hybridTrialStartedAt} model=${key} input=${usage.prompt_tokens || 0} output=${usage.completion_tokens || 0}`);
  return response;
};

function saveAllState() {
  saveDailyState();
  saveResponseState();
  saveGroupHistory();
  saveFollowupState();
  saveClientWaitState();
  saveProcessedMessagesState();
}

function saveProcessedMessagesState() {
  try {
    fs.mkdirSync(path.dirname(processedMessagesStatePath), { recursive: true });
    const ids = [...processedMessageIds].slice(-2000);
    const tempPath = `${processedMessagesStatePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify({ schemaVersion: 1, ids }, null, 2));
    fs.renameSync(tempPath, processedMessagesStatePath);
  } catch (error) {
    console.error("Processed-message state save failed:", error);
  }
}

function loadProcessedMessagesState() {
  try {
    if (!fs.existsSync(processedMessagesStatePath)) return;
    const stored = JSON.parse(fs.readFileSync(processedMessagesStatePath, "utf8"));
    if (stored.schemaVersion !== 1 || !Array.isArray(stored.ids)) return;
    for (const id of stored.ids.slice(-2000)) processedMessageIds.add(String(id));
    console.log(`Processed-message deduplication restored: ${processedMessageIds.size} ID(s).`);
  } catch (error) {
    console.error("Processed-message state restore failed:", error);
  }
}

function markMessageProcessed(messageId) {
  if (!messageId) return;
  processingMessageIds.delete(messageId);
  processedMessageIds.add(messageId);
  while (processedMessageIds.size > 2000) processedMessageIds.delete(processedMessageIds.values().next().value);
  lastProcessedMessageAt = Date.now();
  saveProcessedMessagesState();
}

function recoveryWorthy(error) {
  const message = String(error?.stack || error?.message || error || "");
  return /ProtocolError|Runtime\.callFunctionOn|Target closed|Session closed|Execution context|detached Frame/i.test(message);
}

function scheduleProcessRecovery(reason, error) {
  if (fatalExitScheduled) return;
  fatalExitScheduled = true;
  whatsappReady = false;
  console.error(`[RECOVERY] ${reason}; saving state and restarting the process`, error || "");
  try {
    saveAllState();
  } catch (saveError) {
    console.error("Recovery state save failed:", saveError);
  }
  const forceExit = setTimeout(() => process.exit(1), 10000);
  forceExit.unref();
  void Promise.resolve(client.destroy())
    .catch((destroyError) => console.error("WhatsApp cleanup before restart failed:", destroyError))
    .finally(() => process.exit(1));
}

async function withTimeout(promise, label, timeoutMs = whatsappOperationTimeoutMs) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function sendWhatsappMessage(to, body, label = "WhatsApp send") {
  try {
    const safeBody = String(body || "").slice(0, 3500);
    const result = await withTimeout(client.sendMessage(to, safeBody), label);
    consecutiveHealthFailures = 0;
    lastHealthCheckAt = Date.now();
    return result;
  } catch (error) {
    console.error(`[WHATSAPP_SEND_FAILED] ${label}:`, error);
    if (recoveryWorthy(error)) scheduleProcessRecovery(`${label} failed`, error);
    throw error;
  }
}

async function checkWhatsAppHealth() {
  if (!whatsappReady || fatalExitScheduled) return;
  try {
    const state = await withTimeout(client.getState(), "WhatsApp health check");
    if (state !== "CONNECTED") throw new Error(`WhatsApp state is ${state || "unknown"}`);
    consecutiveHealthFailures = 0;
    lastHealthCheckAt = Date.now();
    console.log(`[HEALTH] WhatsApp CONNECTED at ${new Date(lastHealthCheckAt).toISOString()}`);
  } catch (error) {
    consecutiveHealthFailures += 1;
    console.error(`[HEALTH] WhatsApp check failed ${consecutiveHealthFailures}/${whatsappHealthFailureLimit}:`, error);
    if (consecutiveHealthFailures >= whatsappHealthFailureLimit || recoveryWorthy(error)) {
      scheduleProcessRecovery("WhatsApp health check failed", error);
    }
  }
}

async function sendDeploymentTest() {
  if (dailyState.lastDeploymentTestVersion === deploymentTestVersion) return;
  await sendWhatsappMessage(alertTo, [
    "*Marketizo agent — test*",
    "Agent je povezan i ova poruka je poslata iz aktivnog produkcionog sistema.",
    "Rutinske poruke procenjujem brzo, a važne, nejasne ili rizične situacije šaljem dubljem Astra mozgu. Javljam ti samo ono što stvarno traži tvoju pažnju."
  ].join("\n\n"), "deployment test");
  dailyState.lastDeploymentTestVersion = deploymentTestVersion;
  saveDailyState();
  console.log(`[DEPLOYMENT_TEST] ${deploymentTestVersion}: private test sent`);
}

async function sendYesterdayAnalysisTest() {
  if (dailyState.lastYesterdayAnalysisTestVersion === yesterdayAnalysisTestVersion) return;
  const yesterday = viennaDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const events = dailyState.events.filter((event) => event.date === yesterday);
  const snapshot = ownerActionSnapshot();
  const completion = await openai.chat.completions.create({
    model,
    ...reasoningOptions(),
    messages: [
      {
        role: "system",
        content: "Napiši Miljanu kratak, ljudski test-izveštaj o jučerašnjim Marketizo klijentima na srpskom. Koristi samo dostavljene stvarne podatke. Proceni šta je za vlasnika zaista važno: nezadovoljstvo, ozbiljan rizik, probijen rok, blokadu, važnu pohvalu ili odluku. Rutinu izostavi. Za svaku relevantnu grupu napiši u posebnom redu *Tačan naziv klijentske grupe*, a ispod kratak prirodan pasus: šta se desilo, da li je sada rešeno i šta je sledeći potez. Zvezdice koristi samo za podebljano ime grupe; bez lista, tabela, emodžija i proceduralnih rubrika. Proveri recentGroupMessages pre nego što nešto nazoveš nerešenim. Ako nema dovoljno jučerašnjih podataka za pouzdan zaključak, reci to jasno i ne izmišljaj."
      },
      {
        role: "user",
        content: JSON.stringify({
          date: yesterday,
          teamMembers: [...teamMemberNames],
          yesterdayEvents: events,
          unresolvedIssuesNow: snapshot.issues,
          clientsWaitingForTeamNow: snapshot.pending,
          silentClientsNow: snapshot.silentClients,
          activeCommitmentsNow: snapshot.activeCommitments,
          recentGroupMessages: snapshot.recentGroupMessages
        })
      }
    ]
  });
  const report = String(completion.choices[0]?.message?.content || "Nema dovoljno podataka za pouzdanu analizu jučerašnjih klijenata.").trim().slice(0, 1200);
  await sendWhatsappMessage(alertTo, "*Test — analiza klijenata od juče*", "yesterday analysis test heading");
  const chunks = report.match(/[\s\S]{1,280}(?:\s|$)/g) || [report];
  for (const [index, chunk] of chunks.entries()) {
    await sendWhatsappMessage(alertTo, chunk.trim(), `yesterday analysis test ${index + 1}/${chunks.length}`);
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  dailyState.lastYesterdayAnalysisTestVersion = yesterdayAnalysisTestVersion;
  saveDailyState();
  console.log(`[YESTERDAY_ANALYSIS_TEST] ${yesterdayAnalysisTestVersion}: private report sent`);
}

function startWhatsAppHealthWatchdog() {
  clearInterval(healthTimer);
  void checkWhatsAppHealth();
  healthTimer = setInterval(() => void checkWhatsAppHealth(), whatsappHealthIntervalMs);
  healthTimer.unref();
}

const workTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: responseTimezone,
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23"
});

function serializedId(id) {
  if (typeof id === "string") return id;
  return id?._serialized || id?.$1 || (id?.user ? `${id.user}@${id.server || "c.us"}` : "");
}

function normalizedDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizedName(value) {
  return String(value || "")
    .toLocaleLowerCase("sr-Latn")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function queryTokenMatches(value, token) {
  const normalizedValue = normalizedName(value);
  const normalizedToken = normalizedName(token);
  if (!normalizedValue || !normalizedToken) return false;
  if (normalizedValue.includes(normalizedToken)) return true;
  if (normalizedToken.length >= 5) {
    const stem = normalizedToken.slice(0, -1);
    return normalizedValue.split(" ").some((part) => part.startsWith(stem));
  }
  return false;
}

function isTeamSender(message, contact) {
  const ids = [serializedId(message.author), serializedId(contact?.id), serializedId(message.from)].filter(Boolean);
  if (ids.some((id) => teamMemberIds.has(id))) return true;
  const numbers = [contact?.number, contact?.id?.user, message.author?.user]
    .map(normalizedDigits)
    .filter(Boolean);
  if (numbers.some((number) => teamMemberNumbers.has(number))) return true;
  const names = [contact?.pushname, contact?.name, contact?.shortName]
    .map(normalizedName)
    .filter(Boolean);
  return names.some((name) => teamMemberNames.has(name));
}

function isKnownTeamId(id) {
  const serialized = serializedId(id);
  return teamMemberIds.has(serialized) || teamMemberNumbers.has(normalizedDigits(id?.user || serialized));
}

function viennaParts(date = new Date()) {
  return Object.fromEntries(
    workTimeFormatter.formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
}

function viennaDateKey(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: responseTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(date);
}

function isWorkingMinute(date) {
  const parts = viennaParts(date);
  if (parts.weekday === "Sat" || parts.weekday === "Sun") return false;
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  return minutes >= 9 * 60 && minutes < 17 * 60 + 30;
}

function saveDailyState() {
  try {
    fs.mkdirSync(path.dirname(dailyStatePath), { recursive: true });
    const tempPath = `${dailyStatePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(dailyState, null, 2));
    fs.renameSync(tempPath, dailyStatePath);
  } catch (error) {
    console.error("Daily report state save failed:", error);
  }
}

function loadDailyState() {
  try {
    if (fs.existsSync(dailyStatePath)) {
      dailyState = JSON.parse(fs.readFileSync(dailyStatePath, "utf8"));
    }
  } catch (error) {
    console.error("Daily report state restore failed:", error);
    dailyState = { lastReportDate: "", lastReportVersion: "", lastMorningDate: "", lastWeeklyDate: "", events: [], modelUsage: {} };
  }
}

function saveGroupHistory() {
  try {
    fs.mkdirSync(path.dirname(conversationStatePath), { recursive: true });
    const tempPath = `${conversationStatePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(Object.fromEntries(groupHistory), null, 2));
    fs.renameSync(tempPath, conversationStatePath);
  } catch (error) {
    console.error("Group context save failed:", error);
  }
}

function loadGroupHistory() {
  try {
    if (!fs.existsSync(conversationStatePath)) return;
    const stored = JSON.parse(fs.readFileSync(conversationStatePath, "utf8"));
    for (const [groupId, messages] of Object.entries(stored)) {
      groupHistory.set(groupId, Array.isArray(messages) ? messages.slice(-60) : []);
    }
    console.log(`Group context restored: ${groupHistory.size} group(s).`);
  } catch (error) {
    console.error("Group context restore failed:", error);
  }
}

function rememberGroupMessage(groupId, groupName, sender, source, text) {
  if (!text) return;
  const messages = groupHistory.get(groupId) || [];
  messages.push({
    groupName,
    sender,
    source,
    text: String(text).slice(0, 1500),
    at: new Date().toISOString()
  });
  groupHistory.set(groupId, messages.slice(-60));
  saveGroupHistory();
}

function saveFollowupState() {
  try {
    fs.mkdirSync(path.dirname(followupStatePath), { recursive: true });
    const tempPath = `${followupStatePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify({
      schemaVersion: 2,
      issues: [...openIssues.values()],
      commitments: [...commitments.values()]
    }, null, 2));
    fs.renameSync(tempPath, followupStatePath);
  } catch (error) {
    console.error("Follow-up state save failed:", error);
  }
}

async function sendCommitmentOverdueAlert(record) {
  record.alerted = true;
  commitments.set(record.groupId, record);
  recordDailyEvent({ type: "COMMITMENT", group: record.groupName, summary: `Probijen rok: ${record.summary}` });
  saveFollowupState();
}

function scheduleCommitment(record) {
  clearTimeout(commitmentTimers.get(record.groupId));
  if (record.completed || record.alerted) return;
  const due = new Date(record.dueAt).getTime();
  if (!Number.isFinite(due)) return;
  const timer = setTimeout(() => {
    void sendCommitmentOverdueAlert(record).catch((error) => console.error("Commitment alert failed:", error));
  }, Math.min(Math.max(0, due - Date.now()), 2147483647));
  commitmentTimers.set(record.groupId, timer);
}

function loadFollowupState() {
  try {
    if (!fs.existsSync(followupStatePath)) return;
    const stored = JSON.parse(fs.readFileSync(followupStatePath, "utf8"));
    if (stored.schemaVersion !== 2) {
      openIssues.clear();
      commitments.clear();
      saveFollowupState();
      console.log("Follow-up state reset after employee-classification upgrade.");
      return;
    }
    for (const issue of stored.issues || []) openIssues.set(issue.groupId, issue);
    for (const record of stored.commitments || []) {
      commitments.set(record.groupId, record);
      scheduleCommitment(record);
    }
    console.log(`Follow-up state restored: ${openIssues.size} issue(s), ${commitments.size} commitment(s).`);
  } catch (error) {
    console.error("Follow-up state restore failed:", error);
  }
}

async function updateFollowups(message, chat, senderName, source, messageText) {
  const groupId = message.from;
  const existingIssue = openIssues.get(groupId) || null;
  const existingCommitment = commitments.get(groupId) || null;
  const recentConversation = (groupHistory.get(groupId) || []).slice(-12);
  const result = await analyzeFollowup(openai, model, {
    now: new Date().toISOString(),
    timezone: responseTimezone,
    group: chat.name,
    latestMessage: { sender: senderName, source, text: messageText },
    recentConversation,
    openIssue: existingIssue,
    currentCommitment: existingCommitment
  });

  if (result.issueAction === "OPEN" || result.issueAction === "KEEP_OPEN") {
    openIssues.set(groupId, {
      groupId,
      groupName: chat.name,
      summary: result.issueSummary || existingIssue?.summary || messageText.slice(0, 300),
      openedAt: existingIssue?.openedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  } else if (result.issueAction === "RESOLVE" && existingIssue) {
    openIssues.delete(groupId);
    recordDailyEvent({ type: "RESOLVED", group: chat.name, summary: result.resolutionEvidence || existingIssue.summary });
  }

  if (result.commitmentCompleted && existingCommitment) {
    clearTimeout(commitmentTimers.get(groupId));
    commitmentTimers.delete(groupId);
    commitments.delete(groupId);
    recordDailyEvent({ type: "COMPLETED", group: chat.name, summary: existingCommitment.summary });
  } else if (source === "team" && result.commitment && result.commitmentDueAt) {
    const due = new Date(result.commitmentDueAt);
    if (Number.isFinite(due.getTime()) && due.getTime() > Date.now()) {
      const record = {
        groupId,
        groupName: chat.name,
        summary: result.commitmentSummary || messageText.slice(0, 300),
        owner: result.commitmentOwner || senderName,
        dueAt: due.toISOString(),
        alerted: false,
        completed: false
      };
      commitments.set(groupId, record);
      scheduleCommitment(record);
    }
  }
  saveFollowupState();
}

async function answerOwnerQuestion(message) {
  const question = String(message.body || "").trim() || "Daj mi pregled najvažnijih stvari.";
  const storedHistory = [...groupHistory.values()]
    .flat()
    .sort((a, b) => String(a.at).localeCompare(String(b.at)))
    .slice(-300);
  const chats = await client.getChats();
  const clientGroups = chats.filter((chat) => chat.isGroup
    && chat.name !== teamGroupName
    && (!monitoredGroups.size || monitoredGroups.has(chat.name)));
  const queryTokens = question.toLocaleLowerCase("sr-Latn")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 2 && !["sta", "šta", "kod", "grupi", "grupa", "cemu", "čemu", "radi", "ima"].includes(token));
  let matchingGroups = clientGroups.filter((chat) => queryTokens.some((token) => queryTokenMatches(chat.name, token)));
  if (!matchingGroups.length && queryTokens.length) {
    const participantMatches = await Promise.all(clientGroups.map(async (chat) => {
      for (const participant of chat.participants || []) {
        if (isKnownTeamId(participant.id)) continue;
        try {
          const contact = await client.getContactById(serializedId(participant.id));
          const names = [contact?.pushname, contact?.name, contact?.shortName];
          if (names.some((name) => queryTokens.some((token) => queryTokenMatches(name, token)))) return chat;
        } catch (error) {
          console.error(`[PRIVATE_LOOKUP] Could not resolve one participant in ${chat.name}:`, error);
        }
      }
      return null;
    }));
    matchingGroups = participantMatches.filter(Boolean);
  }
  const groupsToRead = matchingGroups.length ? matchingGroups : clientGroups;
  const liveHistory = (await Promise.all(groupsToRead.map(async (chat) => {
    try {
      const messages = await chat.fetchMessages({ limit: 50 });
      return messages
        .filter((item) => !item.fromMe && String(item.body || "").trim())
        .map((item) => ({
          groupName: chat.name,
          sender: serializedId(item.author || item.from),
          source: isKnownTeamId(item.author || item.from) ? "team" : "client",
          text: String(item.body).slice(0, 1500),
          at: new Date(item.timestamp * 1000).toISOString()
        }));
    } catch (error) {
      console.error(`[PRIVATE_CONTEXT] Could not read ${chat.name}:`, error);
      return [];
    }
  }))).flat();
  const relevantStoredHistory = matchingGroups.length
    ? storedHistory.filter((item) => matchingGroups.some((chat) => chat.name === item.groupName))
    : storedHistory;
  const history = [...relevantStoredHistory, ...liveHistory]
    .sort((a, b) => String(a.at).localeCompare(String(b.at)))
    .slice(-300);
  const waitingForReply = [...pendingByGroup.values()].map((record) => ({
    group: record.groupName,
    client: record.senderName,
    message: record.message,
    deadline: record.deadline
  }));
  const unresolvedIssues = [...openIssues.values()];
  const activeCommitments = [...commitments.values()].filter((record) => !record.completed);
  const silentClients = [...awaitingClientByGroup.values()].filter((record) => record.alerted);
  const response = await openai.chat.completions.create({
    model,
    ...reasoningOptions(),
    messages: [
      {
        role: "system",
        content: [
          "Ti si Miljanov privatni operativni direktor i savetnik za Marketizo. Pratiš komunikaciju kao iskusan zaposleni koji razume marketing agenciju, odnose sa klijentima, kvalitet rada, rokove, kampanje, sadržaj, leadove i rizik od prekida saradnje.",
          `Članovi WhatsApp grupe ${teamGroupName} su zaposleni Marketiza. Miljan i Ivana su vlasnici i deo tima. U svim ostalim grupama, osobe iz teamMembers su zaposleni, a svi ostali učesnici su klijenti. Naziv grupe koristi kao naziv klijenta.`,
          "Razmišljaj kao iskusan direktor agencije: poveži više poruka, promenu tona, ranija obećanja, kvalitet izvršenja, odnose među ljudima, rizik po prihod i reputaciju i posledice po garanciju od 30 leadova.",
          "Nemoj samo proveravati da li je neko prekršio pravilo. Proceni šta se verovatno stvarno dešava, koliko je ozbiljno, šta je dokaz, šta je samo pretpostavka i koja odluka ima najveću vrednost za Miljana.",
          "Odgovaraj prirodno, direktno i konkretno, kao sposobna osoba koja je pročitala razgovor i napisala Miljanu kratak lični izveštaj — nikada kao generički bot ili automatski šablon.",
          "Kada Miljan direktno postavi pitanje, ne primenjuj pravilo tihih proaktivnih upozorenja: pregledaj sav dati relevantni kontekst i odgovori potpuno.",
          "Objasni šta se dogodilo, šta su napisali klijent i tim, šta je završeno, šta nije, ko čeka koga, kakav je ton, koja obećanja i rokovi postoje, da li se vidi obrazac ili skriveni rizik i koji je najbolji naredni potez.",
          "Koristi isključivo dati kontekst iz WhatsApp grupa koje agent prati. Razlikuj činjenice od procene i jasno označi procenu.",
          "Prepoznaj klijenta kada je Miljan napisao deo naziva, ime učesnika, padežni oblik imena ili malu slovnu grešku.",
          "Ako odgovor nije u kontekstu, reci da nema dovoljno informacija.",
          "Ne obećavaj rokove, rezultate, povrat novca niti bilo kakvu obavezu u ime Marketiza.",
          "Svi ljudi iz teamMembers su zaposleni Marketiza, nikada klijenti. Ostali učesnici klijentskih grupa su klijenti.",
          "Ne izmišljaj činjenice. Navedi konkretno šta je ko napisao i kada, ako je to dostupno i važno.",
          "Ne počinji uvek istim naslovom ili frazom. Za svakog klijenta napiši u posebnom redu *Tačan naziv klijentske grupe*, pa ispod kratak prirodan pasus. Ne zatrpavaj Miljana sirovim porukama i ne ponavljaj isto.",
          "Najpre prenesi suštinu konkretnog slučaja, zatim prirodno dodaj svoju procenu i preporuku kada su potrebne.",
          "Ako nema stvarnog problema, reci to jasno. Ako vidiš rizik koji tim možda previđa, reci Miljanu otvoreno koliko je ozbiljan i zašto."
        ].join(" ")
      },
      {
        role: "user",
        content: JSON.stringify({ teamMembers: [...teamMemberNames], recentGroupMessages: history, clientsWaitingForTeam: waitingForReply, silentClients, unresolvedIssues, activeCommitments, question })
      }
    ]
  });
  const answer = String(response.choices[0]?.message?.content || "Nemam dovoljno informacija.").trim();
  await message.reply(answer);
  console.log("[PRIVATE_AI_REPLY] answered Miljan's question");
}

async function isOwnerPrivateMessage(message) {
  if (message.from === alertTo) return true;
  const privateContact = await message.getContact();
  const candidates = [privateContact.number, serializedId(privateContact.id)];
  try {
    candidates.push(await privateContact.getFormattedNumber());
  } catch {
    // Some WhatsApp LID contacts do not expose a formatted phone number.
  }
  if (candidates.some((value) => String(value || "").replace(/\D/g, "") === alertNumber)) {
    return true;
  }

  // WhatsApp can deliver the same private chat under an internal LID instead of
  // the phone-number ID. The owner chat is also the only private chat that has
  // previously received our branded alerts, so use that history as a safe match.
  const privateChat = await message.getChat();
  const recent = await privateChat.fetchMessages({ limit: 30 });
  return recent.some((item) => item.fromMe && /(?:MARKETIZO (?:CLIENT UPDATE|DNEVNI PREGLED|— KLIJENT ČEKA ODGOVOR)|Marketizo agent — test)/i.test(String(item.body || "")));
}

function recordDailyEvent(event) {
  const today = viennaDateKey();
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  dailyState.events = dailyState.events
    .filter((item) => new Date(item.at || 0).getTime() >= cutoff)
    .concat({ ...event, date: today, at: new Date().toISOString() })
    .slice(-1000);
  saveDailyState();
}

function ownerActionSnapshot() {
  const pending = [...pendingByGroup.values()];
  const issues = [...openIssues.values()];
  const activeCommitments = [...commitments.values()].filter((record) => !record.completed);
  const silentClients = [...awaitingClientByGroup.values()].filter((record) => record.alerted);
  const recentGroupMessages = [...groupHistory.values()]
    .flat()
    .sort((a, b) => String(a.at).localeCompare(String(b.at)))
    .slice(-300);
  return { pending, issues, activeCommitments, silentClients, recentGroupMessages };
}

async function sendMorningReport() {
  const today = viennaDateKey();
  const snapshot = ownerActionSnapshot();
  const relevantCommitments = snapshot.activeCommitments.filter((record) => viennaDateKey(new Date(record.dueAt)) <= today);
  if (!snapshot.pending.length && !snapshot.issues.length && !relevantCommitments.length && !snapshot.silentClients.length) {
    dailyState.lastMorningDate = today;
    saveDailyState();
    console.log(`[MORNING_REPORT] ${today}: skipped, nothing actionable`);
    return;
  }
  const completion = await openai.chat.completions.create({
    model,
    ...reasoningOptions(),
    messages: [
      { role: "system", content: "Napiši Miljanu kratak jutarnji vlasnički pregled na srpskom kao osoba koja poznaje tim i izdvaja samo ono važno. Proceni kontekst i poslovnu posledicu, ne popunjavaj proceduralni šablon. Svaku relevantnu grupu prikaži ovako: u posebnom redu *Tačan naziv klijentske grupe*, a ispod jedan kratak ljudski pasus sa stanjem, značenjem i narednim potezom. Zvezdice koristi isključivo kao WhatsApp podebljanje oko imena klijenta; ne koristi markdown liste, druge naslove, emodžije ni rubrike. Svi ljudi iz teamMembers su zaposleni Marketiza, nikada klijenti. pendingReplies znači da klijent čeka odgovor zaposlenog duže od tri radna sata. silentClients znači da zaposleni čeka odgovor klijenta duže od 48 sati. Pre zaključka proveri recentGroupMessages. Ako je rešeno, ne navodi ga. Ako nije, reci ko treba da preuzme i do kada. Miljanu izdvoji samo ono što traži njegovu odluku ili nosi ozbiljan rizik. Ne izmišljaj činjenice." },
      { role: "user", content: JSON.stringify({ date: today, teamMembers: [...teamMemberNames], clientsWaitingForTeam: snapshot.pending, unresolvedIssues: snapshot.issues, dueCommitments: relevantCommitments, silentClients: snapshot.silentClients, recentGroupMessages: snapshot.recentGroupMessages }) }
    ]
  });
  await sendWhatsappMessage(alertTo, String(completion.choices[0]?.message?.content || "").trim(), "morning report");
  dailyState.lastMorningDate = today;
  saveDailyState();
}

async function sendWeeklyReport() {
  const today = viennaDateKey();
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklyEvents = dailyState.events.filter((event) => new Date(event.at || 0).getTime() >= cutoff);
  const snapshot = ownerActionSnapshot();
  const completion = await openai.chat.completions.create({
    model,
    ...reasoningOptions(),
    messages: [
      { role: "system", content: "Napiši Miljanu nedeljni vlasnički izveštaj na srpskom kao iskusan rukovodilac koji je stvarno pratio klijentske grupe. Proceni obrazac, ton, obećanja i poslovnu posledicu; nemoj mehanički slediti kategorije. Svaku relevantnu grupu prikaži ovako: u posebnom redu *Tačan naziv klijentske grupe*, a ispod kratak ljudski pasus sa zaključkom, trenutnim stanjem i sledećim potezom. Zvezdice koristi isključivo kao WhatsApp podebljanje oko imena klijenta; bez markdown lista, tabela, drugih naslova, emodžija i praznih fraza. Izdvoji ponovljene probleme, ozbiljne rizike, probijene rokove, važne pohvale ili rezultate. Ne predstavljaj rešenu žalbu kao aktuelan problem. Proveri recentGroupMessages pre zaključka. Na kraju dodaj jedan kratak prirodan pasus o najvažnijim prioritetima naredne nedelje samo ako postoje. Miljanu eskaliraj samo odluke, ozbiljan rizik i probleme koje tim nije zatvorio. Ne izmišljaj činjenice." },
      { role: "user", content: JSON.stringify({ endingDate: today, teamMembers: [...teamMemberNames], events: weeklyEvents, unresolvedIssues: snapshot.issues, clientsWaitingForTeam: snapshot.pending, silentClients: snapshot.silentClients, activeCommitments: snapshot.activeCommitments, recentGroupMessages: snapshot.recentGroupMessages }) }
    ]
  });
  await sendWhatsappMessage(alertTo, String(completion.choices[0]?.message?.content || "Ove nedelje nije bilo događaja koji zahtevaju vlasničku pažnju.").trim(), "weekly report");
  dailyState.lastWeeklyDate = today;
  dailyState.lastReportDate = today;
  dailyState.lastReportVersion = reportDeliveryVersion;
  saveDailyState();
}

async function sendDailyReport() {
  const today = viennaDateKey();
  const events = dailyState.events.filter((event) => event.date === today);
  const pending = [...pendingByGroup.values()].map((record) => ({
    group: record.groupName,
    client: record.senderName,
    message: record.message,
    deadline: record.deadline
  }));
  const unresolvedIssues = [...openIssues.values()];
  const activeCommitments = [...commitments.values()].filter((record) => !record.completed);
  const silentClients = [...awaitingClientByGroup.values()].filter((record) => record.alerted);
  const recentGroupMessages = [...groupHistory.values()]
    .flat()
    .sort((a, b) => String(a.at).localeCompare(String(b.at)))
    .slice(-300);
  const completion = await openai.chat.completions.create({
    model,
    ...reasoningOptions(),
    messages: [
      {
        role: "system",
        content: [
          "Ti si Miljanov operativni direktor koji je tokom dana čitao Marketizo klijentske WhatsApp grupe. Napiši mu izveštaj koji pomaže da donese odluke, a ne prepričavanje poruka.",
          "Piši na srpskom, prirodno, konkretno i poslovno, kao čovek koji poznaje tim. Bez botovskog uvoda, praznih fraza i ponavljanja.",
          "Svi ljudi iz teamMembers su zaposleni Marketiza, nikada klijenti. clientsWaitingForTeam znači da klijent čeka odgovor zaposlenog duže od tri radna sata. silentClients znači da zaposleni čeka odgovor klijenta duže od 48 sati.",
          "Izdvoji samo: najvažnije događaje; kašnjenja, blokade i obaveze bez vlasnika; nezadovoljstvo ili izuzetnu pohvalu klijenta; rizike za snimanje, scenarije, editovanje, objave, kampanje, budžet, leadove ili garanciju; i odluke koje traže Miljana ili Ivanu.",
          "Posebno istakni direktan zahtev Miljanu ili Ivani, probijen rok, klijenta bez odgovora duže od tri radna sata, konflikt, zahtev za raskid ili povraćaj novca, problem sa kampanjom ili leadovima i slučaj gde se članovi tima međusobno čekaju.",
          "Za svaku važnu tvrdnju navedi grupu, osobu i vreme kada su dostupni. Ne izmišljaj status; ako završetak nije potvrđen napiši 'nije potvrđeno'.",
          "Počni sa *DNEVNI IZVEŠTAJ — datum*, pa u sledećem redu napiši kratak zbir: *Danas: X hitno · Y zahtevaju pažnju · Z pozitivno*. Broji samo klijente koje si zaista uključio.",
          "Za svakog relevantnog klijenta koristi tačno ovaj čitljiv oblik: *Kratko ime klijenta* — zatim 🔴 Hitno, 🟡 Potrebna pažnja ili 🟢 Pozitivno. Ispod napiši dva do četiri kratka prirodna pasusa: šta se dogodilo, trenutni status i zašto je važno. Završi sa *Sledeći korak:* i jednom konkretnom akcijom, odgovornom osobom i rokom kada su poznati.",
          "Ne koristi tabele, duge liste, horizontalne crte ni tehničke nazive rubrika. Ostavi prazan red između pasusa i klijenata da poruka bude laka za čitanje na telefonu.",
          "Za svaku negativnu situaciju proveri recentGroupMessages i trenutno stanje pre zaključka. Ako postoji dokaz da je rešena, potpuno je izostavi iz izveštaja; Miljanu ne šalji obaveštenja o zatvorenim situacijama.",
          "Ako nema dokaza rešenja, napiši: Nerešeno — konkretan problem, posledica, ko treba da preuzme i do kada. Nerešene ozbiljne stvari imaju prioritet nad istorijskim događajima.",
          "Kod svake potrebne odluke napiši preporuku i rok. Kod rizika napiši posledicu i ko treba da preuzme. Rutinsku komunikaciju koju tim već rešava izostavi. Miljanu eskaliraj samo kada treba njegova odluka, postoji ozbiljan poslovni rizik ili tim ne uspeva da zatvori problem.",
          "Ako više klijenata ukazuje na isti problem u timu, na kraju dodaj jedan kratak prirodan zaključak o obrascu i šta bi Miljan prvo trebalo da uradi.",
          "Ako nema ničega važnog, napiši samo: 'Sve klijentske grupe su pod kontrolom. Trenutno nema odluka ni intervencija za Miljana i Ivanu.'",
          "Nikada ne predlaži da agent odgovara u grupi, ne obećavaj ništa klijentima i ne predstavljaj neproverenu stvar kao završenu."
        ].join(" ")
      },
      {
        role: "user",
        content: JSON.stringify({ date: today, teamMembers: [...teamMemberNames], events, clientsWaitingForTeam: pending, silentClients, unresolvedIssues, activeCommitments, recentGroupMessages })
      }
    ]
  });
  const report = String(completion.choices[0]?.message?.content || "Danas nije bilo važnih događaja koji zahtevaju tvoju pažnju.").trim();
  await sendWhatsappMessage(alertTo, report, "daily report");
  dailyState.lastReportDate = today;
  dailyState.lastReportVersion = reportDeliveryVersion;
  saveDailyState();
  console.log(`[DAILY_REPORT] ${today}: private report sent`);
}

function startDailyReportScheduler() {
  if (dailySchedulerStarted) return;
  dailySchedulerStarted = true;
  loadDailyState();
  const check = () => {
    const parts = viennaParts();
    const today = viennaDateKey();
    const weekday = parts.weekday !== "Sat" && parts.weekday !== "Sun";
    const minutes = Number(parts.hour) * 60 + Number(parts.minute);
    if (weekday && minutes >= 9 * 60 && minutes < 12 * 60 && dailyState.lastMorningDate !== today && !morningReportInFlight) {
      morningReportInFlight = true;
      void sendMorningReport()
        .catch((error) => console.error("Morning report failed:", error))
        .finally(() => { morningReportInFlight = false; });
    }
    const closingReportMissing = dailyState.lastReportDate !== today || dailyState.lastReportVersion !== reportDeliveryVersion;
    if (weekday && minutes >= 17 * 60 + 30 && minutes < 20 * 60 && closingReportMissing && !closingReportInFlight) {
      closingReportInFlight = true;
      if (parts.weekday === "Fri" && dailyState.lastWeeklyDate !== today) {
        void sendWeeklyReport()
          .catch((error) => console.error("Weekly report failed:", error))
          .finally(() => { closingReportInFlight = false; });
      } else {
        void sendDailyReport()
          .catch((error) => console.error("Daily report failed:", error))
          .finally(() => { closingReportInFlight = false; });
      }
    }
  };
  check();
  setInterval(check, 60000);
}

async function transcribeVoiceMessage(message) {
  if (!message.hasMedia || !["ptt", "audio"].includes(message.type)) return "";
  const media = await message.downloadMedia();
  if (!media?.data) return "";
  const extension = media.mimetype?.includes("ogg") ? "ogg"
    : media.mimetype?.includes("mpeg") ? "mp3"
      : media.mimetype?.includes("mp4") ? "m4a" : "ogg";
  const transcription = await openai.audio.transcriptions.create({
    file: await toFile(Buffer.from(media.data, "base64"), `whatsapp-voice.${extension}`, {
      type: media.mimetype || "application/octet-stream"
    }),
    model: process.env.OPENAI_TRANSCRIPTION_MODEL || "whisper-1"
  });
  console.log(`[VOICE_TRANSCRIBED] ${message.from}`);
  return String(transcription.text || "").trim();
}

function addWorkingMinutes(start, amount) {
  let cursor = new Date(start);
  cursor.setSeconds(0, 0);
  if (cursor < start) cursor = new Date(cursor.getTime() + 60000);
  let remaining = amount;
  while (remaining > 0) {
    if (isWorkingMinute(cursor)) remaining -= 1;
    cursor = new Date(cursor.getTime() + 60000);
  }
  return cursor;
}

function saveResponseState() {
  try {
    fs.mkdirSync(path.dirname(responseStatePath), { recursive: true });
    const tempPath = `${responseStatePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify({ schemaVersion: 2, records: [...pendingByGroup.values()] }, null, 2));
    fs.renameSync(tempPath, responseStatePath);
  } catch (error) {
    console.error("Response SLA state save failed:", error);
  }
}

async function sendOverdueAlert(record) {
  const alert = [
    `*${record.groupName}* — 🔴 Klijent čeka odgovor`,
    "",
    `${record.senderName} nije dobio/la odgovor našeg tima duže od tri radna sata. Poslednja poruka je: „${record.message}“`,
    "",
    "*Sledeći korak:* Tim treba odmah da preuzme razgovor. Miljan ne mora lično da odgovara, ali dobija upozorenje jer je probijen vlasnički SLA."
  ].join("\n");
  await sendWhatsappMessage(alertTo, alert, "response SLA alert");
  recordDailyEvent({ type: "SLA", group: record.groupName, summary: "Klijent nije dobio odgovor u roku od 3 radna sata." });
  pendingByGroup.delete(record.groupId);
  responseTimers.delete(record.groupId);
  saveResponseState();
  console.log(`[SLA_OVERDUE] ${record.groupName}: private three-working-hour alert sent`);
}

function scheduleResponseCheck(record) {
  clearTimeout(responseTimers.get(record.groupId));
  const delay = Math.max(0, new Date(record.deadline).getTime() - Date.now());
  const timer = setTimeout(() => {
    void sendOverdueAlert(record).catch((error) => {
      console.error("Response SLA alert failed; retrying in 5 minutes:", error);
      record.deadline = new Date(Date.now() + 5 * 60000).toISOString();
      pendingByGroup.set(record.groupId, record);
      saveResponseState();
      scheduleResponseCheck(record);
    });
  }, Math.min(delay, 2147483647));
  responseTimers.set(record.groupId, timer);
}

function loadResponseState() {
  try {
    if (!fs.existsSync(responseStatePath)) return;
    const stored = JSON.parse(fs.readFileSync(responseStatePath, "utf8"));
    if (stored.schemaVersion !== 2 || !Array.isArray(stored.records)) {
      pendingByGroup.clear();
      saveResponseState();
      console.log("Response SLA state reset after reaction-handling upgrade.");
      return;
    }
    const records = stored.records;
    for (const record of records) {
      if (teamMemberNames.has(normalizedName(record.senderName))) {
        console.log(`[SLA_CLEANUP] Removed employee ${record.senderName} from client waiting list.`);
        continue;
      }
      pendingByGroup.set(record.groupId, record);
      scheduleResponseCheck(record);
    }
    saveResponseState();
    console.log(`Response SLA watch restored: ${records.length} pending group(s).`);
  } catch (error) {
    console.error("Response SLA state restore failed:", error);
  }
}

async function refreshTeamMembers() {
  const chats = await client.getChats();
  const teamChat = chats.find((chat) => chat.isGroup && chat.name === teamGroupName);
  if (!teamChat) throw new Error(`Team group not found: ${teamGroupName}`);
  teamMemberIds.clear();
  teamMemberNumbers.clear();
  teamMemberNames.clear();
  for (const participant of teamChat.participants || []) {
    const id = serializedId(participant.id);
    if (id) teamMemberIds.add(id);
    const participantNumber = normalizedDigits(participant.id?.user);
    if (participantNumber) teamMemberNumbers.add(participantNumber);
    try {
      const contact = await client.getContactById(id);
      const number = normalizedDigits(contact?.number);
      if (number) teamMemberNumbers.add(number);
      for (const value of [contact?.pushname, contact?.name, contact?.shortName]) {
        const name = normalizedName(value);
        if (name) teamMemberNames.add(name);
      }
      const contactId = serializedId(contact?.id);
      if (contactId) teamMemberIds.add(contactId);
    } catch (error) {
      console.error("Could not expand one team identity:", error);
    }
  }
  const ownId = serializedId(client.info?.wid);
  if (ownId) teamMemberIds.add(ownId);
  console.log(`Team roster loaded from ${teamGroupName}: ${teamMemberIds.size} ID(s), ${teamMemberNames.size} name(s).`);
}

function beginResponseWatch(message, chat, contact, messageText) {
  if (pendingByGroup.has(message.from)) return;
  const receivedAt = new Date(message.timestamp * 1000);
  const record = {
    groupId: message.from,
    messageId: serializedId(message.id),
    groupName: chat.name,
    senderName: contact.pushname || contact.name || contact.number || "Nepoznato",
    message: String(messageText || "Poruka bez teksta").slice(0, 300),
    receivedAt: receivedAt.toISOString(),
    deadline: addWorkingMinutes(receivedAt, responseSlaMinutes).toISOString()
  };
  pendingByGroup.set(record.groupId, record);
  saveResponseState();
  scheduleResponseCheck(record);
  console.log(`[SLA_STARTED] ${chat.name}: deadline ${record.deadline}`);
}

function clearResponseWatch(groupId, groupName) {
  if (!pendingByGroup.has(groupId)) return;
  clearTimeout(responseTimers.get(groupId));
  responseTimers.delete(groupId);
  pendingByGroup.delete(groupId);
  saveResponseState();
  console.log(`[SLA_ANSWERED] ${groupName}: team response received`);
}

function saveClientWaitState() {
  try {
    fs.mkdirSync(path.dirname(clientWaitStatePath), { recursive: true });
    const tempPath = `${clientWaitStatePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify([...awaitingClientByGroup.values()], null, 2));
    fs.renameSync(tempPath, clientWaitStatePath);
  } catch (error) {
    console.error("Client-wait state save failed:", error);
  }
}

async function sendClientSilenceAlert(record) {
  if (record.alerted) return;
  await sendWhatsappMessage(alertTo, [
    `*${record.groupName}* — 🟡 Klijent ne odgovara`,
    "",
    `Od klijenta nema odgovora duže od 48 sati. ${record.teamSender} je poslednje poslao/la: „${record.lastMessage}“`,
    "",
    "*Sledeći korak:* Tim treba da proveri da li klijenta kontaktirati drugim putem ili privremeno zaustaviti dalje čekanje."
  ].join("\n"), "client silence alert");
  record.alerted = true;
  awaitingClientByGroup.set(record.groupId, record);
  recordDailyEvent({ type: "CLIENT_SILENCE", group: record.groupName, summary: "Klijent ne odgovara timu." });
  saveClientWaitState();
}

function scheduleClientWait(record) {
  clearTimeout(clientWaitTimers.get(record.groupId));
  if (record.alerted) return;
  const due = new Date(record.dueAt).getTime();
  if (!Number.isFinite(due)) return;
  const timer = setTimeout(() => {
    void sendClientSilenceAlert(record).catch((error) => console.error("Client-silence alert failed:", error));
  }, Math.min(Math.max(0, due - Date.now()), 2147483647));
  clientWaitTimers.set(record.groupId, timer);
}

function noteTeamWaitingForClient(message, chat, senderName, messageText) {
  const existing = awaitingClientByGroup.get(message.from);
  const asksForReply = /\?|\b(javite|potvrdite|pošaljite|posaljite|možete li|mozete li|da li|čekamo|cekamo|odgovorite)\b/i.test(messageText);
  if (!existing && !asksForReply) return;
  const record = existing || {
    groupId: message.from,
    groupName: chat.name,
    firstAskedAt: new Date().toISOString(),
    dueAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    teamMessageCount: 0,
    alerted: false
  };
  record.teamMessageCount += 1;
  record.teamSender = senderName;
  record.lastMessage = messageText.slice(0, 300);
  awaitingClientByGroup.set(message.from, record);
  saveClientWaitState();
  scheduleClientWait(record);
}

function clearClientWait(groupId, groupName) {
  if (!awaitingClientByGroup.has(groupId)) return;
  clearTimeout(clientWaitTimers.get(groupId));
  clientWaitTimers.delete(groupId);
  awaitingClientByGroup.delete(groupId);
  saveClientWaitState();
  console.log(`[CLIENT_REPLIED] ${groupName}: client answered the team`);
}

function loadClientWaitState() {
  try {
    if (!fs.existsSync(clientWaitStatePath)) return;
    const records = JSON.parse(fs.readFileSync(clientWaitStatePath, "utf8"));
    for (const record of records) {
      awaitingClientByGroup.set(record.groupId, record);
      scheduleClientWait(record);
    }
  } catch (error) {
    console.error("Client-wait state restore failed:", error);
  }
}

http.createServer((req, res) => {
  if (req.url === "/health") {
    const fresh = lastHealthCheckAt && Date.now() - lastHealthCheckAt < whatsappHealthIntervalMs * 3;
    const ready = whatsappReady && fresh && !fatalExitScheduled;
    // Railway uses this endpoint as a liveness check. An unpaired WhatsApp
    // account is an operational state, not a dead HTTP process; returning 503
    // here caused the container to be replaced while a user was scanning a QR.
    res.writeHead(fatalExitScheduled ? 503 : 200, {
      "content-type": "application/json",
      "cache-control": "no-store"
    });
    return res.end(JSON.stringify({
      status: fatalExitScheduled ? "restarting" : "ok",
      ready,
      whatsappReady,
      fresh: Boolean(fresh),
      consecutiveHealthFailures,
      lastReportDate: dailyState.lastReportDate || "",
      lastReportVersion: dailyState.lastReportVersion || "",
      lastYesterdayAnalysisTestVersion: dailyState.lastYesterdayAnalysisTestVersion || "",
      lastHealthCheckAt: lastHealthCheckAt ? new Date(lastHealthCheckAt).toISOString() : "",
      lastIncomingMessageAt: lastIncomingMessageAt ? new Date(lastIncomingMessageAt).toISOString() : "",
      lastProcessedMessageAt: lastProcessedMessageAt ? new Date(lastProcessedMessageAt).toISOString() : "",
      processingMessages: processingMessageIds.size
    }));
  }
  if (req.url !== `/pair/${pairingToken}` && req.url !== pairingAlias) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    return res.end("Not found");
  }

  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store"
  });
  if (!qrDataUrl) {
    return res.end('<meta http-equiv="refresh" content="3"><main style="font-family:Arial;text-align:center;padding:30px"><h2>Marketizo WhatsApp agent</h2><p>QR se priprema ili je WhatsApp već povezan. Stranica se automatski osvežava.</p></main>');
  }
  res.end(`<meta http-equiv="refresh" content="8"><main style="font-family:Arial;text-align:center;padding:30px"><h2>Marketizo WhatsApp povezivanje</h2><p>WhatsApp Business → Povezani uređaji → Poveži uređaj</p><img src="${qrDataUrl}" width="420" height="420" alt="WhatsApp QR"><p>QR se automatski osvežava na svakih 8 sekundi. Skenirajte trenutno prikazani kod.</p></main>`);
}).listen(port, "0.0.0.0", () => {
  console.log(`PAIRING_PAGE_PATH: /pair/${pairingToken}`);
  console.log(`PAIRING_PAGE_ALIAS: ${pairingAlias}`);
});

client.on("qr", async (code) => {
  qrDataUrl = await QRCode.toDataURL(code, { width: 700, margin: 4 });
  console.log("WhatsApp QR is ready on the private pairing page.");
});

client.on("ready", async () => {
  clearTimeout(initializationTimer);
  whatsappReady = true;
  fatalExitScheduled = false;
  consecutiveHealthFailures = 0;
  lastHealthCheckAt = Date.now();
  startWhatsAppHealthWatchdog();
  qrDataUrl = null;
  console.log("Marketizo WhatsApp agent is connected.");
  try {
    await refreshTeamMembers();
    loadResponseState();
    loadClientWaitState();
    loadGroupHistory();
    loadFollowupState();
    loadProcessedMessagesState();
    startDailyReportScheduler();
    await sendDeploymentTest();
    await sendYesterdayAnalysisTest();
  } catch (error) {
    console.error("Team roster setup failed:", error);
  }
});

client.on("auth_failure", (message) => {
  whatsappReady = false;
  clearInterval(healthTimer);
  console.error("WhatsApp authentication failed:", message);
  scheduleProcessRecovery("WhatsApp authentication failed", message);
});

client.on("disconnected", (reason) => {
  whatsappReady = false;
  clearInterval(healthTimer);
  console.error("WhatsApp disconnected:", reason);
  scheduleProcessRecovery("WhatsApp disconnected", reason);
});

client.on("message_reaction", async (reaction) => {
  try {
    if (!reaction?.reaction) return;
    let original = null;
    try {
      original = await client.getMessageById(serializedId(reaction.msgId));
    } catch (error) {
      console.error("Could not load reacted message:", error);
    }
    let groupId = serializedId(reaction.msgId?.remote || reaction.msgId?._remote);
    if (!groupId.endsWith("@g.us")) groupId = serializedId(original?.from || original?.to);
    if (!groupId.endsWith("@g.us")) return;

    let groupName = pendingByGroup.get(groupId)?.groupName
      || awaitingClientByGroup.get(groupId)?.groupName
      || commitments.get(groupId)?.groupName
      || openIssues.get(groupId)?.groupName
      || groupId;
    try {
      const chat = original ? await original.getChat() : await client.getChatById(groupId);
      if (chat?.name) groupName = chat.name;
    } catch (error) {
      console.error("Could not resolve reaction group name:", error);
    }

    let reactionIsFromTeam = isKnownTeamId(reaction.senderId);
    if (!reactionIsFromTeam) {
      try {
        const reactorId = serializedId(reaction.senderId);
        const reactor = await client.getContactById(reactorId);
        reactionIsFromTeam = isTeamSender({ author: reaction.senderId, from: groupId }, reactor);
        if (!reactionIsFromTeam) {
          await refreshTeamMembers();
          reactionIsFromTeam = isTeamSender({ author: reaction.senderId, from: groupId }, reactor);
        }
      } catch (error) {
        console.error("Could not identify reaction sender:", error);
      }
    }

    const reactedMessageId = serializedId(reaction.msgId);
    if (reactionIsFromTeam) {
      if (reactedMessageId) {
        teamAcknowledgedMessageIds.add(reactedMessageId);
        setTimeout(() => teamAcknowledgedMessageIds.delete(reactedMessageId), 10 * 60 * 1000);
      }
      clearResponseWatch(groupId, groupName);
      console.log(`[TEAM_REACTION] ${groupName}: reaction counted as team acknowledgement`);
      return;
    }

    let originalWasFromTeam = original?.fromMe === true || isKnownTeamId(original?.author || original?.from);
    if (!originalWasFromTeam && original) {
      try {
        const originalContact = await original.getContact();
        originalWasFromTeam = isTeamSender(original, originalContact);
      } catch (error) {
        console.error("Could not identify reacted message sender:", error);
      }
    }
    if (!originalWasFromTeam) return;

    clearClientWait(groupId, groupName);
    console.log(`[CLIENT_REACTION] ${groupName}: client reaction counted as acknowledgement of the team message`);
  } catch (error) {
    console.error("Reaction processing failed:", error);
  }
});

client.on("message_create", async (message) => {
  const messageId = serializedId(message.id);
  if (messageId && (processedMessageIds.has(messageId) || processingMessageIds.has(messageId))) {
    console.log(`[MESSAGE_DEDUPED] ${messageId}`);
    return;
  }
  if (messageId) {
    processingMessageIds.add(messageId);
    const staleProcessingTimer = setTimeout(() => {
      if (processingMessageIds.delete(messageId)) console.error(`[MESSAGE_PROCESSING_STALE] Released ${messageId} after 10 minutes.`);
    }, 10 * 60 * 1000);
    staleProcessingTimer.unref();
  }
  lastIncomingMessageAt = Date.now();
  try {
    if (!message.from.endsWith("@g.us")) {
      if (!message.fromMe) {
        if (await isOwnerPrivateMessage(message)) {
          await answerOwnerQuestion(message);
        } else {
          console.log("[PRIVATE_AI_IGNORED] private sender is not the configured owner");
        }
      }
      markMessageProcessed(messageId);
      return;
    }

    const chat = await message.getChat();
    if (!chat.isGroup) { markMessageProcessed(messageId); return; }
    if (chat.name !== teamGroupName && monitoredGroups.size && !monitoredGroups.has(chat.name)) { markMessageProcessed(messageId); return; }

    const contact = await message.getContact();
    const senderName = contact.pushname || contact.name || contact.number || "Nepoznato";
    if (message.fromMe) { markMessageProcessed(messageId); return; }
    if (chat.name === teamGroupName) { markMessageProcessed(messageId); return; }
    if (isTeamSender(message, contact)) {
      clearResponseWatch(message.from, chat.name);
      const teamText = String(message.body || "").trim();
      rememberGroupMessage(message.from, chat.name, senderName, "team", teamText);
      if (teamText) noteTeamWaitingForClient(message, chat, senderName, teamText);
      const looksLikeCommitment = /\b(danas|sutra|rok|gotovo|završ|zavrs|šaljem|saljem|biće|bice|do\s+\d|ponedeljak|utorak|sred|četvrt|cetvrt|petak)\b/i.test(teamText);
      if (teamText && (openIssues.has(message.from) || commitments.has(message.from) || looksLikeCommitment)) {
        await updateFollowups(message, chat, senderName, "team", teamText);
      }
      markMessageProcessed(messageId);
      return;
    }

    const voiceTranscript = await transcribeVoiceMessage(message);
    const messageText = voiceTranscript || String(message.body || "").trim();
    if (!messageText) { markMessageProcessed(messageId); return; }
    clearClientWait(message.from, chat.name);
    rememberGroupMessage(message.from, chat.name, senderName, "client", messageText);

    const result = await analyzeMessage(openai, routineModel, smartModel, {
      group: chat.name,
      sender: contact.pushname || contact.name || contact.number || "Nepoznato",
      message: messageText,
      timestamp: new Date(message.timestamp * 1000).toISOString(),
      recentConversation: (groupHistory.get(message.from) || []).slice(-12),
      openIssue: openIssues.get(message.from) || null,
      activeCommitment: commitments.get(message.from) || null
    });
    const normalizedAcknowledgement = messageText
      .toLocaleLowerCase("sr-Latn")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
    const acknowledgementOnly = /^(ok|okej|okay|važi|vazi|super|hvala|hvala puno|dogovoreno|u redu|može|moze|odlično|odlicno|top|jasno)$/.test(normalizedAcknowledgement);
    const acknowledgedByTeamReaction = teamAcknowledgedMessageIds.has(serializedId(message.id));
    if (result.requiresTeamReply && !acknowledgementOnly && !acknowledgedByTeamReaction) {
      if (teamMemberIds.size) beginResponseWatch(message, chat, contact, messageText);
      else console.error("Response SLA watch skipped because the team roster is empty.");
    } else {
      clearResponseWatch(message.from, chat.name);
      console.log(`[NO_REPLY_NEEDED] ${chat.name}: acknowledgement, closed message, or team reaction`);
    }
    await updateFollowups(message, chat, senderName, "client", messageText);
    const normalizedBody = messageText.toLocaleLowerCase("sr-Latn");
    const ownerMention = ["miljan", "vlasnik", "gazda", "direktor", "owner", "šef", "sef"]
      .some((keyword) => normalizedBody.includes(keyword));

    console.log(`[${result.level}] [${result.judgedBy}] ${chat.name}: ${result.summary}`);

    if (result.level !== "GREEN" || result.isPraise) {
      recordDailyEvent({ type: result.level, group: chat.name, summary: result.summary });
    }
    if (ownerMention) {
      recordDailyEvent({ type: "OWNER", group: chat.name, summary: result.summary });
    }

    const importantPraise = result.isPraise && result.notifyOwner;
    const notifyOwner = ownerMention || result.level === "URGENT" || result.notifyOwner;
    if (!notifyOwner) { markMessageProcessed(messageId); return; }

    const alertStatus = result.level === "URGENT" || result.level === "RED"
      ? "🔴 Hitno"
      : importantPraise
        ? "🟢 Važan pozitivan signal"
        : "🟡 Potrebna pažnja";
    const alert = [
      `*${chat.name}* — ${alertStatus}`,
      "",
      result.summary,
      ownerMention ? "Pomenut si direktno u razgovoru." : "",
      !ownerMention && result.ownerReason ? result.ownerReason : "",
      importantPraise ? "Ovo vredi sačuvati kao važnu pohvalu ili rezultat." : "",
      "",
      result.recommendedAction ? `*Sledeći korak:* ${result.recommendedAction}` : "*Sledeći korak:* Pregledaj situaciju i odredi ko je preuzima."
    ].filter((line, index, lines) => line || (index > 0 && lines[index - 1])).join("\n");

    await sendWhatsappMessage(alertTo, alert, "owner alert");
    markMessageProcessed(messageId);
  } catch (error) {
    processingMessageIds.delete(messageId);
    console.error("Message processing failed:", error);
    try {
      if (message.from?.endsWith("@g.us") && !message.fromMe) {
        const chat = await message.getChat();
        const contact = await message.getContact();
        if (chat?.isGroup && chat.name !== teamGroupName && !isTeamSender(message, contact)) {
          const fallbackText = String(message.body || "Poruka koju analiza nije uspela da obradi").trim();
          if (!pendingByGroup.has(message.from) && teamMemberIds.size) beginResponseWatch(message, chat, contact, fallbackText);
          recordDailyEvent({ type: "ANALYSIS_FAILURE", group: chat.name, summary: "Automatska analiza poruke nije uspela; odgovor tima se ipak prati." });
        }
      }
    } catch (fallbackError) {
      console.error("Message-processing fallback failed:", fallbackError);
    }
  }
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
  if (recoveryWorthy(error)) scheduleProcessRecovery("Unhandled WhatsApp rejection", error);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  scheduleProcessRecovery("Uncaught exception", error);
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    console.log(`[SHUTDOWN] ${signal}; saving state`);
    try {
      saveAllState();
    } catch (error) {
      console.error("Shutdown state save failed:", error);
    }
    process.exit(0);
  });
}

initializationTimer = setTimeout(() => {
  if (whatsappReady) return;
  if (qrDataUrl) {
    console.log("[INITIALIZATION] Waiting for the QR code to be scanned; keeping the process alive.");
    return;
  }
  scheduleProcessRecovery(
    "WhatsApp initialization stalled before producing a QR code",
    new Error("WhatsApp produced neither a ready event nor a QR code within 180 seconds")
  );
}, 180000);
initializationTimer.unref();

client.initialize().catch((error) => scheduleProcessRecovery("WhatsApp initialization failed", error));
