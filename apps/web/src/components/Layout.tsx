import { Link, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/AuthContext";
import { persistUserLanguage } from "../lib/persistLanguage";
import type { AppLang } from "../i18n";

const LANGS: AppLang[] = ["en", "ru", "ky"];

export function Layout() {
  const { t, i18n } = useTranslation();
  const { ready, error, firebaseUser, refreshLanguage } = useAuth();
  const loc = useLocation();
  const hideNav =
    loc.pathname.startsWith("/ride/") ||
    loc.pathname.startsWith("/post/") ||
    loc.pathname.startsWith("/edit/");

  async function setLang(code: AppLang) {
    await i18n.changeLanguage(code);
    if (firebaseUser) {
      await persistUserLanguage(firebaseUser.uid, code);
      await refreshLanguage();
    }
  }

  if (!ready) {
    return (
      <div className="screen center muted">{t("loading")}</div>
    );
  }
  if (error || !firebaseUser) {
    return (
      <div className="screen center">
        <p className="error">{error ?? t("error.auth")}</p>
        <p className="muted small">
          Open this app from the Telegram bot inside Telegram.
        </p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {!hideNav && (
        <header className="top-bar">
          <div className="top-bar__lang" role="group" aria-label={t("nav.language")}>
            {LANGS.map((code) => (
              <button
                key={code}
                type="button"
                className={`lang-seg touch-min ${i18n.language.startsWith(code) ? "active" : ""}`}
                onClick={() => void setLang(code)}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
          <span className="title">{t("app.name")}</span>
          <Link to="/my-posts" className="top-bar__link touch-min">
            {t("nav.myPosts")}
          </Link>
        </header>
      )}
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
