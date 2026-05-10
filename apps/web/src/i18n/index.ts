import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import ru from "./locales/ru.json";
import ky from "./locales/ky.json";

export const SUPPORTED = ["en", "ru", "ky"] as const;
export type AppLang = (typeof SUPPORTED)[number];

export function normalizeLang(code: string | undefined): AppLang {
  if (!code) return "en";
  const c = code.toLowerCase();
  if (c.startsWith("ru")) return "ru";
  if (c.startsWith("ky") || c.startsWith("kk")) return "ky";
  return "en";
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ru: { translation: ru },
    ky: { translation: ky },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
