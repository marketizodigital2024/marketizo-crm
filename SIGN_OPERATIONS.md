# Marketizo Sign — launch and privacy operations

## Current state

The production private schema exists. Sending remains disabled. SMTP password presence was confirmed in Vercel without reading it. The two server keys still need their own saved Secret entries. Issuer name/address and the intended versioned production notice URL are saved as Config; the actual production page has not been published. Company identity is taken from the user's published Impressum, not independently certified against the register.

## Notice and versioning

`sign-privacy-20261020.html` is a concrete notice candidate for the implemented SES flow. Review the actual processing agreements, international-transfer safeguards and retention procedure before making it the operative notice. The notice does not supply those agreements or replace their review.

Set `SIGN_PRIVACY_URL=https://app.marketizo.com/sign-privacy-20261020` once that version is deployed and reviewed. New invitations store the notice version and URL in their immutable issuer snapshot; the public view and final evidence refer to that snapshot. Preserve historical notice files; publish a new dated file for a future material change. Existing requests must continue linking their original notice. The checkbox accepting a contract is not marketing consent.

The main website privacy page should gain a Marketizo Sign section or link to this specific notice once published. Do not erase its existing Hostinger/HighLevel/website processing sections. The main site's source is not in this GitHub repository.

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
