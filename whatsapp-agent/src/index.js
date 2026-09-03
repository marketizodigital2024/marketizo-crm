import "dotenv/config";
import QRCode from "qrcode";
import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import whatsapp from "whatsapp-web.js";
import { analyzeMessage } from "./analyze.js";

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
const teamMemberIds = new Set();
const pendingByGroup = new Map();
const responseTimers = new Map();
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

const workTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: responseTimezone,
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23"
});

function serializedId(id) {
  return id?._serialized || id?.$1 || (id?.user ? `${id.user}@${id.server || "c.us"}` : "");
}

function isWorkingMinute(date) {
  const parts = Object.fromEntries(
    workTimeFormatter.formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
  if (parts.weekday === "Sat" || parts.weekday === "Sun") return false;
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  return minutes >= 9 * 60 && minutes < 17 * 60 + 30;
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
    fs.writeFileSync(tempPath, JSON.stringify([...pendingByGroup.values()], null, 2));
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
    const records = JSON.parse(fs.readFileSync(responseStatePath, "utf8"));
    for (const record of records) {
      pendingByGroup.set(record.groupId, record);
      scheduleResponseCheck(record);
    }
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
  for (const participant of teamChat.participants || []) {
    const id = serializedId(participant.id);
    if (id) teamMemberIds.add(id);
  }
  const ownId = serializedId(client.info?.wid);
  if (ownId) teamMemberIds.add(ownId);
  console.log(`Team roster loaded from ${teamGroupName}: ${teamMemberIds.size} member(s).`);
}

function beginResponseWatch(message, chat, contact) {
  if (pendingByGroup.has(message.from)) return;
  const receivedAt = new Date(message.timestamp * 1000);
  const record = {
    groupId: message.from,
    groupName: chat.name,
    senderName: contact.pushname || contact.name || contact.number || "Nepoznato",
    message: String(message.body || "Poruka bez teksta").slice(0, 300),
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

client.on("message_create", async (message) => {
  try {
    if (!message.from.endsWith("@g.us")) return;

    const chat = await message.getChat();
    if (!chat.isGroup) return;
    if (chat.name === teamGroupName) return;
    if (monitoredGroups.size && !monitoredGroups.has(chat.name)) return;

    const contact = await message.getContact();
    const senderId = serializedId(message.author || contact.id);
    if (message.fromMe || teamMemberIds.has(senderId)) {
      clearResponseWatch(message.from, chat.name);
      return;
    }

    if (teamMemberIds.size) beginResponseWatch(message, chat, contact);
    else console.error("Response SLA watch skipped because the team roster is empty.");

    const result = await analyzeMessage(openai, model, {
      group: chat.name,
      sender: contact.pushname || contact.name || contact.number || "Nepoznato",
      message: message.body,
      timestamp: new Date(message.timestamp * 1000).toISOString()
    });
    const normalizedBody = String(message.body || "").toLocaleLowerCase("sr-Latn");
    const ownerMention = ["miljan", "vlasnik", "gazda", "direktor", "owner", "šef", "sef"]
      .some((keyword) => normalizedBody.includes(keyword));

    console.log(`[${result.level}] ${chat.name}: ${result.summary}`);

    if (result.level === "GREEN" && !result.isPraise && !ownerMention) return;

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
