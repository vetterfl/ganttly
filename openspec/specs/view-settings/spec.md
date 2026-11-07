# view-settings Specification

## Purpose

Lets each user tailor how the grid and timeline are displayed (notation language, date format, columns, density and overlays) without changing the project data or the share link.

## Requirements

### Requirement: Settings dialog
The system SHALL provide a Settings dialog, opened from the ribbon, that applies each change immediately and can be closed with a Close button, the Escape key or a click outside the dialog. Besides the view settings, the dialog SHALL have a Project section, visually separated and labelled as saved with the project, whose options belong to the open project and its share link rather than to the browser.

#### Scenario: Live apply
- **WHEN** the user switches row density in the dialog
- **THEN** the grid and timeline change density immediately, while the dialog stays open

#### Scenario: Close with Escape
- **WHEN** the dialog is open and the user presses Escape
- **THEN** the dialog closes and focus goes back to the Settings button

#### Scenario: Project options are not view settings
- **WHEN** the user switches the project to working days in the Project section and then opens a different project's link in the same browser
- **THEN** the other project opens in its own calendar, not in working days

### Requirement: Notation and date format settings
The dialog SHALL offer link notation (German EA/AA/EE/AE with T, or English FS/SS/FF/SF with d; default German) and date format (browser locale, ISO YYYY-MM-DD, or DD.MM.YYYY; default browser locale). The date format SHALL apply everywhere dates are shown.

#### Scenario: First visit notation
- **WHEN** a user opens Ganttly for the first time in a browser
- **THEN** predecessors are shown in German notation

#### Scenario: Date format
- **WHEN** the user picks DD.MM.YYYY
- **THEN** the Start and Finish cells, the timeline tooltip and the chart subtitle show dates like 10.11.2026

### Requirement: Layout settings
The dialog SHALL offer row density (compact or comfortable; default compact) and a visibility toggle for each of the grid columns Duration, Start, Finish, % Complete and Predecessors (all shown by default). ID and Task Name SHALL always be shown.

#### Scenario: First visit layout
- **WHEN** a user opens Ganttly for the first time in a browser
- **THEN** all grid columns are shown and rows are compact

#### Scenario: Hide a column
- **WHEN** the user turns off the Duration column
- **THEN** the grid no longer shows Duration, and tasks keep their durations

### Requirement: Timeline overlay settings
The dialog SHALL offer on/off toggles, all on by default, for dependency arrows, weekend shading, the today marker, and the progress strip on bars.

#### Scenario: Hide weekend shading and today marker
- **WHEN** the user turns off weekend shading and the today marker
- **THEN** the timeline shows no weekend background and no today line

#### Scenario: Hide progress
- **WHEN** the user turns off the progress strip
- **THEN** bars are drawn without the darker progress strip, and % Complete in the grid is unchanged

### Requirement: Reset to defaults
The dialog SHALL have a "Reset to defaults" action that restores all settings to their defaults.

#### Scenario: Reset
- **WHEN** the user has changed several settings and clicks "Reset to defaults"
- **THEN** every setting returns to its default value and the view updates

### Requirement: Per-browser persistence
Settings SHALL be remembered in the user's browser across reloads and SHALL NOT be included in share links. If browser storage is unavailable, the app SHALL work with defaults for that session.

#### Scenario: Survives reload
- **WHEN** the user picks English notation and reloads the page
- **THEN** predecessors are still shown in English notation

#### Scenario: Not shared
- **WHEN** a user with English notation copies the share link and a first-time visitor opens it
- **THEN** the visitor sees predecessors in German notation

#### Scenario: Storage blocked
- **WHEN** browser storage throws on access (e.g. a private mode restriction)
- **THEN** the app loads with default settings and no error is shown

### Requirement: Column widths are view settings
Grid column widths SHALL be remembered per browser together with the other view settings. They SHALL NOT be included in share links, and "Reset to defaults" SHALL restore the default widths.

#### Scenario: Width survives reload
- **WHEN** the user widens the Task Name column and reloads the page
- **THEN** the Task Name column keeps its new width

#### Scenario: Not shared
- **WHEN** a user with a widened Task Name column copies the share link and a first-time visitor opens it
- **THEN** the visitor sees default column widths

#### Scenario: Reset restores widths
- **WHEN** the user has resized several columns and clicks "Reset to defaults"
- **THEN** every column returns to its default width
