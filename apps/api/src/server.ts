import cors from "cors";
import express from "express";
import * as admin from "firebase-admin";
import { webhookCallback } from "grammy";
import { createBot } from "./bot";
import { cityLabel, sendTelegramMessage } from "./notifications";
import { initFirebase } from "./firebaseInit";
import { parseTelegramUser, verifyTelegramInitData } from "./telegramAuth";
import { applyTranslationsToRide } from "./translateRide";
import { runScheduledRideTasks } from "./cronTasks";

initFirebase();

const app = express();
const PORT = Number(process.env.PORT) || 8080;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const MINI_APP_URL = process.env.MINI_APP_URL ?? "";
const LIBRETRANSLATE_URL = process.env.LIBRETRANSLATE_URL ?? "";
const LIBRETRANSLATE_API_KEY = process.env.LIBRETRANSLATE_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET ?? "";

const corsOrigins = (process.env.CORS_ORIGINS ?? "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin:
      corsOrigins.length === 1 && corsOrigins[0] === "*"
        ? true
        : corsOrigins,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/auth/mint", async (req, res) => {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      res.status(500).json({ error: "Server missing TELEGRAM_BOT_TOKEN" });
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
    const verified = verifyTelegramInitData(raw, TELEGRAM_BOT_TOKEN);
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
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Mint failed" });
  }
});

if (TELEGRAM_BOT_TOKEN) {
  const bot = createBot(TELEGRAM_BOT_TOKEN, MINI_APP_URL);
  app.post("/webhook/telegram", webhookCallback(bot, "express"));
} else {
  app.post("/webhook/telegram", (_req, res) =>
    res.status(503).send("Bot not configured")
  );
}

app.post("/internal/cron", async (req, res) => {
  if (!CRON_SECRET) {
    res.status(503).json({ error: "CRON_SECRET not set" });
    return;
  }
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${CRON_SECRET}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    await runScheduledRideTasks(TELEGRAM_BOT_TOKEN, MINI_APP_URL);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e) });
  }
});

app.post("/api/rides/:rideId/sync", async (req, res) => {
  try {
    if (!LIBRETRANSLATE_URL) {
      res.status(503).json({ error: "LIBRETRANSLATE_URL not configured" });
      return;
    }
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Authorization required" });
      return;
    }
    const idToken = auth.slice(7);
    const decoded = await admin.auth().verifyIdToken(idToken);
    const rideId = req.params.rideId;
    const ref = admin.firestore().collection("rides").doc(rideId);
    const snap = await ref.get();
    if (!snap.exists) {
      res.status(404).json({ error: "Ride not found" });
      return;
    }
    const data = snap.data()!;
    if (data.authorId !== decoded.uid) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (data.status === "deleted") {
      res.status(400).json({ error: "Invalid ride" });
      return;
    }

    await applyTranslationsToRide(
      ref,
      data,
      LIBRETRANSLATE_URL,
      LIBRETRANSLATE_API_KEY
    );

    const after = await ref.get();
    const d = after.data()!;
    if (d.status === "active" && !d.notifiedRidePublished) {
      const from = cityLabel(String(d.fromCity ?? ""));
      const to = cityLabel(String(d.toCity ?? ""));
      const dep = d.departureAt as admin.firestore.Timestamp | undefined;
      const depStr = dep?.toDate
        ? dep.toDate().toISOString()
        : String(d.departureAt ?? "");
      const text = `Your ride post from <b>${from}</b> to <b>${to}</b> on ${depStr} has been published.`;
      try {
        await sendTelegramMessage(
          TELEGRAM_BOT_TOKEN,
          String(d.authorId),
          text,
          {
            webAppUrl: MINI_APP_URL || undefined,
            buttonText: "Open JolDosh",
          }
        );
        await ref.update({ notifiedRidePublished: true });
      } catch (e) {
        console.error("ride published notify failed", String(e));
      }
    }

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`JolDosh API listening on ${PORT}`);
});
