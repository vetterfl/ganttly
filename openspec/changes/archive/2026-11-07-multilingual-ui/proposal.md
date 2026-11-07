# Proposal

## Why

Every visible text in Ganttly is hard-coded English: the ribbon, column headers, dialogs, tooltips, error messages, toasts, the "Today" flag and the default names of new tasks and projects. Only month names and the predecessor notation follow German conventions today. German-speaking users should get a German app, and adding another language later should mean adding one file, not hunting for strings in components.

## What Changes

- **App language setting** in the Settings dialog: *Automatic (browser language)*, *English* or *Deutsch*. The default is automatic. It picks the first browser language Ganttly supports and falls back to English. Like the other view settings, it is stored per browser and is not part of the share link.
- **All UI text is translatable** and translated to German, using MS Project's German terms ("Vorgang", "Dauer", "Anfang", "Ende", "Vorgänger"). This covers:
  - ribbon, column headers, the options strip and group headers;
  - dialogs, menus, tooltips, accessible labels and toasts;
  - predecessor error messages;
  - the timeline's "Today" flag, month names and calendar-week labels ("KW 45" in German, "W45" in English).
- **Dates follow the app language.** The "Browser locale" date format becomes "Language default", which formats dates and month names in the app language (keeping the browser's region where it matches, e.g. en-GB). ISO and DD.MM.YYYY are unchanged.
- **The link notation follows the app language by default.** A German app shows EA/AA/EE/AE with T, and an English app shows FS/SS/FF/SF with d. The Link notation setting gains *Same as app language* (the new default), and German or English notation can still be picked explicitly. Typing either notation keeps working in every language.
- **Default content is created in the app language:**
  - the names of new tasks and groups;
  - "Untitled Project";
  - the sample project shown when there is no link.

  These are ordinary data once created: a German default name stays German in the link.
- **Adding a language later:** add one message file (checked against the English one by TypeScript, with English as the fallback for missing texts) and one registry entry. The README documents this.
- **Not in scope:**
  - Right-to-left languages.
  - Translating user content (task names) or old links' content.
  - Server-side detection.

## Capabilities

### New Capabilities
- `localization`: app language choice and detection, translated UI text, language-dependent default content, fallback rules, and the extension point for new languages.

### Modified Capabilities
- `view-settings`: "Notation and date format settings". The notation defaults to following the app language, and "Browser locale" date formatting becomes "Language default".
- `gantt-timeline`: "Two-tier timescale". Month names and week labels follow the app language instead of the notation setting.

## Impact

- **New `src/i18n/`:**
  - message catalogs `en.ts` (source of truth) and `de.ts`;
  - a language registry, browser-language resolution, and a `t()` function with parameters and plurals;
  - a React provider and hook.
- **Settings:** `settings.ts` gets `language: "auto" | code`, and `notation` gains `"auto"`. The dialog gets a Language select.
- **Every UI component:** strings move to message keys. `<html lang>` follows the app language.
- **Core (stays language-free):**
  - `notation.ts` errors carry a kind and parameters for the UI to phrase;
  - `addTask`/`addGroup`/`newProject` accept the default name from the UI;
  - `sampleProject` takes localized names;
  - `timescale.ts` takes a week-label function and a locale.
- **Docs:** README and CLAUDE.md.
- **Share links:** unchanged.
