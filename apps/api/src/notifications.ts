const TELEGRAM_API = "https://api.telegram.org";

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
  options?: { webAppUrl?: string; buttonText?: string }
): Promise<void> {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };
  if (options?.webAppUrl && options?.buttonText) {
    body.reply_markup = {
      inline_keyboard: [
        [{ text: options.buttonText, web_app: { url: options.webAppUrl } }],
      ],
    };
  }
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Telegram ${res.status}: ${t}`);
      }
      return;
    } catch (e) {
      lastErr = e;
      console.warn("sendTelegramMessage retry", attempt, String(e));
      await sleep(400 * Math.pow(2, attempt));
    }
  }
  throw lastErr;
}

export function cityLabel(key: string): string {
  const map: Record<string, string> = {
    bishkek: "Bishkek",
    osh: "Osh",
    jalalabad: "Jalal-Abad",
    karakol: "Karakol",
    tokmok: "Tokmok",
    kant: "Kant",
    naryn: "Naryn",
    talas: "Talas",
    batken: "Batken",
    balykchy: "Balykchy",
  };
  return map[key] ?? key;
}
