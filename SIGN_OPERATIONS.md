# Marketizo Sign — launch and privacy operations

## Current state

The production private schema exists. Sending remains disabled. SMTP password presence was confirmed in Vercel without reading it. Two independent server keys were subsequently generated and saved as Production-only Secrets through Vercel MCP on 20 October 2026; fresh metadata reads confirm both entries. Values were not displayed or committed. The local mode-0600 recovery/import copy still needs independently protected backup and a restore drill. Issuer name/address are saved as Config. The public Marketizo Sign section is already published at https://marketizo.com/zastita-podataka/#marketizo-sign, version 2026-10-20. SIGN_PRIVACY_URL was corrected to that URL and checked after reloading Vercel settings. This updates project configuration for the next deployment; the running production revision still lacks Sign. Company identity is taken from the user's published Impressum, not independently certified against the register.

## Notice and versioning

`sign-privacy-20261020.html` is a concrete notice candidate for the implemented SES flow. Review the actual processing agreements, international-transfer safeguards and retention procedure before making it the operative notice. The notice does not supply those agreements or replace their review.

The currently saved production configuration is `SIGN_PRIVACY_URL=https://marketizo.com/zastita-podataka/#marketizo-sign`. It points to the existing published section; do not duplicate it. The app path `https://app.marketizo.com/sign-privacy-20261020` still returns 404 because production is on main without Sign. Use the app path only after that page is deployed and rechecked. Before a material notice change, preserve the original dated notice at an accessible stable URL; do not silently replace notice content referenced by earlier invitations. New invitations store the notice version and URL in their immutable issuer snapshot; the public view and final evidence refer to that snapshot. Preserve historical notice files; publish a new dated file for a future material change. Existing requests must continue linking their original notice. The checkbox accepting a contract is not marketing consent.

The main website already contains the detailed Marketizo Sign section, directly rechecked on 20 October 2026. Keep its existing Hostinger/HighLevel/website sections. The main site's source is not in this repository. The earlier PR notes report that the source ZIP/build.py/src was not updated after publishing; that source-sync status was not reverified during this check and remains a release task.

## Required records before activation

- Confirm registered controller details and authorized company representatives against company records. The public Impressum still has placeholders for owner and other fields; do not fill them by guessing.
- Record the applicable Vercel Pro, Supabase and Google Workspace processing agreements and the actual international-transfer mechanism under each. Verify customer identity, plan, subprocessors, support access and relevant regions. An EU database region does not establish EU-only processing. Accepting a new agreement must be completed by an authorized person.
- Record the eligible document types, actual template form review and jurisdiction limitations. QES is reserved, not integrated. Collect only data needed for the contract; the recipient evidence export currently includes all signers' acceptance contexts and technical data.
- Name an owner for privacy requests, retention reviews, incidents, backups and key recovery. Confirm retention criteria with legal/accounting advice by document category. Do not apply a blanket seven-year period to every document without checking.
- Agree a review interval for abandoned drafts, expired invitations, OTP/session artifacts and rate-limit records, and implement/test the corresponding controlled purge. Expiry, archive and automatic deletion are different things. Current immutable evidence tables intentionally prevent ordinary application deletion; a reviewed privileged maintenance procedure is required for authorized erasure. Sending should remain off until this procedure and backup cycle are settled.

## Access, correction and erasure requests

1. Receive requests at office@marketizo.com; record the request and scope in a restricted register. Verify identity proportionately; never rely only on a forwarded signing URL or disclose other contracts.
2. Locate the person's documents, parties, sessions, mail artifacts and evidence. Separate the requester's data from other signers' personal data when answering. Retain a reasoned record of any restricted disclosure or retention exception.
3. Assess legal holds, ongoing disputes, statutory retention and third-party rights before deletion. If retention remains necessary, restrict access to that purpose and document the basis. Do not silently rewrite an executed agreement; use a documented correction/addendum where appropriate.
4. A privileged erasure procedure must list affected records and backup treatment, be reviewed before execution, and retain only the minimum lawful request-handling record. Do not disable immutable guards in routine UI flows. Test the procedure on disposable fixtures before use.
5. Track response deadlines and communicate the result under the applicable GDPR requirements. Document the decisions rather than promising unconditional deletion.

## Delivery and release check

Use a named test address and a clearly non-binding test document. The current browser tests capture SMTP; they do not establish actual Gmail delivery. Verify TLS/SMTP, sender authorization, SPF/DKIM/DMARC and receipt in inbox/spam, then OTP expiry/retry, exact PDF access, explicit acceptance, all signers, final PDF and offline evidence verification. Record recovery/export tests and the public-key fingerprint. Keep `SIGN_SES_ENABLED=false` until all release checks are complete.

Do not put secret values or real signing tokens in tickets, screenshots or logs. The local `.env` import artifact contains keys, is not source code and must not be committed. Store a recovery copy securely and remove temporary import copies after backup is confirmed. Rotating the internal key affects pending encrypted jobs and sessions; retain historical public evidence keys when rotating the evidence key.

## Sources checked 20 October 2026

- Austrian DSB controller responsibilities: https://dsb.gv.at/rechte-pflichten/ihre-pflichten-als-verantwortlicher
- Austrian DSB data subject rights: https://dsb.gv.at/rechte-pflichten/ihre-rechte-als-betroffene-person
- Vercel DPA: https://vercel.com/legal/dpa
- Supabase DPA: https://supabase.com/legal/customer-resources/data-processing-addendum
- Supabase data residency: https://supabase.com/legal/privacy-resources/data-residency-and-transfers-faq
- Google CDPA: https://cloud.google.com/terms/data-processing-addendum

## Bounded scheduled maintenance

Apply `database/marketizo-sign-maintenance.sql` after the base/flow schema. The authenticated existing minute cron calls its service-only, SECURITY INVOKER RPC before draining delivery jobs. Each pass expires at most 100 queued/open requests, records one chained expiry event and cancels their pending encrypted mail. Requests already finalizing or signed are not expired by this procedure. Each pass clears at most 1,000 expired OTP challenges, 1,000 expired unaccepted-party sessions older than one hour (preserving the hourly access counter), 1,000 spent/expired encrypted mail payloads and 1,000 project-wide rate windows older than 24 hours. Live leases and current codes are preserved.

Sessions supporting recorded acceptances, immutable party acceptance/signature records, PDF bytes, versions, receipts, commands and chained audit events are retained. This is transient-data housekeeping, not a general GDPR erasure endpoint or contract retention policy. Owner-authorized requests, legal holds and reviewed retention decisions still use the process above. The only new DELETE grants are on sessions and minute-rate windows, never on the contract/evidence tables.

## Prepared non-binding real-mail test — pending recipient confirmation

No invitation was sent. Miljan has confirmed miljan@marketizo.com as the sole test mailbox. This confirms the recipient only; no sending activation is authorized. Proposed document title: **TEST — Marketizo Sign — NEOBAVEZUJUĆE — 2026-10-20**. Use a test-only dossier and one confirmed recipient, with no client/employee contract data.

Prepared document text:

> OVO JE ISKLJUČIVO TEHNIČKI TEST MARKETIZO SIGN SISTEMA. Dokument ne predstavlja ponudu, ugovor, aneks, nalog za rad niti saglasnost za marketing. Unos imena, crtež potpisa i potvrda u test portalu služe samo proveri dostave, pristupa PDF-u i tehničke evidencije. Ovim testom ne nastaju obaveze plaćanja, pružanja usluga, zaposlenja, prenosa prava niti bilo kakva ugovorna obaveza bilo koje strane. Ne unosite lične podatke osim potvrđene test e-mail adrese i test imena. Testni potpisnik: Marketizo Test. Datum testa: 20.10.2026.

1. Keep production `SIGN_SES_ENABLED=false`. Current `prepare` rejects invitations while false; there is no existing test bypass. Do not bypass this guard, directly insert requests, or claim that recipient confirmation authorizes activation. Obtain Miljan's separate approval before any sending enablement, including a temporary test environment. Prefer an isolated database/environment with an explicit origin and only the confirmed mailbox. Do not reuse production secrets/data in a general preview. No separate preview Sign config was found in this check.
2. Before that approval, record the intended environment, exact revision, confirmed mailbox, named reviewer/reference for this test text, processor/retention records and recovery owner. The two separate server secrets have been securely imported in Production; establish an independently protected recovery copy and verify restoration without printing or committing values. Verify the public notice in that environment. Integrate the two newer main questionnaire commits before publishing the owner workspace. Re-run combined-revision CI and verify production still disables sending.
3. In the approved test environment, create a draft from the text above, use test-only metadata, lock it, download/review the exact original PDF and record its SHA-256. Record document/request IDs in a restricted test record, excluding live tokens and OTPs.
4. Queue exactly one invitation to the confirmed mailbox. Record SMTP acceptance separately from actual inbox/spam receipt. Inspect message headers for SPF/DKIM/DMARC alignment and record pass/fail; verify sender office@marketizo.com and TLS. Do not treat the outbox sent state as recipient receipt. Check bounce/retry behavior separately; bounce reconciliation is not integrated.
5. Open the scoped link, confirm privacy access before OTP, request one OTP and confirm its real receipt. Check incorrect/expired code handling and one-use verification with disposable test requests; avoid lockout of the main happy path. Never put the code/link in reports.
6. Verify that the portal presents the same PDF hash/content, shows the non-binding warning, accepts typed name Marketizo Test and optionally a drawn test mark, and requires explicit confirmation. Complete all required test signers. Confirm the persisted signed status in a fresh session/read and the single acceptance/event chain, not just a toast.
7. Download the final PDF and evidence bundle. Run `node scripts/verify-sign-evidence.cjs <evidence.json> <final.pdf>` according to the script's current usage, check hashes/seal and original PDF preservation, record the trusted public-key fingerprint separately, and verify the drawing only when provided. Portal download is the current completion path; there is no completion e-mail feature.
8. Verify the service-only jobs endpoint/authentication, scheduled expiry and delivery retries in the approved environment; do not invoke production housekeeping just for this read-only audit. Exercise export/restore on disposable isolated fixtures and compare counts/hashes after restoration. Define the test record's approved retention/erasure treatment without deleting immutable evidence through ordinary UI actions.
9. Present actual results and unresolved failures to Miljan, including inbox receipts, PDF/evidence verification and recovery outcome. Production activation needs an explicit approval after the complete checklist; mailbox confirmation is not that approval. Leave production false and test sending off after the approved test window.

Current evidence: GitHub run 39436142140 and Vercel preview at commit 3bc3a05 passed; SMTP in those browser tests is simulated. Production on 5958a12 has no Sign page/worker. Real delivery, runtime privacy URL, key recovery, cron execution, restore, SPF/DKIM/DMARC and the actual processor/form/retention records remain unverified. The production Sign tables were directly checked empty (documents/requests/receipts/outbox), with RLS and no anon/authenticated table or RPC access. Applied migrations were only read, never repeated.

## Current mail-preflight findings

A public DNS read through Google Public DNS on 20 October 2026 returned two v=spf1 records for marketizo.com (Google Workspace in one, Titan/MailerLite plus a/mx in the other) and NXDOMAIN for _dmarc.marketizo.com. Consolidate SPF only after reviewing all actual senders and lookup limits; agree an appropriate DMARC reporting/policy setup with the mailbox/domain administrator. DKIM selector and actual alignment remain unverified until a real message/header check or administrator evidence is available. No DNS changes or mail sends were made during preparation. Keep SIGN_SES_ENABLED=false. The application deliberately has no test bypass while it is false.

The current main questionnaire updates are integrated by this merge. Production code deployment, runtime readiness using the saved production keys/config, cron verification, independently protected key recovery/restore, the actual processor/form/retention records and resolution of the mail-preflight findings remain release prerequisites. Do not mark the test ready solely because secrets exist or CI passes.
