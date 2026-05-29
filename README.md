# KingCric — Local Cricket Tournament App

A modern React Native (Expo) app for local cricket tournaments with live ball-by-ball scoring, tournament management, and team registration — **100% free**, powered by **Supabase**.

![Dark IPL-inspired UI](https://img.shields.io/badge/UI-Dark%20%7C%20Glassmorphism-FF6B00)
![Stack](https://img.shields.io/badge/Stack-Expo%20%7C%20Supabase%20%7C%20NativeWind-7B2CBF)

## Features

| Feature | Description |
|---------|-------------|
| **Email Auth** | Sign in / sign up with email & password via Supabase Auth |
| **Live Scores** | Real-time ball-by-ball updates via Supabase Realtime |
| **Scoring Engine** | Overs, strike rotation, extras, wickets |
| **Tournaments** | Create/manage leagues, points table, NRR |
| **Teams & Players** | Registration, squad, season stats |
| **Free for everyone** | No plans or payments — all features included |
| **Push Notifications** | Expo Notifications for live score alerts |
| **Admin Panel** | Users, tournaments, payments, approvals |

## Tech Stack

- **Expo SDK 56** + TypeScript + Expo Router
- **Supabase** — PostgreSQL, Auth (Phone OTP), Realtime, Edge Functions, RLS
- **NativeWind v4** — Tailwind CSS styling
- **Zustand** — Auth & live scoring state
- **TanStack React Query** — Server data caching
- **Reanimated** — Smooth IPL-style animations

## Project Structure

```
app/                    # Expo Router screens
  (auth)/login.tsx      # Mobile OTP login
  (tabs)/               # Home, Live, Tournaments, Profile
  match/[id].tsx        # Live score detail
  tournament/[id].tsx   # Points table & details
  team/[id].tsx         # Squad & player stats
  tournament/create.tsx # Create tournament (free)
  score/[matchId].tsx   # Ball-by-ball scorer
  admin/                # Admin panel
src/
  lib/scoring.ts        # Cricket scoring logic
  stores/               # Zustand stores
  hooks/                # React Query hooks
  components/           # UI & cricket components
supabase/
  migrations/           # Full PostgreSQL schema + RLS
```

## Expo Go compatibility

This project uses **Expo SDK 54**, which matches the Expo Go app on the [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) and App Store.

> SDK 56 is not yet published to app stores. If you need SDK 56, install Expo Go for Android via [expo.dev/go](https://expo.dev/go) or use a [development build](https://docs.expo.dev/develop/development-builds/introduction/).

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Add your Supabase URL and anon key.

### 3. Run database migrations

```bash
npx supabase init
npx supabase db push
```

Or run SQL files manually in the Supabase SQL editor:
- `supabase/migrations/20260528000001_initial_schema.sql`
- `supabase/migrations/20260528000002_rls_policies.sql`

### 4. Enable Phone Auth in Supabase

1. Dashboard → Authentication → Providers → Phone
2. Configure SMS provider (Twilio/MessageBird)
3. Enable phone confirmations

### 5. Enable Realtime

Dashboard → Database → Replication → Enable for:
- `score_events`
- `innings`
- `matches`

### 6. Run free-access migration (if DB already exists)

In SQL Editor, run `supabase/migrations/20260528000004_free_access.sql` so any logged-in user can create tournaments.

### 7. Start the app

```bash
npx expo start
```

**Demo mode:** Without `.env`, the app runs with mock data so you can preview the UI immediately.

## Database Schema

Core tables: `profiles`, `tournaments`, `teams`, `players`, `matches`, `innings`, `score_events`, `points_table`, `player_match_stats`, `subscription_plans`, `subscriptions`, `payments`.

- Foreign keys & indexes on all relations
- RLS policies for public read / organizer write
- Trigger `sync_innings_from_event` updates totals on each ball
- Realtime publication on scoring tables

## Scoring System

The scoring engine (`src/lib/scoring.ts`) handles:

- Legal vs illegal deliveries (wide, no-ball)
- Over calculation (`14.3` format)
- Strike rotation on odd runs & end of over
- Wicket recording with dismissal types
- Run rate & required run rate

Ball events insert into `score_events` → Supabase Realtime broadcasts to all viewers.

## License

MIT
