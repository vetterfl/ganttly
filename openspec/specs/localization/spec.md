# localization Specification

## Purpose

Shows Ganttly in the user's language: an app language chosen in the settings (by default the browser's language), with every interface text translated, and a simple way to add further languages.

## Requirements

### Requirement: App language setting
The Settings dialog SHALL offer an app language: Automatic (browser language), and each supported language listed by its own name (English, Deutsch). The default SHALL be Automatic. The choice SHALL be stored per browser with the other view settings, SHALL NOT be part of share links, and "Reset to defaults" SHALL restore Automatic. Changing it SHALL apply immediately without reloading.

#### Scenario: Switch language
- **WHEN** a user with an English app picks Deutsch in the Settings dialog
- **THEN** the ribbon, column headers and the dialog itself switch to German immediately, while the dialog stays open, and the choice survives a reload

#### Scenario: Not shared
- **WHEN** a user with a German app copies the share link and a first-time visitor with an English browser opens it
- **THEN** the visitor sees the app in English, with the same project data

### Requirement: Browser language detection
With Automatic, the app language SHALL be the first of the browser's preferred languages that Ganttly supports, matched by primary language subtag, and English if none is supported.

#### Scenario: German browser
- **WHEN** a user whose browser prefers de-AT opens Ganttly for the first time
- **THEN** the app is shown in German

#### Scenario: Unsupported browser language
- **WHEN** a user whose browser prefers French and then Spanish opens Ganttly for the first time
- **THEN** the app is shown in English

#### Scenario: Later preference supported
- **WHEN** a user whose browser prefers French and then German opens Ganttly for the first time
- **THEN** the app is shown in German

### Requirement: Translated interface
Every text of the interface SHALL be shown in the app language. This covers the title bar, ribbon, column headers, task options strip, group headers and menus, dialogs, tooltips, accessible names, toasts, the empty-state prompt, predecessor error messages, duration units and the timeline's Today flag, month names and calendar-week labels. User content (project title, task and group names) SHALL NOT be translated. The page's language attribute SHALL match the app language.

#### Scenario: German interface
- **WHEN** the app language is German
- **THEN** the ribbon shows "Vorgang hinzufügen" and "Neues Projekt", the column headers include "Vorgangsname", "Dauer", "Anfang", "Ende" and "Vorgänger", durations read like "5 Tage", and the Today flag reads "Heute"

#### Scenario: German error message
- **WHEN** the app language is German and the user enters a predecessor that would create a cycle
- **THEN** the inline error explains the circular dependency in German

#### Scenario: Texts fit
- **WHEN** the app language is German and the window is 1440px or 390px wide
- **THEN** no ribbon command, column header or dialog text is clipped or overlaps another, at the default column widths

### Requirement: Default content in the app language
Content that Ganttly creates SHALL be named in the app language at the moment it is created. This covers the name of a new task, the name of a new group, the title of a new project, and the sample project shown when no link is given. Once created it is ordinary project data and SHALL NOT change when the app language changes.

#### Scenario: New task in German
- **WHEN** the app language is German and the user adds a task
- **THEN** the new task is named "Neuer Vorgang"

#### Scenario: Created names stay
- **WHEN** a task was created as "Neuer Vorgang" and the user switches the app language to English
- **THEN** the task is still named "Neuer Vorgang"

### Requirement: Adding languages
Each language SHALL be defined by one message catalog, and the set of languages offered SHALL come from a single registry. A text missing from a catalog SHALL fall back to English rather than showing a key or nothing. The German catalog SHALL be complete.

#### Scenario: Missing text falls back
- **WHEN** a newly added language's catalog lacks the text for "Copy link"
- **THEN** the button shows "Copy link" in English, and every other text of that language is shown translated
