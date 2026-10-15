# KingCric — Local Cricket Tournament App

A modern React Native (Expo) app for local cricket tournaments with live ball-by-ball scoring, tournament management, and team registration — powered by **Node.js + MongoDB** (no Supabase).

![Dark IPL-inspired UI](https://img.shields.io/badge/UI-Dark%20%7C%20Glassmorphism-FF6B00)
![Stack](https://img.shields.io/badge/Stack-Expo%20%7C%20Node%20%7C%20MongoDB-7B2CBF)

## Features

| Feature | Description |
|---------|-------------|
| **Email Auth** | Sign in / sign up with JWT auth via Node API |
| **Live Scores** | Real-time ball-by-ball updates via Socket.io |
| **Scoring Engine** | Overs, strike rotation, extras, wickets |
| **Tournaments** | Create/manage leagues, points table, NRR |
| **Teams & Players** | Registration, squad, season stats |
| **Free for everyone** | No plans or payments — all features included |
| **Push Notifications** | Expo Notifications for live score alerts |

## Tech Stack

- **Expo SDK 57** + TypeScript + Expo Router (React Native app)
- **Node.js + Express** — REST API
- **MongoDB + Mongoose** — database
- **Socket.io** — live score updates
- **NativeWind v4** — Tailwind CSS styling
- **Zustand** — Auth & live scoring state
- **TanStack React Query** — Server data caching

## Project Structure (single repo)

```
app/                    # Expo Router screens (React Native)
src/                    # App logic, hooks, components
server/                 # Node.js API + MongoDB
  src/
    models/             # Mongoose schemas
    routes/             # REST endpoints
    services/           # Points table, innings sync
```

## Quick Start

### 1. Install dependencies

Use Node.js 22.23.1 (or a supported newer LTS) and Expo Go for SDK 57.

```bash
npm install
npm run server:install
```

### 2. Start MongoDB

Make sure MongoDB is running locally, or set `MONGODB_URI` in `server/.env`:

```bash
cp server/.env.example server/.env
```

### 3. Configure the app

```bash
cp .env.example .env
```

Set `EXPO_PUBLIC_API_URL` to your API (default `http://localhost:3000`).  
On a physical device, use your computer's LAN IP, e.g. `http://192.168.1.5:3000`.

### 4. Start the API server

```bash
npm run server
```

### 5. Start the app

```bash
npx expo start
```

**Demo mode:** Without `EXPO_PUBLIC_API_URL` in `.env`, the app runs with mock data so you can preview the UI immediately.

## Deploy API on Railway

Railway should host **only the Node API** (`server/`). Run the Expo app on your phone/computer with `npx expo start`.

### 1. Railway service settings

| Setting | Value |
|---------|--------|
| **Root Directory** | `server` |
| **Start command** | `npm start` (after build) |

`server/railway.toml` is included — build runs `npm install && npm run build`.

### 2. Environment variables (Railway → Variables)

| Variable | Example |
|----------|---------|
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/king-cric` |
| `JWT_SECRET` | long random string |
| `CORS_ORIGIN` | `*` |

Use [MongoDB Atlas](https://www.mongodb.com/atlas) free tier if you don't have MongoDB yet.  
Railway sets `PORT` automatically — do **not** hardcode port `8081` in networking.

### 3. Verify the API

```bash
curl https://YOUR-SERVICE.up.railway.app/health
```

Expected response:

```json
{"ok":true,"service":"king-cric-api","db":"connected"}
```

If you see Expo manifest JSON instead, you deployed the wrong folder — set Root Directory to `server`.

### 4. Point the app at Railway

In project root `.env`:

```bash
EXPO_PUBLIC_API_URL=https://YOUR-SERVICE.up.railway.app
```

Restart Expo:

```bash
npx expo start -c
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Sign in |
| GET | `/auth/me` | Current profile |
| GET | `/tournaments` | List tournaments |
| POST | `/tournaments` | Create tournament |
| GET | `/matches/live` | Live matches |
| POST | `/matches/innings/:id/score-events` | Record a ball |

Socket.io events: `join_innings`, `score_event`, `innings_updated`

## Launch screen

On a fresh launch, the native splash stays visible until the animated KingCric surface and logo are ready. The logo, ring and wordmark animate before the login/home screen is revealed; authentication initialization runs behind the launch screen. Reduced-motion preferences skip the animation. Reload or fully close and reopen the app to replay it.

Native splash configuration changes require a new app binary. Test the complete startup experience in a release build: Expo Go does not reproduce every native splash setting.

## Scoring and validation

Match settings support configurable wide/no-ball penalties, whether they count as balls, free hits, byes, leg byes and local last-batter rules. Rules lock after innings setup. Scorers can correct the latest delivery's runs or undo deliveries backwards. The handbook describes the supported limited-overs rules; DLS, Test formats and some exceptional umpire decisions are not automated.

Run `npm run typecheck`, `npm test`, and `npm run build --prefix server` before releasing. Deploy the updated API alongside the app for rule validation, ownership checks and scoring corrections. Email/password login is supported; password-recovery email delivery still needs a provider implementation.

## License

MIT

## Settings and languages

Profile → Settings includes profile/photo editing, English/Hindi/Gujarati language selection, light/dark appearance, reduced launch animation, push opt-in, scoring defaults, password change, revoking other sessions, account deletion and support reports. Language and appearance are device preferences; profile and scoring defaults are saved through the API. The catalog in `src/i18n/catalog.ts` provides Hindi and Gujarati translations with an English fallback for untranslated messages and user-entered content.

Tournament management lists the signed-in organizer's tournaments (all tournaments for platform admins). It supports assigning existing accounts as scorers, approving teams, registration deadlines, configurable points, recent mutation history, JSON exports and archiving completed/cancelled tournaments. Scorers may set up innings and score/finalize matches; only organizers/admins may change tournament settings or delete matches. The audit view contains the latest 100 records starting with this release. Archived tournaments remain available to organizers and retain scorecards.

Platform admins can suspend/restore non-admin accounts and resolve support reports. Password changes and session revocation invalidate older JWTs; existing sessions without a version remain valid until the first revocation. Account deletion requires the current password and is blocked while the user owns tournaments/teams or is an administrator.

Deploy the updated `server/` API before distributing the app. No production accounts or tournament data are changed by the local validation tests. Push delivery still requires a configured EAS project and a native build; the notification preference controls registration and opt-out, not a scheduled campaign service. Individual device/session inventories and email invitation delivery are not implemented.


## Reusable teams and player invitations

- **My Teams → Reusable teams** creates a team independent of a tournament. Captains add guests or find registered players using the exact `KC-…` player ID shown on Profile. Account lookup exposes name/city/playing details, never email or phone. Email/phone search is intentionally unavailable until those contacts have a verification flow.
- **Tournament → Add existing team** searches reusable teams and sends an in-app invitation to the captain. **Invitations → Review squad** preselects eligible members. Acceptance copies the chosen 2–30 players into a separate tournament squad. Pending player invitations are excluded; the server checks deadlines, capacity, duplicate entries and duplicate account participation.
- Players accept or decline their own team invitations. A captain can link an existing guest record by inviting its owner using their KingCric ID. Acceptance links every snapshot of that roster member without changing delivery IDs or historical names. No names are auto-matched.
- **Team → Reuse this team** lets the captain import a legacy tournament team into a reusable roster. Existing tournament/player IDs and scorecards remain intact. Future roster edits/removals do not propagate to earlier tournament squads.

The API adds `Club`, `ClubMember`, `MemberInvitation`, and `ClubEntry` collections, plus optional source references on existing teams/players. **MongoDB transactions require a replica set or Atlas**; a standalone local MongoDB must be configured as a replica set before this flow is used. Deploy the server and let the new unique indexes initialize before distributing the app. No production migration or writes were run in this task.

`npm test` covers invitation policy and squad snapshots. The standalone `tests/clubs.integration.ts` uses only a disposable replica set at `127.0.0.1:27029`, creates a uniquely named test database, and removes that database afterward. It checks consent, authorization, duplicate acceptance, copied squads, guest linking and preserved delivery IDs. Run it with `node --import ./server/node_modules/tsx/dist/loader.mjs tests/clubs.integration.ts` after starting that isolated replica set. Invitations appear in the app; this feature does not send email or SMS.
