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

- **Expo SDK 54** + TypeScript + Expo Router (React Native app)
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

## License

MIT
