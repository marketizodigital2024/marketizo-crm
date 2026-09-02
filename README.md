# Marketizo CRM

Static demo version for Marketizo admin, client CRM and employee portal.

## Pages

- Admin: `/index.html`
- Client login: `/client-login.html`
- Employee login: `/employee-login.html`
- Marketizo Brand Audit: `/audit.html`

## Public profile preview

The audit can display and scroll through real public posts by calling the serverless endpoint at `/api/profile-preview`.

For a Vercel deployment, copy `.env.example` values into the project environment and set `APIFY_TOKEN`. Actor IDs can be replaced with compatible Apify Actors when their input schema changes. The browser never receives the Apify token. When no public data is returned, the UI explicitly reports that the profile could not be loaded and does not show mock posts as real content.

## Note

This demo stores data in the browser localStorage. For production use, connect it to a shared database such as Supabase and server-side integrations for Meta leads, WhatsApp notifications and scheduled backups.
