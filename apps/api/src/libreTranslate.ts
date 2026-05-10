/**
 * LibreTranslate HTTP API (self-hosted or public).
 * @see https://libretranslate.com/docs
 */

type Lang = "en" | "ru" | "ky";

const LANGS: Lang[] = ["en", "ru", "ky"];

/** Map app codes to LibreTranslate target codes (most servers use ISO 639-1). */
const LT_TARGET: Record<Lang, string> = {
  en: "en",
  ru: "ru",
  ky: "ky",
};

export async function translateText(
  baseUrl: string,
  text: string,
  target: Lang,
  apiKey?: string
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const url = `${baseUrl.replace(/\/$/, "")}/translate`;
  const body: Record<string, string> = {
    q: trimmed,
    source: "auto",
    target: LT_TARGET[target],
    format: "text",
  };
  if (apiKey) body.api_key = apiKey;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LibreTranslate ${res.status}: ${errText}`);
  }
  const data = (await res.json()) as { translatedText?: string };
  return data.translatedText ?? trimmed;
}

export async function toAllLanguages(
  baseUrl: string,
  text: string,
  apiKey?: string
): Promise<Record<Lang, string>> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { en: "", ru: "", ky: "" };
  }
  const out: Record<Lang, string> = { en: "", ru: "", ky: "" };
  for (const lang of LANGS) {
    try {
      out[lang] = await translateText(baseUrl, trimmed, lang, apiKey);
    } catch (e) {
      console.warn("LibreTranslate failed", lang, String(e));
      out[lang] = trimmed;
    }
  }
  return out;
}
