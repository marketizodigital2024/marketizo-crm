# Marketizo Sign — first-party signing

## Current paper layout and preparation (2026-10-20, PR #66)

New prepared PDFs use renderer marketizo-pdf-4: fixed Marketizo logo/entity/address/email header; single-language Serbian or German client, employee or business-contractor signature blocks at the bottom of the last agreement page. The owner selects Serbian or German for each document/template; the body text is not automatically translated. Only client documents have a cooperation-start field. Manual company, representative, address, tax/registration number and recipient email are supported without a CRM dossier. Contract details are frozen with the version. Actual drawn/typed signatures and Europe/Vienna signing times fill reserved agreement boxes through an incremental update; no extra signature page is added for this renderer. The separate evidence export remains authoritative for the signed manifest and application seal. Older frozen originals keep their existing receipt format and are never regenerated.

Use a Marketizo-role recipient for the company's actual signature; no owner's autograph/date is inserted before their recorded acceptance. Names that coincide are resolved by the authenticated recipient email. The large signature dialog supports mobile input. Preparing a PDF does not issue a link or send mail. Email invitations and manual links are distinct delivery modes, both gated by SIGN_SES_ENABLED. Link-only invitations retain encrypted recipient-scoped tokens but skip SMTP; retries return the same links. Completed documents still queue the final PDF to the named recipient email after all required signers accept. Keep SIGN_SES_ENABLED=false for this release. No new database migration is required. Older dated OTP/no-completion-mail statements below are historical and superseded by this section and the direct-link section.

## Direct-link flow update — 20 October 2026

Owner requested one page: invitation link opens the exact PDF inline and the signature field, with no OTP step and no separate PDF tab. Acceptance still requires the signer to explicitly act. Access is recorded as `email_link` (not identity verification or an OTP check). A completed immutable PDF is automatically queued for email to every required signer after all signers finish; delivery has durable retry and a per-request/recipient unique job. Existing originals/receipts are never rewritten. Apply only the new `database/marketizo-sign-direct.sql` migration after the existing schema; do not rerun earlier migrations. The new notice version is `2026-10-20.1` at `/sign-privacy-20261020-link`; existing notices remain available. Earlier dated OTP setup/test sections below are historical. Keep new invitations disabled during this change.

Marketizo Sign adds an owner-only workspace, rich-text documents and reusable templates, external recipients without CRM accounts, categories, search, statuses and archive. The public signing portal uses e-mail OTP, explicit acceptance, typed name and optional drawn signature. This implementation requires no sproof account.

## Legal scope

This is a simple electronic signature (SES). An e-mail code demonstrates access to an inbox, not independently verified identity. The audit clock is a server timestamp; the application Ed25519 evidence seal is not a qualified signature, qualified seal or qualified timestamp. No universal enforceability or court outcome is promised.

Austrian ABGB §883 generally permits freedom of form. Where written form is required, SVG §4 addresses qualified electronic signatures under §886, subject to exceptions and additional requirements. Review each actual template, contractual signature clause, signing authority and applicable mandatory foreign consumer/employment law. A choice of Austrian law does not resolve all foreign mandatory requirements. Before each SES invitation the sender must record a form reviewer/reference and confirm that SES is appropriate. This declaration records a decision; software does not supply the legal review. Documents marked QES are blocked from the SES route. The QES option is reserved; no qualified provider integration is implemented.

Sources: https://www.ris.bka.gv.at/eli/jgs/1811/946/P883/NOR12018607 and https://www.ris.bka.gv.at/eli/bgbl/i/2016/50/P4/NOR40184733 (checked 20 October 2026).

## Implemented safeguards

- Canonical CRM authentication and full-admin checks, rechecked transactionally; Sign data is separate from shared CRM state and offline caches.
- Immutable document versions and prepared PDF bytes. Sender reviews the same PDF that recipients receive. Hash binding prevents signing a changed version.
- Seven-day invitation, scoped high-entropy token, HttpOnly session, OTP expiry, attempt/resend limits, one-use verification and explicit consent. All required recipients must accept.
- Transactional encrypted mail outbox, leased delivery/retries, stable mail identifiers and durable finalization. SMTP acceptance does not prove inbox delivery.
- Original PDF retained byte-for-byte in the incremental final PDF. Receipt and evidence export include hashes, acceptance context and an application Ed25519 seal. `node scripts/verify-sign-evidence.cjs` supports offline integrity verification; establish trust in the issuer public-key fingerprint separately.
- Private database access, append-only evidence/version records and idempotent commands. Database administrators can alter underlying controls; independent anchoring and externally protected retention remain future improvements.

## Deployment steps

Code is in draft PR #54. The private production Sign schema was applied on 20 October 2026 as `marketizo_sign_initial_private_schema`; all 12 tables have RLS and deny direct anon/authenticated access. The command/flow RPCs also deny these roles. SMTP host/port/user/from and SIGN_SES_ENABLED=false were saved through the authorized browser. SMTP password presence was subsequently confirmed without reading it. Issuer name/address and the intended production notice URL were saved. The separate internal/evidence keys, processor/retention review and actual delivery test still require completion. Test delivery uses a captured mailbox fixture, not a real recipient. The management connector returned 403; authorized Chrome access to project settings now works.

1. For a new environment, on an isolated test database with the CRM fixture, apply `database/marketizo-sign.sql`, then `database/marketizo-sign-flow.sql`. These are reviewed setup scripts. Their combined initial production schema is recorded in Supabase migration history; do not rerun them on the existing production database. Generate the deployment migration using the Supabase CLI and review database advisors/policies before production.
2. Reuse server-only `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `CRM_STATE_ID`. Browser roles must have no direct Sign table/RPC access. Use a separate preview database and explicit preview origin.
3. Configure server secrets below, deploy Python and Node functions, and verify the scheduled `/api/sign-jobs` worker. Existing `vercel.json` configures its schedule. Keep sending disabled until the checklist is complete.
4. Run the full isolated browser flow, real test-mail round trip, expiry/retry checks, PDF/evidence export, backup/restore and access review. Verify sender-domain SPF/DKIM/DMARC and bounce handling with the mailbox administrator. The current outbox retries SMTP failures; delivery/bounce reconciliation is not integrated.
5. Have the actual templates and eligible document types reviewed; publish the privacy notice, define retention/legal holds and deletion procedure, confirm authorized company signers, then explicitly enable SES sending.

## Server configuration

- `SIGN_APP_ORIGIN=https://app.marketizo.com` (HTTPS origin only).
- `SIGN_INTERNAL_SECRET`: randomly generated secret, at least 32 characters. Protects internal requests, scoped identifiers and encrypted pending mail. Rotation needs a plan for pending jobs and active sessions.
- `SIGN_EVIDENCE_SECRET`: separate randomly generated secret, at least 32 characters. Back it up securely; retain trusted historical public keys/fingerprints when rotating.
- `SIGN_SMTP_HOST`, `SIGN_SMTP_USER`, `SIGN_SMTP_PASSWORD`; `SIGN_SMTP_PORT=465` for TLS or `587` for STARTTLS.
- `SIGN_MAIL_FROM=office@marketizo.com` (user-confirmed sender).
- `SIGN_LEGAL_ENTITY`, `SIGN_LEGAL_ADDRESS`: verified registered company details.
- `SIGN_PRIVACY_URL`: production project Config is `https://marketizo.com/zastita-podataka/#marketizo-sign` (saved and reloaded on 20 October 2026). This existing public section displays version 2026-10-20; do not add a duplicate. The prepared app page `/sign-privacy-20261020` exists on the Sign branch but returns 404 on the current production deployment. A saved environment change applies to a subsequent deployment, not already-running functions. Each new request retains its notice version/URL; preserve historical notice content. See `SIGN_OPERATIONS.md` before activation.
- `CRON_SECRET`: server-only authorization for background delivery/finalization.
- `SIGN_SES_ENABLED=false` until deployment, mail and legal checks pass; set `true` deliberately afterward.
- Protected previews may require `VERCEL_AUTOMATION_BYPASS_SECRET` for the authenticated internal PDF/mail helper.

Do not paste mailbox passwords, API keys or signing secrets into chat. Configure them in the hosting secret settings through authorized project access.

## Operational limits

The PDF renderer embeds Latin/Greek fonts and supports Serbian Latin and German characters. Unsupported characters are rejected rather than silently corrupted; broader scripts require additional licensed fonts and tests. Original PDF limit is 1 MB, final PDF 1.5 MB. The current archive is private database storage; define capacity, retention, legal holds and recovery before rollout. Receipts do not use PAdES qualified certificates or independent qualified timestamps. No claim of independent identity verification is made. Final receipts are downloadable in the portal; completion e-mail and automatic bounce reconciliation are not implemented.

## Verification

The regression suite covers content escaping, authorization, immutable revisions, actual PostgreSQL transactions, concurrent/idempotent commands, OTP abuse/replay, all-party completion, evidence verification and real Python PDF generation. GitHub Actions runs Node 22/24 plus Python PDF checks. A separate browser job drives real Chromium through the admin and external-recipient flow against isolated PostgreSQL and the real PDF renderer; SMTP and CRM login are fixtures. The latest browser check also draws in the signature box and verifies the drawing survives in the exported evidence. Check the latest PR run before merge. Production sending and qualified signing are not established by these tests.

## Dosijei klijenata i zaposlenih
Dokumenti imaju opciono `data.dossier` sa stabilnim UUID-om, tipom client/employee i nazivom. Dosije nastaje čuvanjem prvog nacrta; bira se ponovo za svaki naredni ugovor, NDA ili aneks, nezavisno od kategorije. Novi primaoci ne zahtevaju CRM nalog. Kategorije i statusi ostaju nezavisni filteri. Direktorijum uključuje arhivirane dokumente, učitava se u stranicama od 200 zapisa, a lista dokumenata se filtrira po UUID-u dosijea i organizaciji na serveru. Dugme „Učitaj još dosijea” prikazuje preostale stranice; pretraga dosijea se odnosi na učitane zapise.

`data.parentDocumentId` povezuje aneks sa osnovnim ugovorom iz istog dosijea. API odbija vezu sa samim sobom, drugim dosijeom ili aneksom drugog ugovora. „Novi aneks ovom ugovoru” pravi zaseban prazan nacrt sa istim dosijeom i primaocima, bez kopiranja potpisa ili pravne provere. Šabloni ne čuvaju dosije ni vezu sa ugovorom. Zaključavanje čuva ove podatke zajedno sa celom nepromenljivom verzijom; potpisani dokument se ne premešta naknadnim menjanjem sadržaja. Raniji dokumenti bez dosijea ostaju dostupni u opštoj biblioteci. Nije potrebna nova SQL šema.

## Live recheck — 20 October 2026

GitHub PR #54 was rechecked at `3bc3a058cece8fe5c18399ae779463379ab96bbd`: draft/open, mergeable, with all four jobs in Actions run `39436142140` successful (Node 22/24, Python PDF, Chromium). Vercel preview `5jxLwG75Zh2pbFgDLskBeLg1EU7Z` is Ready. Production remains `5958a121b95f706e333ed2c5aa9e2a806fee7aee` on main; main has two questionnaire commits after the Sign merge base, so do not promote the older Sign tree over production. Integrate current main and verify the combined revision before release.

Vercel browser settings show nine SIGN entries, all Production: legal entity/address, privacy URL, SMTP host/port/user/password, mail-from and SES flag. `SIGN_INTERNAL_SECRET` and `SIGN_EVIDENCE_SECRET` are absent. Password presence only was checked; no secret value was revealed. SMTP host is smtp.gmail.com, port 465, user office@marketizo.com. `SIGN_SES_ENABLED=false` was directly verified and left unchanged. No separate SIGN preview configuration was found. Vercel MCP project discovery works, but scoped deployment/environment reads return 403; authorized Chrome access works. Local Git cannot run because the developer tools are unavailable; the Vercel CLI is not installed. Use the working connectors/browser without treating CLI limitations as lack of account access.

Supabase migration history contains both Sign setup and bounded maintenance migrations. Read-only checks confirm all 12 Sign tables have RLS and deny anon/authenticated table access, and Sign RPCs deny these roles. Documents, requests, receipts and outbox each contain zero rows. No migration was rerun and no test/customer record was inserted. The cron is present in branch configuration; actual production execution is not established while production lacks Sign code. See the explicit non-binding test protocol in SIGN_OPERATIONS.md.

## Subsequent preparation update — 20 October 2026

Miljan confirmed miljan@marketizo.com as the sole non-binding test mailbox. Two independent 48-byte random server keys were generated without displaying their values and saved as Production-only Secret entries through Vercel MCP. Fresh non-decrypting metadata reads confirm SIGN_INTERNAL_SECRET and SIGN_EVIDENCE_SECRET are both type sensitive/visibility secret, Production only. Never overwrite these existing entries as part of setup. A local mode-0600 recovery/import copy is retained outside the repository; an independently protected recovery copy and restore drill are not yet established.

The connector's explicit teamId scope returned 403; the same verified unique project ID without the redundant team parameter succeeds for environment reads and writes. This is a working authenticated MCP path, not a missing-access situation. Sending was not enabled, and production is not redeployed by adding variables.

The two newer questionnaire commits from main at 5958a121b95f706e333ed2c5aa9e2a806fee7aee are incorporated by this merge. Their five changed file paths do not overlap the Sign PR; each is retained byte-for-byte from main. Existing local untracked workspace files were not changed. CI must pass again for this combined revision before a release.

Public DNS preparation check found two separate TXT records starting v=spf1 at marketizo.com: one includes _spf.google.com; the other includes spf.titan.email and _spf.mlsend.com with a/mx. Multiple SPF records are invalid; prepare one reviewed record preserving all still-required senders and check lookup limits before a DNS change. _dmarc.marketizo.com returned NXDOMAIN through Google Public DNS. Actual message DKIM/DMARC alignment, SMTP login/TLS and inbox receipt remain untested. These findings prevent a claim that the real-mail test prerequisites are all complete. No DNS records were changed.

## Simplified preparation and one-document test

The owner uses Save draft → Preview PDF → Email or link. PDF preview automatically validates and freezes the saved revision on the server, then prepares the exact PDF; there is no separate visible Freeze button or browser confirmation. Dirty drafts are saved first. CAS revisions and idempotent freeze commands remain enforced; a failed render can retry the frozen version.

SIGN_SES_ENABLED remains the general gate. A separately authorized nonbinding test can use SIGN_TEST_DELIVERY JSON with documentId, email and expiresAt. It only permits that exact document with one exact recipient and a title starting TEST containing NEOBAVEZUJUĆE; expired/invalid scopes fail closed. Owner bootstrap exposes only the test document ID to enable its delivery button. Clear the test scope and redeploy after the invitation; general sending stays false throughout.

## Mobile document reader

The public signing page displays a responsive branded paper without requiring PDF.js, a Worker or a browser PDF renderer. The authenticated preview API verifies the frozen PDF hash, then the existing HMAC-authenticated Python helper extracts its text with pypdf layout mode. Only repeated stationery and the repeated document title are removed from the body; the responsive header and title show those values separately. Recipient access/session checks and the exact original PDF remain unchanged. The original PDF is always available as a native download, including a fallback if the paper preview fails.

There are no technical viewer controls, pixel/percentage labels or page-number rails. Long contracts scroll naturally. The signature section follows the text on the same white paper; jumping there never accepts the document. Explicit consent is still required.

New PDFs carry the selected SR/DE language in MarketizoLayout metadata. Older frozen PDFs use their fixed signature labels for language detection. Recipient UI, signature dialogs and recorded consent use one language. This does not translate user-entered contract clauses. The configured legal address omits /327 for new versions; frozen originals retain their historical issuer data. New German PDF stationery uses Österreich.

CI runs real mobile WebKit with long SR/DE fixture PDFs, Worker removed and all PDF.js URLs blocked. It checks readable text, language isolation, signature access, no page overflow and no automatic acceptance. Chromium retains full API/database/signing/PDF/evidence/mail-fixture coverage. No migration or sending flag change is required.
