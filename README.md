# Marketizo CRM

Static demo version for Marketizo admin, client CRM and employee portal.

## Pages

- Admin: `/index.html`
- Client login: `/client-login.html`
- Employee login: `/employee-login.html`

## Note

This demo stores data in the browser localStorage. For production use, connect it to a shared database such as Supabase and server-side integrations for Meta leads, WhatsApp notifications and scheduled backups.
# CRM repair — 8 October 2026

Run `npm test` for API access, attendance history, invoice snapshots and confirmed-save regressions. Tests use isolated fixture data and never contact production. Apply `supabase/20261008_atomic_crm_restore.sql` before deploying the restore endpoint: it restricts restore to the service role and commits CRM, KPI and employee authentication together. The migration is already applied to the Marketizo production database.

Attendance includes separately entered breaks: Monday–Thursday 510 minutes and Friday 390 minutes for full-time employees. Contract hours remain 38.5 for costing. Part-time attendance is distributed over five working days using the saved monthly contract history. Balances retain all activity after the opening balance month; manual deductions remain separate from activity records and have an actor audit. Save confirmations require a successful server response. Failed forms retain their input.

The October employment change is effective from 2026-10: Dejan Klement, Luka Nikolic and Ivana Marinjes are 38.5 hours; September remains 20 hours. Fixing Ivana's September history restores 91 hours in the audited 8 October snapshot. No work records were deleted and no blanket employee credits are warranted by the agreed attendance rule.

