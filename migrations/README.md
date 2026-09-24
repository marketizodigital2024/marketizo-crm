# CRM v2 safe migration runbook

The legacy `agency_crm_state` row remains untouched and authoritative throughout preparation and backfill.

After work hours:

1. Confirm the app is quiet and create a fresh independent Vercel Blob backup.
2. Record live counts and `updated_at` from `/api/state`.
3. Run `2026-09-24_crm_v2_prepare.sql`.
4. Run `2026-09-24_crm_v2_backfill.sql`.
5. Run `2026-09-24_crm_v2_verify.sql`. Stop if any legacy/v2 count differs or any missing/extra ID is non-zero.
6. Deploy read-only v2 endpoints first. Keep all writes on the legacy state.
7. Test employee login, time history, admin dashboard, clients, employee views, and contract-file download without creating production fixtures.
8. Add dual-write one collection at a time. Each dual-write must succeed in legacy first; v2 failure must be logged and retried.
9. Observe live latency and compare counts again before switching reads.
10. Keep the legacy row and independent backups for rollback. No destructive cleanup is part of this migration.

Rollback before cutover is simply disabling the v2 feature flag. Rollback after a read cutover points reads back to `agency_crm_state`; no restore is needed because the legacy source is retained and continues receiving writes.
