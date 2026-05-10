import type { LangField } from "./types";

export function pickLocalized(
  m: LangField | undefined,
  lang: string
): string {
  if (!m) return "";
  const code = lang.split("-")[0].toLowerCase();
  if (code === "ru" && m.ru) return m.ru;
  if ((code === "ky" || code === "kk") && m.ky) return m.ky;
  if (code === "en" && m.en) return m.en;
  return m.original ?? "";
}
