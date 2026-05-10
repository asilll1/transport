# JolDosh

Intercity ride-sharing **Telegram Mini App** for Kyrgyzstan. This repo uses **Firebase Spark** (Firestore + Hosting only) and **Railway** for the API, Telegram bot, scheduled expiry, and **LibreTranslate** for server-side text translation—no Firebase Blaze or Google Cloud Translation required for that path.

## Architecture

| Layer | Where |
|-------|--------|
| Mini App (React + Vite) | [Firebase Hosting](https://firebase.google.com/docs/hosting) (Spark) → [`apps/web`](apps/web) |
| Database | [Firestore](https://firebase.google.com/docs/firestore) (Spark) — [`firestore.rules`](firestore.rules), [`firestore.indexes.json`](firestore.indexes.json) |
| HTTP API + Telegram bot + cron | [Railway](https://railway.app/) → [`apps/api`](apps/api) |
| Translation | [LibreTranslate](https://libretranslate.com/) (self-hosted on Railway or a public instance) |

Firebase **Cloud Functions** are **not** deployed from this repo (see legacy [`functions/`](functions/) if you need reference code only).

---

## 1. Firebase (Spark)

1. Create a project in [Firebase Console](https://console.firebase.google.com/).
2. Enable **Firestore** (production mode) and **Authentication** (get started; custom tokens are minted on Railway).
3. Enable **Hosting** and connect the app (first deploy can be from CLI below).
4. Register a **Web app** and copy the config into `apps/web/.env` (see [`apps/web/.env.example`](apps/web/.env.example)).
5. **Service account for Railway:** Project settings → Service accounts → **Generate new private key**. You will paste the full JSON into Railway as `FIREBASE_SERVICE_ACCOUNT_JSON` (see [`apps/api/.env.example`](apps/api/.env.example)).

Deploy rules, indexes, and hosting (no functions):

```bash
cd /path/to/transport
firebase deploy --only firestore:rules,firestore:indexes,hosting
```

Set [`.firebaserc`](.firebaserc) to your Firebase project ID.

---

## 2. Railway: JolDosh API

1. Create a **new project** on Railway and deploy from this repo (or connect GitHub). Set the **root directory** to `apps/api` (or use a Dockerfile path).
2. **Start command** (if not using Docker): `npm install && npm run build && npm start`
3. **Environment variables** (see [`apps/api/.env.example`](apps/api/.env.example)):

| Variable | Purpose |
|----------|---------|
| `TELEGRAM_BOT_TOKEN` | From [@BotFather](https://t.me/BotFather) |
| `MINI_APP_URL` | Your Firebase Hosting URL, e.g. `https://PROJECT_ID.web.app` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Full JSON string of the Firebase service account |
| `LIBRETRANSLATE_URL` | Base URL of LibreTranslate (no trailing slash), e.g. `https://libretranslate.com` or your second Railway service |
| `LIBRETRANSLATE_API_KEY` | Optional, if your instance requires it |
| `CRON_SECRET` | Long random string; see cron below |
| `PORT` | Railway sets this automatically |
| `CORS_ORIGINS` | Optional; comma-separated list or omit for permissive CORS in dev |

4. After deploy, note the public HTTPS origin of the API (e.g. `https://joldosh-api.up.railway.app`).

### Docker

[`apps/api/Dockerfile`](apps/api/Dockerfile) builds with `npm run build` and runs `node lib/server.js`.

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/auth/mint` | Body `{ "initData": "<telegram>" }` → Firebase custom token |
| `POST` | `/webhook/telegram` | Telegram bot webhook |
| `POST` | `/api/rides/:rideId/sync` | Bearer Firebase **ID** token; LibreTranslate + “ride published” Telegram message once |
| `POST` | `/internal/cron` | Header `Authorization: Bearer <CRON_SECRET>`; expiry + “1 hour” reminders |
| `GET` | `/health` | Health check |

---

## 3. Railway: LibreTranslate (recommended)

Add a **second** Railway service using the official **LibreTranslate** Docker image, or use a public API for testing. Point `LIBRETRANSLATE_URL` on the API service to that base URL.

---

## 4. Railway Cron (every ~5 minutes)

In Railway, add a **Cron** job that runs:

```http
POST https://YOUR_API_ORIGIN/internal/cron
Authorization: Bearer YOUR_CRON_SECRET
```

Use the same `CRON_SECRET` as in the API env.

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

- Set **`VITE_API_BASE_URL`** to your Railway API origin (no trailing slash).
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
