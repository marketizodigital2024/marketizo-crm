import "dotenv/config";
import qrcode from "qrcode-terminal";
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

client.on("qr", (code) => {
  if (whatsappPhoneNumber) {
    if (!pairingCodeRequested) {
      pairingCodeRequested = true;
      void requestPhonePairingCode();
    }
    return;
  }

  console.log("Scan this QR in WhatsApp Business > Linked Devices:");
  qrcode.generate(code, { small: true }, (output) => console.log(output));
});

client.on("ready", () => {
  clearTimeout(pairingRetryTimer);
  pairingRetryTimer = null;
  console.log("Marketizo WhatsApp agent is connected.");
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
    if (message.fromMe || !message.from.endsWith("@g.us")) return;

    const chat = await message.getChat();
    if (!chat.isGroup) return;
    if (monitoredGroups.size && !monitoredGroups.has(chat.name)) return;

    const contact = await message.getContact();
    const result = await analyzeMessage(openai, model, {
      group: chat.name,
      sender: contact.pushname || contact.name || contact.number || "Nepoznato",
      message: message.body,
      timestamp: new Date(message.timestamp * 1000).toISOString()
    });

    console.log(`[${result.level}] ${chat.name}: ${result.summary}`);

    if (result.level !== "RED" && result.level !== "URGENT") return;

    const icon = result.level === "URGENT" ? "🚨" : "🔴";
    const alert = [
      `${icon} MARKETIZO CLIENT ALERT`,
      `Nivo: ${result.level}`,
      `Grupa: ${chat.name}`,
      `Pošiljalac: ${contact.pushname || contact.name || contact.number || "Nepoznato"}`,
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
