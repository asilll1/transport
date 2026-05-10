import { Bot, InlineKeyboard, webhookCallback } from "grammy";
import { defineSecret, defineString } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const telegramToken = defineSecret("TELEGRAM_BOT_TOKEN");
const miniAppUrl = defineString("MINI_APP_URL", { default: "" });

function preferredLang(code: string | undefined): "en" | "ru" | "ky" {
  if (!code) return "en";
  const c = code.toLowerCase();
  if (c.startsWith("ru")) return "ru";
  if (c.startsWith("ky") || c.startsWith("kk")) return "ky";
  return "en";
}

const STRINGS: Record<
  "en" | "ru" | "ky",
  { welcome: string; help: string; open: string; languagePrompt: string }
> = {
  en: {
    welcome: "Welcome to <b>JolDosh</b> — intercity rides in Kyrgyzstan.",
    help: "Use the button to open the app. In the app you can post or find rides between major cities.",
    open: "Open JolDosh",
    languagePrompt: "Choose your language / Выберите язык / Тилди тандаңыз:",
  },
  ru: {
    welcome: "Добро пожаловать в <b>JolDosh</b> — междугородние поездки в Кыргызстане.",
    help: "Нажмите кнопку, чтобы открыть приложение. Там можно разместить или найти поездку.",
    open: "Открыть JolDosh",
    languagePrompt: "Choose your language / Выберите язык / Тилди тандаңыз:",
  },
  ky: {
    welcome: "<b>JolDosh</b> кош келиңиз — Кыргызстанда шаарларалык жолугушуулар.",
    help: "Колдонмону ачуу үчүн баскычты басыңыз. Ал жерде сиз саякат жарыялай аласыз же таба аласыз.",
    open: "JolDosh ачуу",
    languagePrompt: "Choose your language / Выберите язык / Тилди тандаңыз:",
  },
};

export function createBot(botToken: string, webAppUrl: string): Bot {
  const bot = new Bot(botToken);

  bot.command("start", async (ctx) => {
    const uid = String(ctx.from?.id ?? "");
    const lang = preferredLang(ctx.from?.language_code);
    if (uid) {
      await admin
        .firestore()
        .collection("users")
        .doc(uid)
        .set(
          {
            displayName: [ctx.from?.first_name, ctx.from?.last_name]
              .filter(Boolean)
              .join(" "),
            username: ctx.from?.username ?? null,
            language: lang,
            lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
    }
    const s = STRINGS[lang];
    const url = webAppUrl || "https://example.com";
    const kb = new InlineKeyboard().webApp(s.open, url);
    await ctx.reply(`${s.welcome}\n\n${s.help}`, {
      parse_mode: "HTML",
      reply_markup: kb,
    });
  });

  bot.command("help", async (ctx) => {
    const lang = preferredLang(ctx.from?.language_code);
    const s = STRINGS[lang];
    await ctx.reply(s.help, { parse_mode: "HTML" });
  });

  bot.command("language", async (ctx) => {
    const lang = preferredLang(ctx.from?.language_code);
    const s = STRINGS[lang];
    await ctx.reply(s.languagePrompt, {
      reply_markup: {
        inline_keyboard: [
          [
            { callback_data: "lang:en", text: "English" },
            { callback_data: "lang:ru", text: "Русский" },
            { callback_data: "lang:ky", text: "Кыргызча" },
          ],
        ],
      },
    });
  });

  bot.callbackQuery(/^lang:(en|ru|ky)$/, async (ctx) => {
    const code = ctx.match[1] as "en" | "ru" | "ky";
    const uid = String(ctx.from?.id ?? "");
    if (uid) {
      await admin.firestore().collection("users").doc(uid).set(
        {
          language: code,
          lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
    await ctx.answerCallbackQuery({ text: "OK" });
    const s = STRINGS[code];
    const url = webAppUrl || "https://example.com";
    const kb = new InlineKeyboard().webApp(s.open, url);
    await ctx.editMessageText(`${s.welcome}\n\n${s.help}`, {
      parse_mode: "HTML",
      reply_markup: kb,
    });
  });

  return bot;
}

let cachedBot: Bot | null = null;

export const telegramWebhook = onRequest(
  {
    secrets: [telegramToken],
    region: "europe-west1",
    invoker: "public",
    memory: "256MiB",
  },
  (req, res) => {
    if (!cachedBot) {
      cachedBot = createBot(telegramToken.value(), miniAppUrl.value());
    }
    const handler = webhookCallback(cachedBot, "express");
    return handler(req as never, res as never);
  }
);
