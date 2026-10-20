# SMM questionnaires

The employee portal appends an Upitnici link for active Social Media Manager and Scenario roles (including Leader positions) and the existing two owner accounts. It opens in another tab to preserve in-progress time-entry forms. The API checks the saved employee record on every authenticated request. Other active employees may read answers internally; they cannot list, create, edit, or revoke questionnaires. Completed answers may also be viewed without login by anyone possessing the separate signed answer link.

Admin employee forms allow multiple positions through checkboxes, including existing custom titles. Legacy combined titles are interpreted on read, so every employee with an SMM role gains access without a bulk rewrite. The existing position string remains byte-for-byte unchanged until the selection is edited; edits join the selected titles for compatibility with current CRM/HR data. Changing position affects questionnaire permissions on the next API request. This module does not change existing attendance, salaries, report permissions, or employee sessions.

## Deployment

Before enabling this release, apply `migrations/questionnaires.sql` to the intended Supabase project and confirm RLS is enabled, anonymous/authenticated roles have no privileges, and service_role has SELECT/INSERT/UPDATE. This migration only adds the questionnaire table. The existing CRM state and employee work records are never modified by the questionnaire API.

Deploy a preview first. Preview rows use a separate namespace in the new table; production links and data do not appear in previews. Verify SMM and non-SMM permissions, create both forms in both languages, save a draft on one browser and resume from another, submit, and open the signed answer link on another device without login. Confirm time entry remains functional before promoting the tested release.

No client secrets or passwords are collected. Existing credential questions are adapted to account names/URLs and granting access. Source questions are provided in Serbian; German is a reviewable translation. Editing a template changes future invitations only.

Public fill links expire after 90 days and can be revoked. They use a UUID plus a purpose-separated HMAC using the existing employee session secret, with the existing service-role secret as fallback. Rotating that secret invalidates outstanding public links. Completed-answer links use their own purpose-separated HMAC and require no employee session. They do not contain the fill token, cannot save answers, and reject drafts and revoked records. They remain valid after the 90-day fill window; revocation or signing-secret rotation disables them. Old unsigned answer URLs still require an active employee session; copy a new answer link to share without login. Draft saving is explicit and confirmed by the server. Concurrent saves use compare-and-swap; conflicts keep entered text visible. Retrying a create request is idempotent. Completed submissions cannot be overwritten through the public endpoint.

The production questionnaire table is included in the daily private and rotating database backups, together with default templates. See `BACKUP-QUESTIONNAIRES.md` for readback verification, atomic restore, retention and compatibility. RLS remains on, with no anonymous/authenticated table access; public requests pass through the server token validation.

## Employee-position preview

Employee-auth, employee-profile state reads/writes, and questionnaire role checks in Vercel previews use `marketizo-smm-preview-v1`. This existing-state copy was seeded once from `marketizo-main` without updating any production employee. Preview profile edits skip production session-projection RPCs and production prewrite backups. Preview login reads credentials from that copy rather than the production fast-auth projection. This is a profile/questionnaire test environment; unrelated finance/attendance workflows are outside this preview verification.
