import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import WebApp from "@twa-dev/sdk";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { onAuthStateChanged, signInWithCustomToken, type User } from "firebase/auth";
import { getDb, getFirebaseAuth, mintUrl } from "../lib/firebase";
import i18n, { normalizeLang, type AppLang } from "../i18n";

/** Telegram sometimes fills initData shortly after WebApp.ready() (e.g. Desktop). */
async function waitForInitData(maxMs = 2500): Promise<string> {
  const read = () =>
    typeof WebApp.initData === "string" ? WebApp.initData.trim() : "";
  const deadline = Date.now() + maxMs;
  let v = read();
  while (!v && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 100));
    v = read();
  }
  return v;
}

export type TelegramProfile = {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
};

type AuthState = {
  firebaseUser: User | null;
  telegram: TelegramProfile | null;
  ready: boolean;
  error: string | null;
};

const Ctx = createContext<
  AuthState & { refreshLanguage: () => Promise<void> }
>({
  firebaseUser: null,
  telegram: null,
  ready: false,
  error: null,
  refreshLanguage: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [telegram, setTelegram] = useState<TelegramProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshLanguage = useCallback(async () => {
    const u = getFirebaseAuth().currentUser;
    if (!u) return;
    const snap = await getDoc(doc(getDb(), "users", u.uid));
    const lang = snap.get("language") as string | undefined;
    if (lang && (lang === "en" || lang === "ru" || lang === "ky")) {
      await i18n.changeLanguage(lang);
    }
  }, []);

  useEffect(() => {
    if (typeof WebApp.ready === "function") {
      WebApp.ready();
    }
    if (typeof WebApp.expand === "function") {
      WebApp.expand();
    }
    const p = WebApp.themeParams;
    if (p && typeof p === "object") {
      const root = document.documentElement;
      if (p.bg_color)
        root.style.setProperty("--tg-theme-bg-color", `#${p.bg_color}`);
      if (p.text_color)
        root.style.setProperty("--tg-theme-text-color", `#${p.text_color}`);
      if (p.hint_color)
        root.style.setProperty("--tg-theme-hint-color", `#${p.hint_color}`);
      if (p.link_color)
        root.style.setProperty("--tg-theme-link-color", `#${p.link_color}`);
      if (p.button_color)
        root.style.setProperty("--tg-theme-button-color", `#${p.button_color}`);
      if (p.button_text_color)
        root.style.setProperty(
          "--tg-theme-button-text-color",
          `#${p.button_text_color}`
        );
      if (p.secondary_bg_color)
        root.style.setProperty(
          "--tg-theme-secondary-bg-color",
          `#${p.secondary_bg_color}`
        );
    }
    let unsub: (() => void) | undefined;
    try {
      unsub = onAuthStateChanged(getFirebaseAuth(), setFirebaseUser);
    } catch (e) {
      console.warn("Firebase client not configured (check apps/web/.env):", e);
    }
    return () => unsub?.();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      try {
        if (typeof WebApp.ready === "function") {
          WebApp.ready();
        }
        if (typeof WebApp.expand === "function") {
          WebApp.expand();
        }
        const initData = await waitForInitData();
        if (!initData) {
          if (import.meta.env.DEV) {
            console.warn("No Telegram initData — open inside Telegram Mini App");
          }
          if (!cancelled) {
            setError(
              "Telegram did not send login data (initData). Try: update Telegram Desktop, open the Mini App from the bot on your phone, and in BotFather use the Hosting URL without a trailing slash."
            );
          }
          setReady(true);
          return;
        }
        let mint: string;
        try {
          mint = mintUrl();
        } catch (e) {
          throw new Error(
            e instanceof Error
              ? e.message
              : "Set VITE_API_BASE_URL (and Firebase web keys) in apps/web/.env"
          );
        }
        const res = await fetch(mint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData }),
        });
        if (!res.ok) {
          const hint =
            res.status === 401
              ? " Check TELEGRAM_BOT_TOKEN on Render matches this bot (BotFather token for the same bot that opens the Mini App)."
              : "";
          throw new Error(`Mint failed: ${res.status}.${hint}`);
        }
        const data = (await res.json()) as {
          token: string;
          user: TelegramProfile;
        };
        if (cancelled) return;
        setTelegram(data.user);
        const fa = getFirebaseAuth();
        await signInWithCustomToken(fa, data.token);
        const u = fa.currentUser;
        if (!u) throw new Error("No user after sign-in");

        const userRef = doc(getDb(), "users", u.uid);
        const existing = await getDoc(userRef);
        const fromTg = normalizeLang(data.user.languageCode) as AppLang;
        const storedLang =
          (existing.get("language") as AppLang | undefined) ?? fromTg;
        await setDoc(
          userRef,
          {
            displayName: [data.user.firstName, data.user.lastName]
              .filter(Boolean)
              .join(" "),
            username: data.user.username ?? null,
            language: storedLang,
            lastSeenAt: serverTimestamp(),
            ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
          },
          { merge: true }
        );
        await i18n.changeLanguage(storedLang);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "auth error");
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      firebaseUser,
      telegram,
      ready,
      error,
      refreshLanguage,
    }),
    [firebaseUser, telegram, ready, error, refreshLanguage]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
