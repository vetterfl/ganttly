# Spec Delta

## Purpose

Provides an MS Project–style table for viewing and editing tasks, with one compact row per task and optional per-task settings tucked into a collapsible detail row.

## ADDED Requirements

### Requirement: Task grid columns
The system SHALL present tasks as a table with the columns ID, Task Name, Duration, Start, Finish and % Complete, with one row per task in task order.

#### Scenario: Grid shows all tasks
- **WHEN** the page loads with a chart containing 7 tasks
- **THEN** the grid shows 7 rows numbered 1 to 7, each showing that task's name, duration in days (e.g. "5 days"), start date, finish date and progress percentage

#### Scenario: Empty chart
- **WHEN** the chart has no tasks
- **THEN** the grid shows its column headers and an empty-state prompt to add a task

### Requirement: Inline editing of name and dates
The system SHALL let the user edit Task Name, Start and Finish directly in the grid row, and the timeline and share URL SHALL update while the user edits.

#### Scenario: Rename a task
- **WHEN** the user types a new name into a row's Task Name cell
- **THEN** the corresponding bar label in the timeline updates and the input keeps focus

#### Scenario: Finish before start is corrected
- **WHEN** the user sets a Finish date earlier than the row's Start date
- **THEN** the Start date is moved to equal the Finish date

#### Scenario: Start after finish is corrected
- **WHEN** the user sets a Start date later than the row's Finish date
- **THEN** the Finish date is moved to equal the Start date

### Requirement: Editable duration
The system SHALL let the user edit a task's Duration in whole days (minimum 1). Changing it SHALL keep the Start date and set the Finish date to Start + Duration − 1 days.

#### Scenario: Lengthen a task
- **WHEN** a task starts on 2026-11-02 and the user changes its Duration to 10
- **THEN** its Finish becomes 2026-11-11 and its bar spans 10 days

#### Scenario: Invalid duration
- **WHEN** the user enters 0, a negative number or non-numeric text as Duration
- **THEN** the task keeps its previous duration once the field loses focus

### Requirement: Collapsed per-task options
The system SHALL hide each task's colour, progress-slider and delete controls by default, and each row SHALL have a toggle that expands or collapses a detail strip under the row containing those controls.

#### Scenario: Rows start collapsed
- **WHEN** the page loads
- **THEN** every row is collapsed and no colour swatches or progress sliders are visible

#### Scenario: Expand a row
- **WHEN** the user activates the expand toggle on row 2
- **THEN** a detail strip appears under row 2 with colour swatches, a progress slider and a delete button, and the toggle shows the expanded state

#### Scenario: Collapse a row
- **WHEN** the user activates the toggle on an expanded row
- **THEN** its detail strip is hidden

#### Scenario: Expansion is not shared
- **WHEN** the user expands a row and then copies the share link
- **THEN** opening that link shows all rows collapsed

### Requirement: Detail strip controls
The expanded detail strip SHALL let the user pick one of the palette colours, set progress from 0 to 100% in steps of 5, and delete the task.

#### Scenario: Change colour
- **WHEN** the user picks the third swatch in an expanded row
- **THEN** that task's bar is drawn in the third palette colour and the swatch is marked selected

#### Scenario: Change progress
- **WHEN** the user drags the progress slider to 60
- **THEN** the row's % Complete cell shows 60% and the bar's progress strip covers 60% of the bar

#### Scenario: Delete a task
- **WHEN** the user clicks delete in an expanded row
- **THEN** the task is removed from the grid and timeline, the remaining rows are renumbered, and a confirmation toast appears

### Requirement: Adding tasks from the grid
The system SHALL provide an add-task action that appends a 5-day task starting the day after the latest finish date (or today if there are no tasks) and focuses its name cell.

#### Scenario: Add a task
- **WHEN** the user triggers Add task and the latest task finishes on 2026-11-20
- **THEN** a new row "New task" from 2026-11-21 to 2026-11-25 is appended and its name cell is focused with the text selected

### Requirement: Task name length
The grid SHALL allow task names of up to 120 characters, the same limit that is kept when loading a shared link.

#### Scenario: Long name
- **WHEN** the user types a 100-character task name
- **THEN** the full name is kept and survives a round-trip through the share link
