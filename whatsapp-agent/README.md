# Marketizo WhatsApp Agent MVP

This isolated service connects the dedicated **Marketizo Client Care** WhatsApp Business account as a linked device, reads new group messages, judges client risk in context, and sends private owner alerts only when the situation is materially relevant.

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
- Uses `OPENAI_ROUTINE_MODEL` for the first pass and `OPENAI_SMART_MODEL` for ambiguous, sensitive, or consequential situations and owner reports.
- Uses GREEN, YELLOW, RED, and URGENT as consequence labels, not as a substitute for contextual judgment.
- Formats owner updates as a bold WhatsApp client name followed by a short, natural Serbian assessment.
- Persists per-model call and token totals for the 30-day hybrid trial and logs each model decision for cost and quality review.
- Never sends an automatic reply to a client group.
