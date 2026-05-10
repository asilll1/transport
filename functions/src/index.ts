import * as admin from "firebase-admin";
import { logger } from "firebase-functions";
import { defineSecret, defineString } from "firebase-functions/params";
import { onDocumentCreated, onDocumentWritten } from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { verifyTelegramInitData, parseTelegramUser } from "./telegramAuth";
import {
  applyTranslationsToRide,
  rideNeedsTranslation,
} from "./translateRide";
import { sendTelegramMessage, cityLabel } from "./notifications";

export { telegramWebhook } from "./botApp";

if (!admin.apps.length) {
  admin.initializeApp();
}

const telegramToken = defineSecret("TELEGRAM_BOT_TOKEN");
const miniAppUrl = defineString("MINI_APP_URL", { default: "" });

export const mintTelegramToken = onRequest(
  {
    secrets: [telegramToken],
    cors: true,
    region: "europe-west1",
    invoker: "public",
    memory: "256MiB",
  },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }
    const raw =
      typeof req.body === "object" && req.body && "initData" in req.body
        ? (req.body as { initData?: unknown }).initData
        : undefined;
    if (typeof raw !== "string" || !raw.length) {
      res.status(400).json({ error: "initData required" });
      return;
    }
    const verified = verifyTelegramInitData(raw, telegramToken.value());
    if (!verified) {
      res.status(401).json({ error: "Invalid init data" });
      return;
    }
    const user = parseTelegramUser(verified);
    if (!user) {
      res.status(401).json({ error: "No user in init data" });
      return;
    }
    const token = await admin.auth().createCustomToken(user.id, {
      username: user.username ?? "",
      name: [user.firstName, user.lastName].filter(Boolean).join(" "),
    });
    res.json({
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        languageCode: user.languageCode,
      },
    });
  }
);

export const onRideTranslate = onDocumentWritten(
  {
    document: "rides/{rideId}",
    region: "europe-west1",
    memory: "512MiB",
  },
  async (event) => {
    const after = event.data?.after?.data();
    const before = event.data?.before?.exists
      ? event.data.before.data()
      : undefined;
    if (!after || after.status === "deleted") return;
    if (!rideNeedsTranslation(before, after)) return;
    const ref = event.data!.after!.ref;
    try {
      await applyTranslationsToRide(ref, after);
    } catch (e) {
      logger.error("translate ride failed", { err: String(e) });
    }
  }
);

export const onRideCreatedNotify = onDocumentCreated(
  {
    document: "rides/{rideId}",
    region: "europe-west1",
    secrets: [telegramToken],
    memory: "256MiB",
  },
  async (event) => {
    const data = event.data?.data();
    if (!data || data.status !== "active") return;
    const token = telegramToken.value();
    const url = miniAppUrl.value();
    const from = cityLabel(String(data.fromCity ?? ""));
    const to = cityLabel(String(data.toCity ?? ""));
    const dep = data.departureAt as admin.firestore.Timestamp | undefined;
    const depStr = dep?.toDate
      ? dep.toDate().toISOString()
      : String(data.departureAt ?? "");
    const text = `Your ride post from <b>${from}</b> to <b>${to}</b> on ${depStr} has been published.`;
    try {
      await sendTelegramMessage(token, String(data.authorId), text, {
        webAppUrl: url || undefined,
        buttonText: "Open JolDosh",
      });
    } catch (e) {
      logger.error("onRideCreatedNotify failed", { err: String(e) });
    }
  }
);

export const rideScheduledTasks = onSchedule(
  {
    schedule: "every 5 minutes",
    region: "europe-west1",
    secrets: [telegramToken],
    memory: "512MiB",
  },
  async () => {
    const db = admin.firestore();
    const now = Date.now();
    const expireCutoff = admin.firestore.Timestamp.fromDate(
      new Date(now - 30 * 60 * 1000)
    );
    const token = telegramToken.value();
    const url = miniAppUrl.value();

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
          token,
          String(d.authorId),
          "Your ride post has been marked as expired.",
          { webAppUrl: url || undefined, buttonText: "Open JolDosh" }
        );
      } catch (e) {
        logger.error("expire ride failed", {
          id: doc.id,
          err: String(e),
        });
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
          token,
          String(d.authorId),
          "Your ride departs in 1 hour. Tap to update or delete:",
          { webAppUrl: url || undefined, buttonText: "Open JolDosh" }
        );
      } catch (e) {
        logger.error("expiring soon notify failed", {
          id: doc.id,
          err: String(e),
        });
      }
    }
  }
);
