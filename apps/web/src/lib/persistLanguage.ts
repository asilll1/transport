import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDb } from "./firebase";
import type { AppLang } from "../i18n";

export async function persistUserLanguage(
  uid: string,
  code: AppLang
): Promise<void> {
  await setDoc(
    doc(getDb(), "users", uid),
    { language: code, lastSeenAt: serverTimestamp() },
    { merge: true }
  );
}
