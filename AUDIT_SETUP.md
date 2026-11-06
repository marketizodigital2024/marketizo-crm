# Marketizo Audit

The public audit is free. The preview contains three findings and a practical sample: one video script, three stories and three carousel slides. Contact details are required only to open the full report and its 26 content ideas.

## Runtime

Keep the existing server-only OPENAI_API_KEY, APIFY_TOKEN, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the Vercel preview environment. Optional OPENAI_AUDIT_MODEL and OPENAI_TRANSCRIBE_MODEL override the current models. No database migration is required; the existing marketizo_audits table stores the report, evidence and contact in separate JSON fields. Service-role credentials never reach the browser.

The audit domain belongs to the codex/marketizo-growth-audit-mvp branch. Do not promote this branch to the CRM production branch: app.marketizo.com uses main independently.

## Behavior

Each connected network loads independently. The browser displays actual returned profiles and posts while other networks finish. The analysis endpoint streams actual server stages as NDJSON when requested. No synthetic completion percentages are shown.

The server selects up to twelve posts across all loaded networks, downloads a limited visual sample and attempts one bounded speech sample per network. The report states the actual available coverage. Failed analysis never falls back to a fabricated generic report.

An unguessable access token protects each new full report. The contact must be successfully stored before the report is released. CRM webhook acceptance is tracked separately; it is not proof of any message delivery. Previously confirmed paid reports remain readable through the legacy path.

## Verification

Run `node --experimental-vm-modules tests/verification.mjs` for offline contact-gate, evidence-reference, persistence, access-token and streaming checks. The deliberate database-failure fixture logs one expected error.

Reserved example.com/org/net email addresses combined with names starting with `Marketizo QA` are saved as test submissions and do not invoke the CRM workflow. Real submissions are stored normally and forwarded to the configured agency webhook. The report route retains pending CRM status if the webhook cannot be reached, so the contact remains available for recovery.

Live verification used the public Instagram, Facebook and TikTok profiles of Srpska škola. One-, two- and three-network runs were checked from input through preview, contact, full report, 26 ideas, reopening and PDF export. Recheck the final deployment when changing network extraction, contact handling or report generation.
