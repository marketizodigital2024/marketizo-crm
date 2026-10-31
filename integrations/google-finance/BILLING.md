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
