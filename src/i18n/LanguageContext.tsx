import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { translations, type Lang, LANG_LABELS, LANG_FLAGS } from "./translations";

type LanguageContextType = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (path: string) => any;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

function detectBrowserLanguage(): Lang {
  const browserLang = navigator.language?.split("-")[0]?.toLowerCase();
  const supported: Lang[] = ["en", "ru", "zh", "es", "ar"];
  if (supported.includes(browserLang as Lang)) return browserLang as Lang;
  // Check navigator.languages array
  for (const l of navigator.languages || []) {
    const code = l.split("-")[0].toLowerCase();
    if (supported.includes(code as Lang)) return code as Lang;
  }
  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem("meeet-lang") as Lang | null;
    return saved && translations[saved] ? saved : detectBrowserLanguage();
  });

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem("meeet-lang", newLang);
    // Set dir for Arabic RTL
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
  }, []);

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const t = useCallback((path: string): any => {
    const keys = path.split(".");
    let value: any = translations[lang];
    for (const key of keys) {
      if (value == null) return path;
      value = value[key];
    }
    if (value == null) {
      // Fallback to English
      let fallback: any = translations.en;
      for (const key of keys) {
        if (fallback == null) return path;
        fallback = fallback[key];
      }
      return fallback ?? path;
    }
    return value;
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
