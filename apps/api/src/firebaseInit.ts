import * as admin from "firebase-admin";

export function initFirebase(): void {
  if (admin.apps.length) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON is required (full service account JSON string)"
    );
  }
  const cred = JSON.parse(raw) as admin.ServiceAccount;
  admin.initializeApp({
    credential: admin.credential.cert(cred),
  });
}
