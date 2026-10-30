# Work-log metadata protection and recovery

Status: staged code and offline recovery preview. No production data or schema has been changed by this work.

The general state writer already rejects stale revisions and undeclared row removal. It did not reject a full-state serializer that kept every work-log ID and duration but dropped activity/client fields. The October 16 backup boundary is evidence of that shape of loss, not proof of the particular caller responsible. A reproduced serializer-shaped request must now be rejected with HTTP 409 before a backup or business write.

`lib/work-log-integrity.js` protects populated metadata after role-scoped merging. Canonical changes to an internal activity may intentionally clear its client. Empty or noncanonical fallback values are rejected. Existing legacy entries without metadata remain readable and do not stop unrelated saves. Compare-and-swap revision checks still reject stale browser saves and races with live appends.

`database/work-log-integrity.sql` is a reviewed deployment candidate, not an applied migration. Its update trigger covers direct database and RPC writes as well as the API. It blocks the same field loss and records committed inserts, edits and deletions in a private, RLS-enabled audit table. Rejected writes are not durable audit rows because their transaction rolls back; the API emits a count-only structured warning. This does not configure an external alert subscription. The state API supplies its authenticated actor ID; writes without that trusted server header are explicitly recorded with an unknown actor and `database-or-rpc` source. A concrete RPC writer can add a trusted context later. The audit table has no public access or browser endpoint.

## Checks

The new API regression exercises actual handler execution for both full payload and patch transports, a legitimate unrelated save, a stale revision, and a competing live append between read and compare-and-swap write. The PostgreSQL test executes the real trigger and existing append RPC against an isolated PGlite database, including canonical internal corrections, retry idempotency, queued concurrent appends, rollback of audit records, and denied anonymous access. These tests never connect to production.

The offline recovery evaluator modifies only five metadata fields on exact matching record IDs. It requires the full current record to equal the audited `before` record, skips changed/deleted entries, preserves other employees' new entries, and rejects duplicate proposals and arbitrary fields. The CLI writes only a local preview and verifies unchanged daily minute totals, all nonmetadata fields and all records from the audit day. It is not a production recovery executor. Never PUT the preview or the old snapshot over the current state.

## Release and recovery sequence

1. Before production work, verify the active deployment and database functions/triggers against this candidate. Preserve a fresh snapshot and a durable copy of the historical recovery evidence outside rotating daily slots.
2. Run all regression checks, the database test, and the offline preview. Review the change; deploy the code and install the database guard in a planned quiet window. Creating or opening a draft PR does not deploy either component. Validate normal append and conflict behavior in staging first. Measure trigger cost on realistic full-state payloads.
3. Verify the private schema is not exposed through the Data API, anonymous/authenticated access is denied, and service-role and existing definer RPC callers retain required permissions. Run database advisors after installation. Confirm guard installation and a read-only integrity query; do not create fake employee work logs in production.
4. Restore confirmed metadata through a separately reviewed server-side transaction: lock `marketizo-main`, re-read each exact ID and compare with its audited `before`, patch only the allowed five fields, back up in the same transaction, and preserve every unrelated field and concurrent record. Abort or skip drift; never restore an entire historical snapshot. Keep a field-level recovery manifest with source backup IDs and before/after metadata.
5. Recheck per-employee/day/month totals, record count, audit history, client allocation, and that the final current-day set is intact. A rollback must restore only the five fields if the record still matches the recovery result; it must not replace the complete state.
6. Resolve historical-version/category exceptions separately. Administrative quota supplements are not evidence of work for a client. Entries without original metadata require an independent task/video source or employee confirmation.

No system can promise zero future data loss; layered rejection, transactional audit, recoverable backups and verified releases reduce the risk and make damage traceable.
