# SMM questionnaires

The employee portal appends an Upitnici link for active Social Media Managers and the existing two owner accounts. It opens in another tab to preserve in-progress time-entry forms. The API checks the saved employee record on every authenticated request. Other active employees may read answers via an internal link; they cannot list, create, edit, or revoke questionnaires.

Admin employee forms offer the existing canonical position names; older custom titles are retained. Changing position affects questionnaire permissions on the next API request. This module does not change existing attendance, salaries, report permissions, or employee sessions.

## Deployment

Before enabling this release, apply `migrations/questionnaires.sql` to the intended Supabase project and confirm RLS is enabled, anonymous/authenticated roles have no privileges, and service_role has SELECT/INSERT/UPDATE. This migration only adds the questionnaire table. The existing CRM state and employee work records are never modified by the questionnaire API.

Deploy a preview first. Preview rows use a separate namespace in the new table; production links and data do not appear in previews. Verify SMM and non-SMM permissions, create both forms in both languages, save a draft on one browser and resume from another, submit, and open the authenticated answer link on another device. Confirm time entry remains functional before promoting the tested release.

No client secrets or passwords are collected. Existing credential questions are adapted to account names/URLs and granting access. Source questions are provided in Serbian; German is a reviewable translation. Editing a template changes future invitations only.

Public fill links expire after 90 days and can be revoked. They use a UUID plus a purpose-separated HMAC using the existing employee session secret, with the existing service-role secret as fallback. Rotating that secret invalidates outstanding public links. Answer links require an active employee session and do not contain the public fill token. Draft saving is explicit and confirmed by the server. Concurrent saves use compare-and-swap; conflicts keep entered text visible. Retrying a create request is idempotent. Completed submissions cannot be overwritten through the public endpoint.

The new table needs inclusion in the normal database backup/retention plan. No schema or application changes were applied to production during preparation.
