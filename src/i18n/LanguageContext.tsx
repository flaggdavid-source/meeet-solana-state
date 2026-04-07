import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { translations, type Lang, LANG_LABELS, LANG_FLAGS } from "./translations";

const SUPPORTED_LANGS: Lang[] = ["en", "ru", "zh", "es", "ar", "hi", "fr"];

function detectBrowserLang(): Lang | null {
  const browserLangs = navigator.languages || [navigator.language];
  for (const bl of browserLangs) {
    const code = bl.split("-")[0].toLowerCase();
    if (SUPPORTED_LANGS.includes(code as Lang)) return code as Lang;
  }
  return null;
}

type LanguageContextType = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (path: string) => any;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    // Priority: localStorage > browser language > English
    const saved = localStorage.getItem("meeet-lang");
    if (saved && SUPPORTED_LANGS.includes(saved as Lang)) return saved as Lang;
    const detected = detectBrowserLang();
    return detected || "en";
  });

  useEffect(() => {
    localStorage.setItem("meeet-lang", lang);
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem("meeet-lang", newLang);
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = newLang;
  }, []);

  const t = useCallback((path: string): any => {
    const keys = path.split(".");
    let value: any = translations[lang];
    for (const key of keys) {
      if (value == null) break;
      value = value[key];
    }
    if (value != null) return value;
    // Fallback to English
    let fallback: any = translations.en;
    for (const key of keys) {
      if (fallback == null) return path;
      fallback = fallback[key];
    }
    return fallback ?? path;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

const defaultContext: LanguageContextType = {
  lang: "en",
  setLang: () => {},
  t: (path: string) => path,
};

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  return ctx ?? defaultContext;
}

export { LANG_LABELS, LANG_FLAGS };
export type { Lang };
