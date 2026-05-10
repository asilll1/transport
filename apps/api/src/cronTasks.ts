import * as admin from "firebase-admin";
import { sendTelegramMessage } from "./notifications";

export async function runScheduledRideTasks(
  botToken: string,
  miniAppUrl: string
): Promise<void> {
  const db = admin.firestore();
  const now = Date.now();
  const expireCutoff = admin.firestore.Timestamp.fromDate(
    new Date(now - 30 * 60 * 1000)
  );
  const url = miniAppUrl || "";

  const expiredSnap = await db
    .collection("rides")
    .where("status", "==", "active")
    .where("departureAt", "<", expireCutoff)
    .limit(300)
    .get();

  for (const doc of expiredSnap.docs) {
    try {
      await doc.ref.update({ status: "expired" });
      const d = doc.data();
      await sendTelegramMessage(
        botToken,
        String(d.authorId),
        "Your ride post has been marked as expired.",
        { webAppUrl: url || undefined, buttonText: "Open JolDosh" }
      );
    } catch (e) {
      console.error("expire ride failed", doc.id, String(e));
    }
  }

  const lower = admin.firestore.Timestamp.fromDate(new Date(now));
  const upperSoon = admin.firestore.Timestamp.fromDate(
    new Date(now + 65 * 60 * 1000)
  );

  const soonSnap = await db
    .collection("rides")
    .where("status", "==", "active")
    .where("departureAt", ">", lower)
    .where("departureAt", "<=", upperSoon)
    .limit(300)
    .get();

  const minLeadMs = 50 * 60 * 1000;
  const maxLeadMs = 65 * 60 * 1000;

  for (const doc of soonSnap.docs) {
    const d = doc.data();
    if (d.notifiedExpiringSoon === true) continue;
    const depTs = d.departureAt as admin.firestore.Timestamp | undefined;
    const depMs = depTs?.toMillis?.() ?? 0;
    const leadMs = depMs - now;
    if (leadMs < minLeadMs || leadMs > maxLeadMs) continue;
    try {
      await doc.ref.update({ notifiedExpiringSoon: true });
      await sendTelegramMessage(
        botToken,
        String(d.authorId),
        "Your ride departs in 1 hour. Tap to update or delete:",
        { webAppUrl: url || undefined, buttonText: "Open JolDosh" }
      );
    } catch (e) {
      console.error("expiring soon notify failed", doc.id, String(e));
    }
  }
}
