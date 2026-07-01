# Deploy KingCric API on Railway

Your `curl /health` returns Expo JSON because Railway is running the **mobile app** (`expo start`), not the **API** (`server/`).

## Fix (Railway dashboard)

### Step 1 — Root directory
1. Open [Railway](https://railway.app) → project **insightful-clarity** → service **king-cric**
2. Go to **Settings**
3. Find **Root Directory** (or **Source** → **Root Directory**)
4. Set it to: **`server`**
5. Click **Save**

### Step 2 — Remove Expo port
1. Still in **Settings** → **Networking**
2. If **Target port** is `8081`, **delete it** or change to use Railway's default
3. Railway will inject `PORT` automatically — the API listens on that

### Step 3 — Start command
1. **Settings** → **Deploy** → **Custom Start Command**
2. **Clear it** (leave empty) so Railway uses the Dockerfile / `npm start` from `server/`
3. Do **not** use `npx expo start` or `npm start` from the repo root

### Step 4 — Environment variables
Go to **Variables** and add:

```
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/king-cric
JWT_SECRET=any-long-random-string-at-least-32-chars
CORS_ORIGIN=*
```

Get `MONGODB_URI` from [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier).

### Step 5 — Redeploy
1. **Deployments** tab → **Redeploy** (or push to GitHub)
2. Wait until status is **Successful**
3. Check logs — you should see: `KingCric API running` and `MongoDB connected`

### Step 6 — Verify API
```bash
curl https://king-cric-production.up.railway.app/health
```

**Correct response:**
```json
{"ok":true,"service":"king-cric-api","db":"connected"}
```

**Wrong (still broken):** JSON with `"exposdk"` or `"launchAsset"` — Root Directory is still not `server`.

### Step 7 — App on your phone
In project root `.env`:
```
EXPO_PUBLIC_API_URL=https://king-cric-production.up.railway.app
```

Restart Expo:
```bash
npx expo start -c
```

---

## What runs where

| Component | Where |
|-----------|--------|
| API (`server/`) | Railway |
| Mobile app (Expo) | Your Mac — `npx expo start` |

Never deploy Expo to Railway for normal phone testing.

## Optional: second Railway service

If you want Expo hosted separately later, create a **new** Railway service for the API with root `server`, and keep or remove the Expo service. The app only needs the API URL.
