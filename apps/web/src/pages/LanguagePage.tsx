import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/AuthContext";
import { persistUserLanguage } from "../lib/persistLanguage";
import type { AppLang } from "../i18n";

const langs: AppLang[] = ["en", "ru", "ky"];

export function LanguagePage() {
  const { t, i18n } = useTranslation();
  const nav = useNavigate();
  const { firebaseUser, refreshLanguage } = useAuth();

  async function pick(code: AppLang) {
    await i18n.changeLanguage(code);
    if (firebaseUser) {
      await persistUserLanguage(firebaseUser.uid, code);
      await refreshLanguage();
    }
    nav(-1);
  }

  return (
    <div className="padded">
      <h1>{t("nav.language")}</h1>
      <div className="lang-grid">
        {langs.map((l) => (
          <button
            key={l}
            type="button"
            className="btn primary touch-min"
            onClick={() => void pick(l)}
          >
            {t(`lang.${l}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
