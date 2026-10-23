# Kodeks ponašanja Marketizo tima

`/kodeks` is an independent owner-only module. It reuses the existing Sign storage, immutable versions, PDF renderer, recipient links, consent, signatures, audit evidence and final PDF delivery. It does not send invitations by email. Active team members receive an in-app notification in their employee portal (on entry or during the 20-second refresh).

## Daily use

1. Edit and save the policy text. The initial draft contains the agreed people-focused rules, including political/religious neutrality, privacy, non-discrimination and respectful conduct, without examples.
2. Select active employees, review each recipient's prepared PDF and confirm the recipients/signature method.
3. Send. Each employee gets their own request; one employee's signature never signs for others.
4. Track each version as prepared, pending, signature accepted/PDF processing, signed, expired or voided. Owners and the assigned employee can download the completed PDF.

Saving edits creates a new template revision. Sending it produces new immutable employee documents. Previous documents, signatures and evidence remain unchanged. Repeating the same version/employee operation uses deterministic document and command IDs, so timeouts/retries cannot create duplicate invitations. A changed employee email requires a new policy revision. Expired requests can be replaced by saving and sending a new revision.

## Deployment

Apply `database/marketizo-codeks.sql` after the existing Sign completion SQL. This replaces only `marketizo_sign_required_fields`: Kodeks acknowledgements require a name, while contracts retain their country/address/business/personal-ID requirements. No tables, client-side permissions or credentials are added. The function remains SECURITY INVOKER and executable only by service_role. The UI checks this capability and leaves dispatch disabled until it is installed.

The existing Sign environment and jobs must be enabled. No new provider or secrets are needed. The final signed PDF uses existing Sign email delivery. No actual employees or live dispatches are needed for validation.

## Verification

- `node tests/codeks.cjs`: real PostgreSQL (PGlite) and real Sign handlers/workflow for authorization, employee/tenant isolation, immutable versions, exact PDF binding, retries, acceptance, final PDF and private grants. All identities/PDF bytes in this test are nonbinding fixtures; SMTP is never called.
- `python tests/sign-pdf.py`: actual PDF rendering, policy-specific labels/consent purpose and existing contract regression checks.
- `CODEKS_BROWSER_FIXTURE=1 node tests/codeks.cjs`: opt-in loopback-only browser fixture at `http://127.0.0.1:4178/fixture-admin`, and `/fixture-employee` for notification verification. It uses isolated in-memory data, fake PDF transport and no SMTP. Never deploy test fixtures.

Functional verification does not establish the legal enforceability of an internal policy. The sender explicitly confirms the signature method for the reviewed policy before dispatch; the recipient explicitly confirms their own signature.
