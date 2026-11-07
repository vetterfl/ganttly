# Tasks

## 1. i18n foundation and pure-core hooks

- [x] 1.1 Create `src/i18n/` per design §1–2: `en.ts` (keys for every interface text, functions for parameters and plurals), `de.ts` typed `Messages`, the `LANGUAGES` registry, `resolveLanguage`, `resolveLocale` and `makeT` with English fallback. Unit tests:
  - de-AT → de, [fr, es] → en, [fr, de] → de;
  - `resolveLocale` keeps a matching region (en-GB);
  - a missing key in a partial catalog falls back to English;
  - `de` has every key of `en`;
  - parameter and plural output for one string in each language.
- [x] 1.2 Extend `settings.ts`: `language: "auto" | LangCode` and `notation: "auto" | "de" | "en"` (both default `"auto"`), validated in `mergeSettings`, plus an effective-notation helper. Tests: defaults; invalid values fall back; a stored `"de"` notation is kept; "Reset" restores auto.
- [x] 1.3 Core hooks per design §5:
  - `ParseError.params`;
  - optional default names in `addTask`/`addGroup`/`newProject`;
  - `sampleProject(today, names?)`;
  - `buildTimescale` with `weekLabel` and `locale` options.

  Verify that all existing core and timescale tests pass (adapted only to the new timescale options) and add tests for the passed-in names and the error params.

## 2. UI

- [x] 2.1 Add `I18nProvider`/`useI18n` (sets `<html lang>`), and route every interface string in `src/ui` through `t()`: ribbon, grid headers, cells, the options strip, group headers and menu, dialogs, tooltips, aria-labels, toasts, the empty state, predecessor errors, duration units, the Today flag, and the timescale's months and weeks. `format.ts` uses the resolved locale. Pin tests to English in `renderApp`. Verify that the existing component tests pass unchanged and that a scan of `src/ui` for user-facing English literals (outside `i18n/`) finds none.
- [x] 2.2 Write the German catalog (MS Project terms, design §6). Add the Language select to the Settings dialog (Automatic + language names) and the "Same as app language" notation option, and rename "Browser locale" to "Language default". Pass localized default names and sample names from `App`. Testing Library tests:
  - switching to Deutsch translates the ribbon, headers and the open dialog without a reload, and the choice persists;
  - a first visit with `navigator.languages = ["de-AT"]` is German, and `["fr","es"]` is English;
  - auto notation follows the language, and an explicit notation wins;
  - Add task in German creates "Neuer Vorgang", which stays after switching to English;
  - a German cycle error message;
  - Reset returns to Automatic.
- [x] 2.3 Verify in Chromium and WebKit with the browser locale set to de-DE and en-US, at 1440px and 390px:
  - no clipped or overlapping ribbon labels, column headers or dialog texts in German;
  - `9999 Tage` fits the default Duration column;
  - month names and KW labels are German;
  - print looks right;
  - a link copied in German opens in English for an English browser with identical data.

## 3. Docs

- [x] 3.1 Update `README.md` (languages, how to add one: copy `en.ts`, translate, register) and `CLAUDE.md` (no hard-coded UI strings: add keys to `en.ts` and `de.ts`; core gets texts passed in; tests run in English). Run `npm run lint`, `npm test` and `npm run build`.
