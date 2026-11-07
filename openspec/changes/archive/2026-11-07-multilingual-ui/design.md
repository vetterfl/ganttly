# Design

## Context

There are about 110 interface strings, hard-coded in `App.tsx`, `TaskGrid.tsx`, `SettingsDialog.tsx`, `ConfirmDialog.tsx`, `cells.tsx`, `ColumnResizer.tsx` and `Timeline.tsx`. Language-dependent pieces already exist, but each is tied to something else:
- `Settings.notation: "de" | "en"` (default `"de"`) drives the predecessor format and the timescale's KW/W.
- `format.ts` uses `Intl.DateTimeFormat(undefined)`, so "browser locale" dates and month names come from the browser.
- Core creates English defaults: "New task", "New group", "Untitled Project", the sample project, and the notation error `message`s.

Settings are merged field by field from localStorage (`mergeSettings`), so unknown values fall back to defaults. There are no dependencies beyond React.

See `proposal.md` and `specs/`.

## Goals / Non-Goals

**Goals:**
- One place per language.
- Type-checked keys.
- No missing-text crashes.
- Instant switching.
- Core stays free of UI language: it gets strings passed in.
- Adding a language means one file plus one registry line.

**Non-Goals:**
- An i18n library (react-intl/i18next). The needs are small: about 110 strings, two plural forms and simple interpolation. A typed object stays dependency-free and tree-shakable.
- Lazy-loading catalogs. Both catalogs together are about 6 KB.
- Translating user data.
- RTL layout.

## Decisions

### 1. Catalogs as typed TS objects

`src/i18n/en.ts` exports `const en = { … } as const`, the source of truth. Values are strings, or functions for parameters and plurals:

```ts
export const en = {
  "ribbon.addTask": "Add task",
  "confirm.new.message": (p: { title: string; n: number }) =>
    `This replaces “${p.title}” and its ${p.n} ${p.n === 1 ? "task" : "tasks"} …`,
  "unit.days": (n: number) => (n === 1 ? "day" : "days"),
  …
};
export type Messages = typeof en;  // widened: values' types, not literals
```

- `de.ts` is typed `Messages`, so TypeScript requires every key with a matching signature. German must be complete, and it's a compile error otherwise.
- Future languages may be typed `Partial<Messages>`. Missing keys fall back to `en` at runtime. A unit test also asserts `de` has every key of `en`.
- **Alternative:** JSON files with ICU syntax. Rejected: it needs a runtime parser, and keys or params can't be type-checked.

### 2. Registry, resolution and `t()`: `src/i18n/index.ts`

```ts
export const LANGUAGES = [
  { code: "en", name: "English", messages: en },
  { code: "de", name: "Deutsch", messages: de },
] as const;
export type LangCode = (typeof LANGUAGES)[number]["code"];
resolveLanguage(pref: "auto" | LangCode, navigatorLanguages: readonly string[]): LangCode
resolveLocale(lang, navigatorLanguages): string   // e.g. "en-GB" if the browser prefers en-GB, else lang
makeT(lang): <K extends keyof Messages>(key: K, ...args: Params<K>) => string
```

`resolveLanguage` matches the primary subtag (`de-AT` gives `de`) in the browser's preference order. Everything here is pure and receives `navigator.languages` as an argument, so it's testable.

### 3. React wiring

- `I18nProvider` sits inside `SettingsProvider`. It computes `{ lang, locale, t }` from `settings.language` and `navigator.languages`, memoised, and sets `document.documentElement.lang`.
- Components call `const { t, locale } = useI18n()`.
- Switching the language re-renders through context, with no reload.

### 4. Settings

- `language: "auto" | LangCode`, default `"auto"`.
- `notation: "auto" | "de" | "en"`, default `"auto"`.
- `useEffectiveNotation()` gives `"de"` when (auto and lang is `de`) or explicitly `de`, and `"en"` otherwise.
- `mergeSettings` validates against the registry codes.
- **Existing users:** saved settings already contain `notation: "de"` (the old default was always saved), so they keep German notation until they pick *Same as app language*. That's acceptable and documented: their visible behaviour doesn't change.
- The date format value `"locale"` keeps its stored key. Only the label changes to "Language default", and `format.ts` takes the resolved locale instead of `undefined`.

### 5. Core stays language-free

- **`notation.ts`:** `ParseError` gains `params` (`{ entry }`, `{ row }`, `{ rows, me }`). The English `message` stays for tests and debugging, and the UI renders `t("error.cycle", params)`, etc.
- **Default names:** `addTask { name? }`, `addGroup { name? }` and `newProject { title? }` take optional names, defaulting to the current English strings, so existing tests are unchanged. `App` passes `t("default.task")` and so on.
- **Sample project:** `sampleProject(today, names?)` takes `{ title, tasks: string[7] }`. `App` passes the catalog's sample names when there's no link.
- **Timescale:** `buildTimescale(…, opts)` replaces `lang` with `weekLabel: (n) => [long, short]` and `locale`. The tier logic is unchanged, and the existing tests pass the equivalent English and German labels.
- **Link decoding:** fallbacks for malformed links ("My Project", "Task") stay English. They only appear for broken links, and the codec has no access to the UI.

### 6. German wording and fit

The wording follows MS Project's German UI: Vorgang hinzufügen, Gruppe hinzufügen, Link kopieren, Neues Projekt / Neu, Drucken, Einstellungen, Vorgangsname, Dauer, Anfang, Ende, Vorgänger and Heute.

- **The "% Complete" header:** "% Abgeschlossen" doesn't fit 82px, so it becomes "% Fertig", with the full "% abgeschlossen" as its tooltip.
- **Duration units:** "Tag/Tage" for calendar days, and "AT" (Arbeitstage) for working days, with the tooltip "Dauer in Arbeitstagen (Mo–Fr)".
- **Width checks:** `9999 Tage` must fit the 88px default, and the browser check in tasks 2.3 verifies every header and ribbon label.

## Risks / Trade-offs

- [Strings missed during extraction stay English in German mode] → task 2.1 includes a scan for user-facing literals in `src/ui`, and the German UI test asserts that no known English labels remain on the main screen.
- [Longer German labels wrap the ribbon or clip headers] → checked at 1440px and 390px. Wording is chosen to fit, with tooltips carrying the full text.
- [Existing users keep explicit German notation] → documented above.
- [Tests depend on English texts] → the test render helper pins the language to `en` via settings, so the existing tests run unchanged. German gets its own tests.

## Migration Plan

- No data migration.
- Settings gain fields with defaults, and old stored settings merge cleanly.
- Share links are unchanged.
