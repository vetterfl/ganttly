# Spec Delta

## MODIFIED Requirements

### Requirement: Editable duration
The system SHALL let the user edit a task's Duration in whole days of the project's calendar (minimum 1). Changing it SHALL keep the Start date and set the Finish date to Start + Duration − 1 days, counted in that calendar. In a working-day project the Duration unit SHALL be labelled as working days (e.g. "5 wdays") and its tooltip SHALL say "working days (Mon–Fri)".

#### Scenario: Lengthen a task
- **WHEN** a task starts on 2026-11-02 and the user changes its Duration to 10
- **THEN** its Finish becomes 2026-11-11 and its bar spans 10 days

#### Scenario: Invalid duration
- **WHEN** the user enters 0, a negative number or non-numeric text as Duration
- **THEN** the task keeps its previous duration once the field loses focus

#### Scenario: Lengthen a task in working days
- **WHEN** in a working-day project a task starts on Monday 2026-11-02 and the user changes its Duration to 10
- **THEN** its Finish becomes Friday 2026-11-13, its bar spans 12 calendar days, and the cell shows "10 wdays"

### Requirement: Adding tasks from the grid
The system SHALL provide an add-task action that appends a 5-day task starting the day after the latest finish date (or today if there are no tasks) and focuses its name cell. Days are counted in the project's calendar, so in a working-day project the task starts on the next working day and lasts 5 working days.

#### Scenario: Add a task
- **WHEN** the user triggers Add task and the latest task finishes on 2026-11-20
- **THEN** a new row "New task" from 2026-11-21 to 2026-11-25 is appended and its name cell is focused with the text selected

#### Scenario: Add a task in working days
- **WHEN** in a working-day project the user triggers Add task and the latest task finishes on Friday 2026-11-20
- **THEN** a new row "New task" from Monday 2026-11-23 to Friday 2026-11-27 is appended
