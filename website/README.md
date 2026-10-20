# KingCric website

Responsive website plus the complete Expo web app, using the existing KingCric API at https://king-cric.onrender.com. This source snapshot includes email login, teams, tournament management and scoring. The new homepage is in application/src/components/website.

## Build

Use Node 22.23.1. Run `npm run setup` then `npm run build` from this directory. Deploy `dist` on a static host with single-page-app fallback to index.html for all non-asset routes. No backend secrets belong in this frontend.

The application directory is a snapshot of the mobile repository's app, src and config files. Refresh it when sharing new app changes. The build explicitly uses the Render API URL, never a local .env file.

The Sites deployment starts owner-private. Public sharing must be enabled separately before other testers can access it. KingCric email authentication remains separate from this hosting access restriction.

## Deploy only this website to Vercel

Import the Git repository in Vercel and select these settings:

| Setting | Value |
| --- | --- |
| Root Directory | `website` (or `.` if the repository contains only this directory's contents) |
| Framework Preset | Other |
| Node.js Version | 22.x |
| Install Command | `npm ci --prefix application --include=dev` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

The committed `vercel.json` sets the install, build, output and SPA fallback. Leave "Include source files outside of the Root Directory" disabled. `/login`, `/admin` and tournament links work on direct visits and refreshes. The backend continues running at `https://king-cric.onrender.com`; no MongoDB URI or JWT secret is needed in Vercel. Only the generated frontend in `dist` is served.

This local `website/` directory currently has its own Git repository for Sites. Ensure the actual files are in the Git repository you import into Vercel: adding a nested repository to the parent repository can record a Git link instead of its files. Do not delete its `.git` directory. You can deploy directly from this directory without reorganizing Git:

```sh
cd /Users/ps-devmonali/Documents/Sandeep/king-cric/website
npx vercel login
npx vercel --prod
```

Select this directory as the project root when prompted. A Vercel deployment has its own hosting access settings; the existing Sites audience settings do not transfer. KingCric's application login and administrator permissions still apply.
