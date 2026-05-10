/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  /** Railway (or other) API root, e.g. https://joldosh-api.up.railway.app */
  readonly VITE_API_BASE_URL: string;
  /** Optional full mint URL if not `{VITE_API_BASE_URL}/auth/mint` */
  readonly VITE_MINT_TELEGRAM_TOKEN_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
