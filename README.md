# JolDosh

Intercity ride-sharing **Telegram Mini App** for Kyrgyzstan. This repo uses **Firebase Spark** (Firestore + Hosting only) and **[Render](https://render.com/)** for the HTTP API, Telegram bot, scheduled expiry, and **LibreTranslate** for server-side text translation—no Firebase Blaze or Google Cloud Translation required for that path.

## Architecture

| Layer | Where |
|-------|--------|
| Mini App (React + Vite) | [Firebase Hosting](https://firebase.google.com/docs/hosting) (Spark) → [`apps/web`](apps/web) |
| Database | [Firestore](https://firebase.google.com/docs/firestore) (Spark) — [`firestore.rules`](firestore.rules), [`firestore.indexes.json`](firestore.indexes.json) |
| HTTP API + Telegram bot | [Render Web Service](https://render.com/docs/web-services) → [`apps/api`](apps/api) |
| Translation | [LibreTranslate](https://libretranslate.com/) (self-hosted on Render or a public instance) |

Firebase **Cloud Functions** are **not** deployed from this repo (see legacy [`functions/`](functions/) if you need reference code only).

---

## 1. Firebase (Spark)

1. Create a project in [Firebase Console](https://console.firebase.google.com/).
2. Enable **Firestore** (production mode) and **Authentication** (get started; custom tokens are minted on Render).
3. Enable **Hosting** and connect the app (first deploy can be from CLI below).
4. Register a **Web app** and copy the config into `apps/web/.env` (see [`apps/web/.env.example`](apps/web/.env.example)).
5. **Service account for Render:** Project settings → Service accounts → **Generate new private key**. Paste the full JSON into Render as `FIREBASE_SERVICE_ACCOUNT_JSON` (see [`apps/api/.env.example`](apps/api/.env.example)).

Deploy rules, indexes, and hosting (no functions):

```bash
cd /path/to/transport
firebase deploy --only firestore:rules,firestore:indexes,hosting
```

Set [`.firebaserc`](.firebaserc) to your Firebase project ID.

---

## 2. Render: JolDosh API (`apps/api`)

### Option A — Blueprint (recommended)

1. Push this repo to GitHub/GitLab.
2. In [Render Dashboard](https://dashboard.render.com/), **New** → **Blueprint**.
3. Connect the repo; Render detects [`render.yaml`](render.yaml).
4. Apply the blueprint. When prompted, set **secret** variables (`sync: false`): `TELEGRAM_BOT_TOKEN`, `MINI_APP_URL`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `CRON_SECRET`, optional `LIBRETRANSLATE_API_KEY` and `CORS_ORIGINS`.
5. After deploy, open **`https://<service-name>.onrender.com/health`** — expect `{"ok":true}`.

### Option B — Manual Web Service

1. **New** → **Web Service** → connect the repo.
2. **Root directory:** `apps/api`
3. **Runtime:** Node
4. **Build command:** `npm install && npm run build`
5. **Start command:** `npm start`
6. **Health check path:** `/health`
7. **Environment:** Node **20** (matches [`apps/api/package.json`](apps/api/package.json) `engines`; you can set env `NODE_VERSION=20` if needed).
8. Add the same variables as in [`apps/api/.env.example`](apps/api/.env.example):

| Variable | Purpose |
|----------|---------|
| `TELEGRAM_BOT_TOKEN` | From [@BotFather](https://t.me/BotFather) |
| `MINI_APP_URL` | Your Firebase Hosting URL, e.g. `https://PROJECT_ID.web.app` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Full JSON string of the Firebase service account |
| `LIBRETRANSLATE_URL` | Base URL of LibreTranslate (no trailing slash), e.g. `https://libretranslate.com` or another Render service |
| `LIBRETRANSLATE_API_KEY` | Optional, if your instance requires it |
| `CRON_SECRET` | Long random string; see cron below |
| `PORT` | Render sets this automatically — do not override |
| `CORS_ORIGINS` | Optional; comma-separated list or omit for permissive CORS in dev |

Render injects **`PORT`**; the app uses `process.env.PORT` (default `8080` locally).

**Free tier:** the service **spins down** after idle time; first request after sleep can take ~30–60s. For production Telegram webhooks, consider a **paid** instance type so the service stays warm.

### Docker (optional)

[`apps/api/Dockerfile`](apps/api/Dockerfile) builds with `npm run build` and runs `node lib/server.js`. On Render, create a **Web Service** with **Docker**, set **Dockerfile path** to `apps/api/Dockerfile` and **Docker build context** to `apps/api`.

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/auth/mint` | Body `{ "initData": "<telegram>" }` → Firebase custom token |
| `POST` | `/webhook/telegram` | Telegram bot webhook |
| `POST` | `/api/rides/:rideId/sync` | Bearer Firebase **ID** token; LibreTranslate + “ride published” Telegram message once |
| `POST` | `/internal/cron` | Header `Authorization: Bearer <CRON_SECRET>`; expiry + “1 hour” reminders |
| `GET` | `/health` | Health check |

---

## 3. Render: LibreTranslate (optional)

Add another **Web Service** (or **Private Service**) using the official **LibreTranslate** Docker image, or use a public API for testing. Set `LIBRETRANSLATE_URL` on the API service to that base URL (no trailing slash).

---

## 4. Scheduled cron (expiry + reminders)

Call **`POST /internal/cron`** about every **5 minutes** with:

```http
Authorization: Bearer YOUR_CRON_SECRET
```

**On Render:** add a **Cron Job** (paid plans) or use an external scheduler (e.g. [cron-job.org](https://cron-job.org)) to `POST` `https://YOUR_SERVICE.onrender.com/internal/cron` with that header. Use the same `CRON_SECRET` as in the API’s environment.

Render **free** web services cannot run Blueprint `type: cron` workers on the free instance type; use an external HTTP cron or upgrade.

---

## 5. Telegram

1. `setWebhook`:
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://YOUR_API_ORIGIN/webhook/telegram"
   ```
2. BotFather: set the Mini App / menu button URL to **`MINI_APP_URL`** (Firebase Hosting).

---

## 6. Web app env

Copy [`apps/web/.env.example`](apps/web/.env.example) → `apps/web/.env`:

- Set **`VITE_API_BASE_URL`** to your Render API origin (e.g. `https://joldosh-api.onrender.com`, no trailing slash).
- Mint URL defaults to `{VITE_API_BASE_URL}/auth/mint`. Override with **`VITE_MINT_TELEGRAM_TOKEN_URL`** only if needed.

Build and deploy hosting:

```bash
cd apps/web && npm install && npm run build
cd ../.. && firebase deploy --only hosting
```

---

## Local development

```bash
# API
cd apps/api && npm install && npm run dev

# Web
cd apps/web && npm install && npm run dev
```

Point `VITE_API_BASE_URL` at `http://127.0.0.1:8080` (or your local API port). The Mini App still needs Telegram **initData** for a real login.

---

## Backlog (SRS §8.1)

- Report posts, phone privacy toggle, route chips — not implemented; see earlier SRS notes.
