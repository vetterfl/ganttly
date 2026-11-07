# Spec Delta

## Purpose

Lets each project be planned either in calendar days or in working days (Monday to Friday), and defines how dates and durations behave in a working-day project.

## ADDED Requirements

### Requirement: Project calendar choice
Each project SHALL use one of two calendars: calendar days (every day counts, the default for new and sample projects) or working days (Monday to Friday count, Saturday and Sunday do not). The calendar SHALL belong to the project: it is saved in the share link, applies to everyone who opens the link, and is not a per-browser setting. It SHALL be chosen in the Project section of the Settings dialog.

#### Scenario: Default
- **WHEN** the user starts a new project or opens the sample project
- **THEN** the project uses calendar days

#### Scenario: Shared with the link
- **WHEN** a user switches a project to working days and a first-time visitor opens the copied link
- **THEN** the visitor sees the project in working days with the same dates

#### Scenario: Reset does not change the project
- **WHEN** a working-day project is open and the user clicks "Reset to defaults" in the Settings dialog
- **THEN** the view settings return to their defaults and the project still uses working days

### Requirement: Dates fall on working days
In a working-day project, every task SHALL start and finish on a working day, and its duration SHALL be the number of working days from Start to Finish inclusive. A Start that falls on a weekend SHALL move to the following Monday. A Finish that falls on a weekend SHALL move to the preceding Friday, but never before the task's Start. Weekend days inside a task's span do not count towards its duration, and its bar still spans them.

#### Scenario: Start on a weekend
- **WHEN** in a working-day project the user sets a manual task's Start to Saturday 2026-11-07
- **THEN** the task starts on Monday 2026-11-09

#### Scenario: Duration across a weekend
- **WHEN** a task in a working-day project starts on Thursday 2026-11-12 with a duration of 3 days
- **THEN** it finishes on Monday 2026-11-16 and its bar spans 5 calendar days

### Requirement: Switching calendars keeps dates
Switching a project between calendar days and working days SHALL keep each manually scheduled task's dates. When switching to working days, those dates are moved onto working days as described above. Durations SHALL be re-counted in the new unit, and auto-scheduled tasks SHALL be rescheduled with their lags read in the new unit.

#### Scenario: Switch to working days
- **WHEN** a calendar-day project has a manual task from Saturday 2026-11-07 to Thursday 2026-11-12 and the user switches to working days
- **THEN** the task runs from Monday 2026-11-09 to Thursday 2026-11-12 and its duration shows 4 days

#### Scenario: Switch back
- **WHEN** that project is switched back to calendar days
- **THEN** the task keeps Monday 2026-11-09 to Thursday 2026-11-12 and its duration shows 4 days
