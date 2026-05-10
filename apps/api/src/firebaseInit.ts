import * as admin from "firebase-admin";

function loadServiceAccountJson(): string {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_B64?.trim();
  if (b64) {
    return Buffer.from(b64, "base64").toString("utf8");
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) {
    throw new Error(
      "Set FIREBASE_SERVICE_ACCOUNT_JSON (full service account JSON) or FIREBASE_SERVICE_ACCOUNT_JSON_B64 (base64 of that file). See README."
    );
  }
  return raw;
}

export function initFirebase(): void {
  if (admin.apps.length) return;
  const raw = loadServiceAccountJson();
  let cred: admin.ServiceAccount;
  try {
    cred = JSON.parse(raw) as admin.ServiceAccount;
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON. Use the downloaded *.json from Firebase (keys like \"type\": \"service_account\"), not a table or spreadsheet. On Linux/Mac: base64 -w0 serviceAccount.json and set FIREBASE_SERVICE_ACCOUNT_JSON_B64 in Render."
    );
  }
  admin.initializeApp({
    credential: admin.credential.cert(cred),
  });
}
