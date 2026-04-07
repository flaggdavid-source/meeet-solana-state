import { useLanguage, LANG_LABELS, LANG_FLAGS } from "@/i18n/LanguageContext";
import type { Lang } from "@/i18n/translations";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Globe } from "lucide-react";

const LANGS: Lang[] = ["en", "ru", "zh", "es", "ar", "hi", "fr"];

const LanguageSwitcher = () => {
  const { lang, setLang } = useLanguage();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors duration-150 text-sm"
          aria-label="Change language"
        >
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline text-xs font-body">{LANG_FLAGS[lang]}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1" align="end">
        {LANGS.map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-body transition-colors ${
              l === lang
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <span>{LANG_FLAGS[l]}</span>
            <span>{LANG_LABELS[l]}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
};

export default LanguageSwitcher;
