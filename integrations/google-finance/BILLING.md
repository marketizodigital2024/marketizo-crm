# CRM invoice delivery

The owner prepares and confirms the exact PDF in **Finansije → Izdaj i pošalji račun**. Required billing details and explicit tax confirmation live on the client profile. Client creation/editing selects **Mesečno** or **Jednokratno**. Legacy clients retain monthly behavior without a data migration. One-time clients use their explicit initial invoice month; future monthly rosters do not recreate them. Existing originals, issued queues and payment history stay visible. The API and SQL revalidate frequency and month at issuing/delivery.

A snapshot freezes recipient, service period, net/VAT/gross and the original stationery. The number is reserved atomically only when issuing; retries reuse the same number and PDF. Existing monthly originals or payments block duplicate issuance.

Apply `database/billing-flow.sql` with a verified full backup first. The service-only RPC stores documents, PDF bytes, delivery evidence and numbering in private `finance-billing-*` state rows. Existing full-system backups include and restore these rows; conflicting current financial history blocks rollback. No new public table, anonymous grant or client-side service credential is introduced.

## Google setup (Buchhaltung only)

Preserve the existing Code.gs, Monthly.gs, project identity and triggers. Add Billing.gs to the existing Buchhaltung project. Review the scope proposal in appsscript-billing.json against the current manifest. Enable the Drive v3 service/API in the same Cloud project; missing API configuration must leave delivery locked. Obtain explicit approval before expanding Google permissions: Gmail modify enables drafts, sending and labels; Drive file enables only app-created archive files/folders. Existing read-only collectors must remain operational after authorization.

After authorization run `installMarketizoBilling` once under buchhaltung@marketizo.com. It checks the Gmail identity, installs at most one five-minute billing trigger, creates/finds private `Marketizo računi` and `Poslati računi`, and updates readiness. No client mail is sent until the owner issues a real invoice in the CRM. Readiness expires after ten minutes without a worker heartbeat. Do not run installation on Office.

The stable Gmail draft is checked again before send, including recipient, sender, no Cc/Bcc, application invoice ID header and exact PDF hash. Gmail-assigned RFC Message-IDs are recorded as provider references rather than assumed immutable. A consumed draft is never recreated for a delivery of uncertain outcome. Recovery searches Sent and verifies the same PDF. Unknown outcomes remain for review; do not manually resend.

Sent mail is labeled **Poslati računi**. The exact attached bytes are archived under **Marketizo računi / YYYY / MM - Month / Poslati**, using issue date. Drive readback verifies SHA-256 before completion. Archive or label failure retries only archival, never email delivery. The CRM marks Poslat only after sent-message evidence; a bank match changes payment status separately.

Kontoflux matching includes sent CRM invoices without requiring legacy Drive originals. Automatic posting requires a unique invoice reference, exact gross amount and confirmed payer identity. Ambiguous payments, partials and preexisting manual payment history require review.

Before enabling live sending, run the synthetic regression suite and PDF checks, verify production API authentication and navigation, and obtain authorization for a self-addressed non-accounting test message. Never allocate a real invoice number for a test. Do not create a real client invoice merely to test delivery.

Client contact/invoice email uses `client.email`, reflected in the single visible email field and `billingProfile.email`. Existing `loginEmail` and password remain unchanged for authentication; never repurpose a billing-recipient update as a credential change. A changed or cleared contact email invalidates a stale invoice profile until saved again.

## Shared recipients and combined invoices

A client can set `billingRecipientId` to another client's canonical billing profile without merging their documents or project identities. `billingName` optionally supplies the legal company name while the project keeps its name. Optional `billingDescription` supplies a project-specific default service description.

For a combined invoice, the primary and every member use the primary ID as `billingGroupId`. The owner sees one invoice choice with a separate editable line for each member. Apply `database/billing-routing.sql` before `database/billing-flow.sql`. The service-only helper revalidates the exact recipient/profile, complete active membership, frequency, month, and line/tax totals under the issuing/delivery transaction. A changed recipient or group invalidates a previously prepared snapshot. Issuing reserves one number and writes each project's net share atomically; delivery marks all member cards sent only on confirmed Gmail evidence.

The bank registry carries exact net/VAT/gross shares. Full automatic matches and explicit partial allocations distribute the gross once across member cards, preserve every cent, and retain one shared payment reference. Existing manual payment history blocks automatic posting; reversal of a linked group reverses all portions together. Cash for a grouped invoice remains blocked pending a dedicated allocation workflow. Legacy original links are private per-document records tied to their exact SHA-256; ambiguous or changed originals retain blocking issues. Never infer a project solely from a shared payer's name.


Selecting a client automatically renders an owner-only, read-only sample (`action: sample`). Only the tax/profile confirmation checkbox may be pending; missing required identity/address/email/tax details still block the sample. It uses test/non-accounting stationery, consumes no invoice number, writes no document or client state, and cannot be issued or sent. The ordinary draft/preview/issue flow retains complete profile confirmation and exact final PDF confirmation. Late responses for a previously selected client are ignored, and any form edit invalidates the displayed PDF.


Invoice editing supports additional paid work (`extraItems`) assigned only to projects already on the invoice and a 300-character optional PDF note. Each project's snapshot keeps one aggregate item/share for the existing atomic issuance and bank reconciliation contracts; optional `lines` freeze the visible service lines. Net and VAT are computed from that project's aggregate net, and the PDF validates the line sum before rendering. At most ten visible lines are allowed. Existing issued snapshots/PDFs remain unchanged. Editing or removing work/notes invalidates the previous PDF and confirmation. The viewer opens with thumbnails hidden and fits the page width; the full-screen link remains available.


Read-only samples show the current planned number from the read-only settings action, marked ENTWURF / TEST and explicitly not reserved. The counter is unchanged until actual issuing, and the existing SQL next-number check still requires a new final preview if another invoice consumes the planned number.

Invoice payment instructions explicitly separate the verified bank beneficiary (`issuer.accountHolder`), unchanged IBAN/BIC and invoice-specific payment reference. The beneficiary is not inferred from the proprietor line. Keep the bank holder independently verified if the legal branding changes. Stationery version 3 removes the apartment suffix from the issuer street address. Existing issued PDF bytes remain immutable.


Before final preview, the form reloads current profile/invoice eligibility without discarding edits. This recognizes a just-confirmed profile without a manual refresh. The reason confirmation is locked is shown beside the checkbox; already billed/paid periods remain blocked. Revalidation clears any previous sendable document before checking fresh eligibility.


Changing the service month immediately clears the previous period's message and refreshes a read-only sample for the new month. It does not create a draft or reserve a number automatically; final Preview remains explicit. All form edits refresh the visible lock reason so an old billed-period error cannot remain on a newly selected month.

The eligible draft now exposes an explicit **Pripremi konačni PDF** action beside the viewer and on the form. Sending confirmation and the send button appear only once a final PDF exists; editing immediately hides them again. Missing or invalid worker timestamps cannot enable sending. Refresh reloads profile/readiness and a read-only sample while retaining edited service, quantity, unit price, extra work and note.
