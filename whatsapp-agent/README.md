# Marketizo WhatsApp Agent MVP

This isolated service connects the dedicated **Marketizo Client Care** WhatsApp Business account as a linked device, reads new group messages, classifies client risk, and sends private WhatsApp alerts for **RED** and **URGENT** events.

It does not automatically reply in client groups and does not modify the Marketizo CRM.

## Important

This MVP uses WhatsApp Web automation because the official WhatsApp Business API does not provide the required group-listening workflow. Use only the dedicated agent number. WhatsApp may change or restrict this behavior.

## Setup

1. Install Node.js 20+ and a Chromium-compatible browser on an always-on machine.
2. Open this directory and run `npm install`.
3. Copy `.env.example` to `.env`.
4. Set `OPENAI_API_KEY` and `ALERT_TO`.
5. Optionally set `MONITORED_GROUPS` to exact comma-separated group names.
6. Run `npm start`.
7. In WhatsApp Business, open **Settings > Linked Devices > Link a Device** and scan the terminal QR code.

The linked-device session is stored locally in `.wwebjs_auth/` and must never be committed.

## Alert recipient

Use the international number without `+`, followed by `@c.us`.

Example format: `43123456789@c.us`.

## MVP behavior

- Reads only new group messages.
- Ignores messages sent by the agent itself.
- Classifies messages as GREEN, YELLOW, RED, or URGENT.
- Sends private WhatsApp alerts only for RED and URGENT.
- Never sends an automatic reply to a client group.
