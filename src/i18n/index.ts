// Languages, browser-language resolution and the message lookup t().
// Pure: no React, no globals — callers pass navigator.languages in.
//
// Adding a language: copy en.ts to xx.ts, translate (type it as Partial<Messages>
// while incomplete — missing texts fall back to English), and add one entry to
// LANGUAGES below.
import { de } from "./de";
import { en } from "./en";

/** The English catalog with literal string types widened, so other languages can use any text. */
export type Messages = { [K in keyof typeof en]: (typeof en)[K] extends string ? string : (typeof en)[K] };
export type MessageKey = keyof Messages;
/** Arguments a message takes: none for plain strings, one parameter for functions. */
export type MessageArgs<K extends MessageKey> = Messages[K] extends (arg: infer A) => string ? [A] : [];

export interface Language {
  code: string;
  /** The language's own name, as shown in the language menu. */
  name: string;
  messages: Partial<Messages>;
}

export const LANGUAGES = [
  { code: "en", name: "English", messages: en },
  { code: "de", name: "Deutsch", messages: de },
] as const satisfies readonly Language[];

export type LangCode = (typeof LANGUAGES)[number]["code"];
export const LANG_CODES: readonly LangCode[] = LANGUAGES.map(l => l.code);
export const FALLBACK_LANG: LangCode = "en";

const primary = (tag: string) => tag.toLowerCase().split(/[-_]/)[0] ?? "";
const isLang = (c: string): c is LangCode => (LANG_CODES as readonly string[]).includes(c);

/**
 * The app language: an explicit choice, or (for "auto") the first of the
 * browser's preferred languages we support, by primary subtag (de-AT → de);
 * English when none is supported.
 */
export function resolveLanguage(pref: "auto" | LangCode, browser: readonly string[]): LangCode {
  if (pref !== "auto") return pref;
  for (const tag of browser) {
    const p = primary(tag);
    if (isLang(p)) return p;
  }
  return FALLBACK_LANG;
}

/**
 * Locale for formatting dates in `lang`: the browser's own tag when it is the
 * same language (keeps the region, e.g. en-GB, de-CH), else the bare code.
 */
export function resolveLocale(lang: LangCode, browser: readonly string[]): string {
  return browser.find(tag => primary(tag) === lang) ?? lang;
}

export type Translate = <K extends MessageKey>(key: K, ...args: MessageArgs<K>) => string;

/** Message lookup for `lang`, falling back to English for texts the catalog lacks. */
export function makeT(lang: string, languages: readonly Language[] = LANGUAGES): Translate {
  const cat: Partial<Messages> = languages.find(l => l.code === lang)?.messages ?? en;
  return (key, ...args) => {
    const m = (cat[key] ?? en[key]) as string | ((a: unknown) => string);
    return typeof m === "function" ? m(args[0]) : m;
  };
}
