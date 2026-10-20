# Questionnaire backup

The existing daily backup now includes a `questionnaires` section in both the private Vercel Blob archive and rotating database copy. It contains every production questionnaire row (including drafts, completed answers, revoked/expired invitations and edited templates), plus the four versioned default templates. Preview records are excluded. Blob readback compares the complete questionnaire section before success is reported.

`/backup-status.html` is an owner-only maintenance view: create a backup now, verify the private file and run restore validation without writing live data. It never enables a real restore. Automated cron authorization remains unchanged.

Real restores remain restricted to the server's existing cron-secret maintenance authorization and explicit confirmation. Before restoring, a separate emergency copy includes current questionnaires and is read back. The new SQL wrapper restores CRM, KPI, employee authentication and questionnaire data in one transaction. It rejects concurrent CRM/KPI/questionnaire changes; new questionnaire revision timestamps invalidate stale browser forms. Preview rows are preserved. Old backup files without questionnaires preserve current questionnaire data.

Apply `migrations/questionnaire-backup.sql` before releasing the updated endpoints. This adds restricted invoker functions without modifying any employee or questionnaire records. No production restore is needed to deploy.

Validation: `tests/questionnaire-backup.cjs` exercises archive readback failure, backup coverage, owner-only execution, restore dry-run and legacy compatibility. `tests/questionnaire-backup-sql.cjs` performs a complete restore roundtrip in a disposable PGlite database, verifies template and answer payloads, preview isolation, conflict rejection and transaction rollback. Production validation should create/read back a private backup and run a dry-run only.

Retention remains the existing 30 private daily files and 30 rotating database slots. Backup is periodic, not real-time replication. Restore of public questionnaire links also requires retaining the existing signing secret in deployment configuration.
