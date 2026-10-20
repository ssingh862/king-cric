# Platform brand appearance

Administrators can open Settings → Platform administration → Brand appearance (or `/admin` on the website). Choose from twelve combinations (Green, Pink, Blue, Amber, Teal & Ice, Violet & Lavender, Coral & Peach, Navy & Gold, Mint & Forest, Burgundy & Rose, Indigo & Sky or Slate & Silver), review the preview, then apply. This changes the shared brand identity, not a tournament's own team colors. Registration/ongoing/completed status colors retain their meanings.

`GET /appearance` is public and returns only the selected palette. `PUT /appearance` requires an authenticated, non-suspended administrator; the server validates the palette against an allowlist. The selection is stored in MongoDB's Appearance document with ID `global`, recorded in AuditLog, and broadcast via `appearance_updated`. Clients cache the last selection for offline use and refresh on startup, reconnect and foreground. Existing account roles are unchanged.

## Release order

1. Deploy the backend containing `server/src/routes/appearance.ts` and the mount in `server/src/index.ts` to Render. No new secret or database migration is required; the default is Green.
2. Publish the website build. The site uses the same Render API.
3. Build and install a new Android APK. Older APKs do not contain the new appearance panel or palette synchronization.

The website and new APK receive subsequent admin color changes without rebuilding. Ordinary users can still choose language and light/dark appearance independently.

Validation: `npm run typecheck`, `npm run build --prefix server`, `npm test`. Run `tests/appearance-api.integration.ts` using the server's tsx loader with disposable localhost MongoDB on port 27032. The integration test never uses the production DB URI.

## Admin workspace

Overview shows exact platform counts. Users supports paginated name/email search, active/suspended filters and confirmed suspend/restore actions; admin accounts cannot be suspended. Tournaments supports search/status filters and links to existing organizer controls. Reports can be resolved or reopened. Activity shows a paginated audit history with actors and dates. Every API requires the administrator role. Lists use 20 records per page.
