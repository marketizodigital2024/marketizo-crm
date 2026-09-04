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

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
const alertTo = process.env.ALERT_TO;
const alertNumber = alertTo.split("@")[0].replace(/\D/g, "");
const whatsappPhoneNumber = (process.env.WHATSAPP_PHONE_NUMBER || "").replace(/\D/g, "");
const port = Number(process.env.PORT || 3000);
const pairingToken = crypto.randomBytes(24).toString("hex");
let qrDataUrl = null;
const teamGroupName = process.env.TEAM_GROUP_NAME || "Marketizo Digital";
const responseSlaMinutes = Number(process.env.RESPONSE_SLA_MINUTES || 120);
const responseTimezone = process.env.RESPONSE_TIMEZONE || "Europe/Vienna";
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
let dailyState = { lastReportDate: "", lastMorningDate: "", lastWeeklyDate: "", events: [] };
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
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  }
});

let pairingCodeRequested = false;
let pairingRetryTimer = null;
let dailySchedulerStarted = false;
let morningReportInFlight = false;
let closingReportInFlight = false;

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
    dailyState = { lastReportDate: "", lastMorningDate: "", lastWeeklyDate: "", events: [] };
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
  await client.sendMessage(alertTo, [
    `U grupi ${record.groupName} istekao je dogovoreni rok.`,
    record.summary,
    record.owner ? `Dogovor je preuzeo/la: ${record.owner}.` : "",
    "Nisam pronašao jasnu potvrdu da je obaveza završena."
  ].filter(Boolean).join("\n"));
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
  } else if (result.commitment && result.commitmentDueAt) {
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
  const matchingGroups = clientGroups.filter((chat) => {
    const name = chat.name.toLocaleLowerCase("sr-Latn");
    return queryTokens.some((token) => name.includes(token));
  });
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
    temperature: 0,
    messages: [
      {
        role: "system",
        content: [
          "Ti si Miljanov privatni, nezavisni poslovni savetnik koji sa strane čita razgovore u Marketizo WhatsApp grupama.",
          "Odgovaraj prirodno, direktno i konkretno, kao sposobna osoba koja je pročitala razgovor i napisala Miljanu kratak lični izveštaj — nikada kao generički bot ili automatski šablon.",
          "Koristi isključivo dati kontekst iz WhatsApp grupa koje agent prati.",
          "Prepoznaj naziv grupe i kada je korisnik napisao samo deo naziva ili napravio malu slovnu grešku.",
          "Ako odgovor nije u kontekstu, reci da nema dovoljno informacija.",
          "Ne obećavaj rokove, rezultate, povrat novca niti bilo kakvu obavezu u ime Marketiza.",
          "Svi ljudi iz teamMembers su zaposleni Marketiza, nikada klijenti. Ostali učesnici klijentskih grupa su klijenti.",
          "Ne izmišljaj činjenice. Navedi konkretno šta je ko napisao i kada, ako je to dostupno i važno.",
          "Ne počinji uvek istim naslovom ili frazom i ne koristi obavezne rubrike. Organizuj odgovor u kratke prirodne pasuse ili nekoliko smislenih stavki samo kada to zaista pomaže čitanju.",
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
  return recent.some((item) => item.fromMe && /MARKETIZO (CLIENT UPDATE|DNEVNI PREGLED|— KLIJENT ČEKA ODGOVOR)/i.test(String(item.body || "")));
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
  return { pending, issues, activeCommitments, silentClients };
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
    temperature: 0,
    messages: [
      { role: "system", content: "Napiši Miljanu kratak jutarnji vlasnički pregled na srpskom kao osoba koja poznaje tim i pred početak dana izdvaja samo ono na šta treba obratiti pažnju. Počni odmah suštinom, bez pozdrava, markdown naslova, emodžija, generičkog uvoda i fiksnog šablona. Svi ljudi iz teamMembers su zaposleni Marketiza, nikada klijenti. pendingReplies znači da klijent čeka odgovor zaposlenog. silentClients znači da zaposleni čeka odgovor klijenta najmanje dva dana ili posle četiri poruke. Ne prijavljuj druge slučajeve u kojima zaposleni čeka klijenta. Piši kao rukovodilac u nekoliko prirodnih pasusa, jasno reci gde Miljan lično treba da reaguje, a gde treba samo odgovorna osoba iz tima. Ne izmišljaj činjenice." },
      { role: "user", content: JSON.stringify({ date: today, teamMembers: [...teamMemberNames], clientsWaitingForTeam: snapshot.pending, unresolvedIssues: snapshot.issues, dueCommitments: relevantCommitments, silentClients: snapshot.silentClients }) }
    ]
  });
  await client.sendMessage(alertTo, String(completion.choices[0]?.message?.content || "").trim());
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
    temperature: 0,
    messages: [
      { role: "system", content: "Napiši Miljanu nedeljni vlasnički izveštaj na srpskom kao iskusan rukovodilac koji je pratio klijentske grupe. Piši prirodno i konkretno, bez botovskog uvoda, emodžija i praznih fraza. Izdvoji ponovljene probleme, ozbiljne rizike, probijene rokove, brzinu reakcije tima, važne pohvale ili rezultate i tri prioriteta za sledeću nedelju. Nemoj prepričavati rutinsku komunikaciju niti izmišljati činjenice." },
      { role: "user", content: JSON.stringify({ endingDate: today, teamMembers: [...teamMemberNames], events: weeklyEvents, unresolvedIssues: snapshot.issues, clientsWaitingForTeam: snapshot.pending, silentClients: snapshot.silentClients, activeCommitments: snapshot.activeCommitments }) }
    ]
  });
  await client.sendMessage(alertTo, String(completion.choices[0]?.message?.content || "Ove nedelje nije bilo događaja koji zahtevaju vlasničku pažnju.").trim());
  dailyState.lastWeeklyDate = today;
  dailyState.lastReportDate = today;
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
  const completion = await openai.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      {
        role: "system",
        content: [
          "Napiši Miljanu kratak dnevni izveštaj na srpskom kao osoba koja je tokom dana pratila Marketizo klijentske grupe.",
          "Piši prirodno, konkretno i poslovno, bez botovskog uvoda, markdown naslova, emodžija, generičkih fraza i fiksnog šablona.",
          "Svi ljudi iz teamMembers su zaposleni Marketiza, nikada klijenti. clientsWaitingForTeam znači da klijent čeka odgovor zaposlenog. silentClients znači da zaposleni čeka odgovor klijenta najmanje dva dana ili nakon četiri poruke.",
          "Počni odmah najvažnijim zaključkom dana. Prioritet daj ozbiljnim problemima, rizicima i grupama koje još čekaju odgovor.",
          "Pohvale i manje probleme navedi sažeto samo ako Miljanu daju koristan kontekst.",
          "Razdvoji smislenim kratkim pasusima ili stavkama kada ima više nepovezanih tema.",
          "Ne izmišljaj činjenice i ne ponavljaj istu informaciju. Ako nema važnih događaja, reci to jednom prirodnom rečenicom."
        ].join(" ")
      },
      {
        role: "user",
        content: JSON.stringify({ date: today, teamMembers: [...teamMemberNames], events, clientsWaitingForTeam: pending, silentClients, unresolvedIssues, activeCommitments })
      }
    ]
  });
  const report = String(completion.choices[0]?.message?.content || "Danas nije bilo važnih događaja koji zahtevaju tvoju pažnju.").trim();
  await client.sendMessage(alertTo, report);
  dailyState.lastReportDate = today;
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
    if (weekday && minutes >= 9 * 60 && minutes < 9 * 60 + 30 && dailyState.lastMorningDate !== today && !morningReportInFlight) {
      morningReportInFlight = true;
      void sendMorningReport()
        .catch((error) => console.error("Morning report failed:", error))
        .finally(() => { morningReportInFlight = false; });
    }
    if (weekday && minutes >= 17 * 60 + 30 && minutes < 18 * 60 && dailyState.lastReportDate !== today && !closingReportInFlight) {
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
    "⏰ MARKETIZO — KLIJENT ČEKA ODGOVOR",
    `Grupa: ${record.groupName}`,
    `Klijent: ${record.senderName}`,
    `Rok: 2 radna sata (09:00–17:30)`,
    `Poruka: ${record.message}`,
    "Akcija: Neko iz Marketizo tima treba odmah da odgovori."
  ].join("\n");
  await client.sendMessage(alertTo, alert);
  recordDailyEvent({ type: "SLA", group: record.groupName, summary: "Klijent nije dobio odgovor u roku od 2 radna sata." });
  pendingByGroup.delete(record.groupId);
  responseTimers.delete(record.groupId);
  saveResponseState();
  console.log(`[SLA_OVERDUE] ${record.groupName}: private alert sent`);
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
  await client.sendMessage(alertTo, [
    `Klijent u grupi ${record.groupName} ne odgovara timu.`,
    `Poslednje je pisao/la ${record.teamSender}: „${record.lastMessage}“`,
    record.teamMessageCount >= 4
      ? `Tim je poslao ${record.teamMessageCount} poruke bez odgovora klijenta.`
      : "Od klijenta nema odgovora već dva dana.",
    "Vredi proveriti da li je potrebno drugačije kontaktirati klijenta ili zaustaviti dalje čekanje."
  ].join("\n"));
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
  if (record.teamMessageCount >= 4 && !record.alerted) {
    void sendClientSilenceAlert(record).catch((error) => console.error("Client-silence alert failed:", error));
  }
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
  if (req.url !== `/pair/${pairingToken}`) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    return res.end("Not found");
  }

  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store"
  });
  if (!qrDataUrl) {
    return res.end("<h2>Marketizo WhatsApp agent</h2><p>QR se priprema ili je WhatsApp već povezan. Osvežite stranicu za nekoliko sekundi.</p>");
  }
  res.end(`<main style="font-family:Arial;text-align:center;padding:30px"><h2>Marketizo WhatsApp povezivanje</h2><p>WhatsApp Business → Povezani uređaji → Poveži uređaj</p><img src="${qrDataUrl}" width="420" height="420" alt="WhatsApp QR"><p>QR se automatski menja. Ako ne radi, osvežite stranicu.</p></main>`);
}).listen(port, "0.0.0.0", () => {
  console.log(`PAIRING_PAGE_PATH: /pair/${pairingToken}`);
});

async function requestPhonePairingCode() {
  try {
    const pairingCode = await client.requestPairingCode(whatsappPhoneNumber, false, 180000);
    console.log("========================================");
    console.log(`WHATSAPP PAIRING CODE: ${pairingCode}`);
    console.log("Phone: Linked devices > Link a device > Link with phone number instead");
    console.log("========================================");
  } catch (error) {
    console.error("Pairing code request failed; retrying in 30 minutes:", error);
    clearTimeout(pairingRetryTimer);
    pairingRetryTimer = setTimeout(requestPhonePairingCode, 1800000);
  }
}

client.on("qr", async (code) => {
  qrDataUrl = await QRCode.toDataURL(code, { width: 700, margin: 4 });
  console.log("WhatsApp QR is ready on the private pairing page.");

  if (whatsappPhoneNumber && !pairingCodeRequested) {
    pairingCodeRequested = true;
    void requestPhonePairingCode();
  }
});

client.on("ready", async () => {
  qrDataUrl = null;
  clearTimeout(pairingRetryTimer);
  pairingRetryTimer = null;
  console.log("Marketizo WhatsApp agent is connected.");
  try {
    await refreshTeamMembers();
    loadResponseState();
    loadClientWaitState();
    loadGroupHistory();
    loadFollowupState();
    startDailyReportScheduler();
  } catch (error) {
    console.error("Team roster setup failed:", error);
  }
});

client.on("auth_failure", (message) => {
  clearTimeout(pairingRetryTimer);
  pairingRetryTimer = null;
  pairingCodeRequested = false;
  console.error("WhatsApp authentication failed:", message);
});

client.on("disconnected", (reason) => {
  clearTimeout(pairingRetryTimer);
  pairingRetryTimer = null;
  pairingCodeRequested = false;
  console.error("WhatsApp disconnected:", reason);
});

client.on("message_reaction", async (reaction) => {
  try {
    if (!reaction?.reaction) return;
    let groupId = serializedId(reaction.msgId?.remote || reaction.msgId?._remote);
    if (!groupId.endsWith("@g.us")) {
      try {
        const original = await client.getMessageById(serializedId(reaction.msgId));
        groupId = serializedId(original?.from || original?.to);
      } catch (error) {
        console.error("Could not resolve reacted message:", error);
      }
    }
    if (!groupId.endsWith("@g.us")) return;
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
    if (!reactionIsFromTeam) return;
    const reactedMessageId = serializedId(reaction.msgId);
    if (reactedMessageId) {
      teamAcknowledgedMessageIds.add(reactedMessageId);
      setTimeout(() => teamAcknowledgedMessageIds.delete(reactedMessageId), 10 * 60 * 1000);
    }
    const groupName = pendingByGroup.get(groupId)?.groupName || groupId;
    clearResponseWatch(groupId, groupName);
    console.log(`[TEAM_REACTION] ${groupName}: reaction counted as team acknowledgement`);
  } catch (error) {
    console.error("Reaction processing failed:", error);
  }
});

client.on("message_create", async (message) => {
  try {
    if (!message.from.endsWith("@g.us")) {
      if (!message.fromMe) {
        if (await isOwnerPrivateMessage(message)) {
          await answerOwnerQuestion(message);
        } else {
          console.log("[PRIVATE_AI_IGNORED] private sender is not the configured owner");
        }
      }
      return;
    }

    const chat = await message.getChat();
    if (!chat.isGroup) return;
    if (chat.name !== teamGroupName && monitoredGroups.size && !monitoredGroups.has(chat.name)) return;

    const contact = await message.getContact();
    const senderName = contact.pushname || contact.name || contact.number || "Nepoznato";
    if (message.fromMe) return;
    if (chat.name === teamGroupName) return;
    if (isTeamSender(message, contact)) {
      clearResponseWatch(message.from, chat.name);
      const teamText = String(message.body || "").trim();
      rememberGroupMessage(message.from, chat.name, senderName, "team", teamText);
      if (teamText) noteTeamWaitingForClient(message, chat, senderName, teamText);
      const looksLikeCommitment = /\b(danas|sutra|rok|gotovo|završ|zavrs|šaljem|saljem|biće|bice|do\s+\d|ponedeljak|utorak|sred|četvrt|cetvrt|petak)\b/i.test(teamText);
      if (teamText && (openIssues.has(message.from) || commitments.has(message.from) || looksLikeCommitment)) {
        await updateFollowups(message, chat, senderName, "team", teamText);
      }
      return;
    }

    const voiceTranscript = await transcribeVoiceMessage(message);
    const messageText = voiceTranscript || String(message.body || "").trim();
    if (!messageText) return;
    clearClientWait(message.from, chat.name);
    rememberGroupMessage(message.from, chat.name, senderName, "client", messageText);

    const result = await analyzeMessage(openai, model, {
      group: chat.name,
      sender: contact.pushname || contact.name || contact.number || "Nepoznato",
      message: messageText,
      timestamp: new Date(message.timestamp * 1000).toISOString()
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

    console.log(`[${result.level}] ${chat.name}: ${result.summary}`);

    if (result.level !== "GREEN" || result.isPraise) {
      recordDailyEvent({ type: result.level, group: chat.name, summary: result.summary });
    }
    if (ownerMention) {
      recordDailyEvent({ type: "OWNER", group: chat.name, summary: result.summary });
    }

    const importantPraise = result.isPraise && result.notifyOwner;
    const notifyOwner = ownerMention || result.level === "RED" || result.level === "URGENT" || result.notifyOwner;
    if (!notifyOwner) return;

    const icons = {
      GREEN: "🟢",
      YELLOW: "🟡",
      RED: "🔴",
      URGENT: "🚨"
    };
    const icon = icons[result.level] || "ℹ️";
    const alert = [
      `${icon} MARKETIZO CLIENT UPDATE`,
      `Nivo: ${result.level}`,
      `Grupa: ${chat.name}`,
      `Pošiljalac: ${contact.pushname || contact.name || contact.number || "Nepoznato"}`,
      ownerMention ? "Razlog obaveštenja: Pomenut je Miljan/vlasnik." : "",
      !ownerMention && result.ownerReason ? `Razlog obaveštenja: ${result.ownerReason}` : "",
      importantPraise ? "Vrsta: Posebno važna pohvala/rezultat." : "",
      `Sažetak: ${result.summary}`,
      result.reason ? `Zašto: ${result.reason}` : "",
      result.recommendedAction ? `Preporuka: ${result.recommendedAction}` : ""
    ].filter(Boolean).join("\n");

    await client.sendMessage(alertTo, alert);
  } catch (error) {
    console.error("Message processing failed:", error);
  }
});

client.initialize();
