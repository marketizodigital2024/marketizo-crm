# Marketizo Sign — phase 1

This branch adds a separate owner-only Sign workspace at `/marketizo-sign`, linked from the CRM dashboard and employee profile. It implements structured rich-text drafts, reusable templates, manual or CRM recipient selection, categories, search with pagination, draft/ready states, archives (including template archives), escaped previews, immutable prepared snapshots and transactional audit events. External recipients do not become CRM records.

**This is the preparation phase, not a production signing system.** Sending is blocked on the server and in the UI. There is no public signer endpoint, outgoing mail, OTP delivery, canonical PDF renderer, qualified signature execution, validation pipeline or signed-PDF archive yet. A frozen snapshot is not a signed contract. The audit clock and SHA-256 chain are not qualified timestamps or an independent legal attestation. There is no claim of worldwide legal validity.

## Database and access

The reviewed setup script is `database/marketizo-sign.sql`. It has not been applied to production. It creates separate documents, templates, versions, events and idempotency tables; it does not rewrite `agency_crm_state`. Apply once on an isolated test database containing a fixture CRM row and active owner before running integration tests. It is a manual setup script, not an automatically generated or applied Supabase migration. Produce the deployment migration with the installed Supabase CLI after sandbox verification and advisor review.

Reuse `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `CRM_STATE_ID` in the server environment. `SIGN_APP_ORIGIN` defaults to `https://app.marketizo.com`; preview should have its own explicit origin and isolated database. No Sign configuration goes into browser JavaScript. Check Supabase Data API exposure separately from RLS, including the 30 October 2026 exposure change. Grant the service role access to the RPC and tables; never grant browser roles access. Verify behavior against deployed policies and run database advisors before rollout.

API access reuses the canonical session checks in `api/state.js`. First release permits `full-admin` only. Every command rechecks that the owner remains active in canonical CRM state inside the database transaction. UI visibility is not authorization. Data resides outside CRM browser caches and the shared CRM state payload. `sw.js` excludes Sign navigation from offline caching, and Sign responses use `no-store`.

Writes carry a stable command UUID and expected revision. A retry returns the original acknowledgement; changed intent with the same command is rejected. Concurrent document edits return a conflict. Retrying does not overwrite a frozen document. Events, snapshots and command acknowledgements cannot be updated/deleted by the application role. DB superusers remain capable of altering database controls: the hash chain alone does not protect against a fully privileged attacker. Independent timestamp anchoring and protected storage are future work.

## Recommended service: sproof

Recommendation: evaluate **sproof Sign API + eID Hub/Widget**, an Austrian integration platform, for the first sandbox. Its official documentation supports recipient workflows, QES, ID Austria integration, PAdES download and signature validation APIs. It orchestrates trust services; do not label the entire platform or every output a qualified trust service. Validate the specific qualified certificate/service and signature produced for each workflow.

The API documentation at `https://sign.sproof.com/api/v1/documentation/json` identifies version 3.0.10, dated 12 October 2026. It describes Enterprise API access and a developer-key route. The current public pricing page also lists API Access in Team, while embedded widgets, one-time QES identification and validation API features appear under Enterprise. Confirm the exact API/identification/embedding entitlement and sandbox terms in writing; do not assume the entry-level subscription covers this integration. No vendor account was created, payment authorized or customer document uploaded.

The documented current create operation is `POST /api/v1/documents/signature`, rather than the legacy create endpoint. For the integration, enforce the approved qualified type at document and recipient levels; do not allow an SES fallback. Creating a request and returning from the signing screen do not prove a signature is valid. Never mark a contract signed from an unverified callback alone.

**Alternative:** A-Trust direct integration through its documented CSC interface. It is listed in the Austrian RTR trusted-list material. Direct integration is attractive for Austrian identity flows, but foreign identity onboarding, workflow management and PDF validation need explicit evaluation. A provider's name on a list is not sufficient: check the specific service's qualified status at the relevant time.

**Coverage to obtain in writing:** supported countries, identity documents and mobile numbers for new signers without ID Austria or an existing eID; one-time QES identification; specific QTSP and service used; account requirements for external signers; supported languages; evidence/validation formats; qualified timestamps and PAdES long-term preservation; callback authentication, reconciliation and idempotency; data location, processors, retention/deletion, export and DPA; API/white-label entitlement, minimum spend, cost per identification/signature, test access and SLA. International onboarding coverage is distinct from legal recognition in the signer's jurisdiction.

Stripe Directory was attempted first, but its CLI was absent and its site could not be read through the available tool. The recommendation therefore uses official provider documentation and RTR sources, not a verified Directory listing.

## Needed from Marketizo for connection

1. sproof account with a developer/sandbox key and an API-enabled plan or written confirmation from sproof that the proposed plan supports the required flow. No subscription should be purchased until price and coverage are confirmed.
2. Exact Austrian legal entity name, registered address and registration number; the person authorized to sign for Marketizo and how their authority will be established. Their personal ID Austria/QES is not interchangeable with a company seal.
3. Two or three representative service, employment and NDA/annex templates, with any existing signature/form clauses, and the name of the legal reviewer. Austrian-law selection does not displace mandatory employment or consumer rules abroad.
4. Expected monthly number of documents and signers, main recipient countries, sender/reply-to address and branding. This is needed for the quote and a practical country test matrix.
5. Restore authorized Vercel project access and provide the intended isolated Supabase test project through the connected account. The previous Vercel deployment lookup returned 403 for the Marketizo team. Do not paste database or API keys into chat: store them as server-side environment secrets or grant appropriate project access.

## Next implementation after sandbox access

Add a tested canonical PDF renderer with fonts; have the sender and signer review the exact frozen bytes. Persist the original PDF in private storage with readback hash verification. Add the delivery outbox and e-mail OTP challenge consumption with atomic limits, version/session binding, expiry and replay protection. OTP gates document access; it is not the qualified signing authorization.

Then wire sproof preparation/invitation, remote identification, explicit intent, all required signers, authenticated/reconciled callbacks, independent validation, qualified timestamp evidence, retention and original signed-PDF download. Preserve actual signed bytes rather than rerendering them. Unknown legal/identity coverage or validation results fail closed, without silently switching to a simple signature. Contract policies need dated legal approval before enabling sending.

## Verification

`pnpm test:sign` runs content/API tests and the PostgreSQL setup/transaction test with the existing locked PGlite dependency. `pnpm test` also includes the existing CRM regression suite. `node scripts/build-static.cjs` verifies HTML asset references and excludes server/database sources from the published output. The complete initial-commit suite passed on Node 22 and 24 in GitHub Actions; local content/API checks and the 151-reference static build passed as well. The local environment blocks listening on a test-server port, so browser interaction and visual layout remain unverified. Before production, perform that check on an isolated test deployment, including preview, mobile layout, retry/conflict handling, template reuse and archive/restore. Never send real invitations as a test.

## Sources checked 20 October 2026

- sproof developer integration: https://www.sproof.com/en/dev/
- sproof API schema: https://sign.sproof.com/api/v1/documentation/json
- sproof developer onboarding: https://academy.sproof.com/en/start/getting-started-for-developers
- sproof plans: https://www.sproof.com/en/sproof-sign/
- A-Trust CSC integration: https://a-trust.at/de/produkte/Signaturl%C3%B6sungen_f%C3%BCr_Unternehmen/Kooperation/
- Austrian provider list: https://www.signatur.rtr.at/Vertrauensdiensteanbieter.en.html
- Austrian SVG §4: https://www.ris.bka.gv.at/eli/bgbl/i/2016/50/P4/NOR40184733
- EU trust-service recognition: https://digital-strategy.ec.europa.eu/en/faqs/questions-answers-trust-services-under-european-digital-identity-regulation
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
