import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useSettings } from "../settings/SettingsContext";
import { effectiveNotation } from "../settings/settings";
import { makeT, resolveLanguage, resolveLocale, type LangCode, type Translate } from "./index";

export interface I18n {
  /** The resolved app language. */
  lang: LangCode;
  /** Locale for dates and month names (keeps the browser's region when it is the same language). */
  locale: string;
  t: Translate;
  /** Predecessor notation in effect (explicit setting, or following the app language). */
  notation: "de" | "en";
}

/** Outside a provider (isolated component tests) everything is English. */
const ENGLISH: I18n = { lang: "en", locale: "en", t: makeT("en"), notation: "en" };
const I18nContext = createContext<I18n>(ENGLISH);

const browserLanguages = (): readonly string[] =>
  typeof navigator === "undefined" ? [] : navigator.languages?.length ? navigator.languages : [navigator.language];

/**
 * Resolves the app language from the settings (and the browser's languages for
 * "auto"), provides t() and keeps <html lang> in sync. Must sit inside
 * SettingsProvider. `browser` overrides navigator.languages (tests).
 */
export function I18nProvider({ children, browser }: { children: ReactNode; browser?: readonly string[] }) {
  const { settings } = useSettings();
  const langs = browser ?? browserLanguages();
  const key = langs.join(",");
  const value = useMemo<I18n>(() => {
    const list = key ? key.split(",") : [];
    const lang = resolveLanguage(settings.language, list);
    return { lang, locale: resolveLocale(lang, list), t: makeT(lang), notation: effectiveNotation(settings.notation, lang) };
  }, [settings.language, settings.notation, key]);
  useEffect(() => { document.documentElement.lang = value.lang; }, [value.lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  return useContext(I18nContext);
}
