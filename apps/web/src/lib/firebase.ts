import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  const cfg = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
  if (!cfg.apiKey || !cfg.projectId) {
    throw new Error("Missing VITE_FIREBASE_* env vars");
  }
  app = initializeApp(cfg);
  return app;
}

export function getDb(): Firestore {
  if (db) return db;
  db = getFirestore(getFirebaseApp());
  return db;
}

export function getFirebaseAuth(): Auth {
  if (auth) return auth;
  auth = getAuth(getFirebaseApp());
  return auth;
}

/** Base URL of JolDosh API (e.g. Render), no trailing slash. */
export function apiBaseUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!base) {
    throw new Error(
      "Set VITE_API_BASE_URL (e.g. https://your-app.onrender.com)"
    );
  }
  return base.replace(/\/$/, "");
}

/**
 * Telegram initData mint endpoint. Default: `{VITE_API_BASE_URL}/auth/mint`.
 * Override with full URL only if needed (e.g. temporary Firebase Function).
 */
export function mintUrl(): string {
  const override = import.meta.env.VITE_MINT_TELEGRAM_TOKEN_URL?.trim();
  if (override && /^https?:\/\//i.test(override)) {
    return override;
  }
  return `${apiBaseUrl()}/auth/mint`;
}
