# task-grid Specification

## Purpose

Provides an MS Project–style table for viewing and editing tasks, with one compact row per task and optional per-task settings tucked into a collapsible detail row.

## Requirements

### Requirement: Task grid columns
The system SHALL present tasks as a table with the columns ID, Task Name, Duration, Start, Finish, % Complete and Predecessors, with one row per task in task order. ID and Task Name SHALL always be shown. The other columns are shown unless they are turned off in view settings.

#### Scenario: Grid shows all tasks
- **WHEN** the page loads with a chart containing 7 tasks
- **THEN** the grid shows 7 rows numbered 1 to 7, each showing that task's name, duration in days (e.g. "5 days"), start date, finish date, progress percentage and predecessors

#### Scenario: Empty chart
- **WHEN** the chart has no tasks
- **THEN** the grid shows its column headers and an empty-state prompt to add a task

### Requirement: Inline editing of name and dates
The system SHALL let the user edit Task Name, Start and Finish directly in the grid row, and the timeline and share URL SHALL update while the user edits. Start SHALL NOT be editable for auto-scheduled tasks, whose start is computed from their predecessors.

#### Scenario: Rename a task
- **WHEN** the user types a new name into a row's Task Name cell
- **THEN** the corresponding bar label in the timeline updates and the input keeps focus

#### Scenario: Finish before start is corrected
- **WHEN** the user sets a Finish date earlier than the row's Start date of a manually scheduled task
- **THEN** the Start date is moved to equal the Finish date

#### Scenario: Start after finish is corrected
- **WHEN** the user sets a Start date later than the row's Finish date
- **THEN** the Finish date is moved to equal the Start date

#### Scenario: Auto-scheduled start
- **WHEN** a task has at least one predecessor
- **THEN** its Start cell cannot be edited, and its Finish can still be edited

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

### Requirement: Predecessors column
The task grid SHALL have a Predecessors column after % Complete. It shows each task's links in the configured notation and accepts edits on Enter or when it loses focus. It SHALL be hidden on narrow screens and editable in the expanded detail strip instead.

#### Scenario: Edit predecessors inline
- **WHEN** the user types `2EE-2T` in row 4's Predecessors cell and presses Enter
- **THEN** task 4 is linked finish-to-finish to task 2 with a lag of −2 days and is rescheduled

#### Scenario: Escape reverts
- **WHEN** the user is editing a Predecessors cell and presses Escape
- **THEN** the cell shows the task's current links again and nothing changes

#### Scenario: Narrow screen
- **WHEN** the viewport is narrower than 980px and the user expands a row
- **THEN** the detail strip contains an editable Predecessors field

### Requirement: Auto-scheduled indicator
Rows of auto-scheduled tasks SHALL show their Start cell as read-only, styled as computed, with a tooltip explaining that the date is derived from predecessors.

#### Scenario: Visual distinction
- **WHEN** row 3 has predecessors and row 1 does not
- **THEN** row 3's Start is shown as a non-editable computed value, and row 1's Start is an editable date input

### Requirement: Resizable columns
Every grid column except ID and the expand toggle SHALL be resizable with a handle on the right edge of its header cell, down to a per-column minimum width. The grid pane SHALL grow or shrink with the total column width.

#### Scenario: Drag to widen
- **WHEN** the user drags the Task Name header's handle 80px to the right
- **THEN** the Task Name column is 80px wider, the grid pane is 80px wider, and the timeline still starts right after the grid

#### Scenario: Minimum width
- **WHEN** the user drags the Duration handle far to the left
- **THEN** the column stops shrinking at its minimum width

#### Scenario: Auto-fit
- **WHEN** the user double-clicks the Task Name handle and the longest task name is wider than the column
- **THEN** the column resizes to fit the longest name

#### Scenario: Keyboard resize
- **WHEN** the Finish column's resize handle has keyboard focus and the user presses → three times
- **THEN** the Finish column becomes 24px wider

### Requirement: Cells do not overflow
Cell content that does not fit its column SHALL be cut off with an ellipsis and SHALL NOT overlap neighbouring cells. The full value SHALL be available as a tooltip. The default Duration width SHALL show values up to 9999 days in full.

#### Scenario: Three-digit duration
- **WHEN** the user enters 100 as a task's Duration with default column widths
- **THEN** the cell shows "100 days" in full, with no overlap

#### Scenario: Long name in a narrow column
- **WHEN** a task name is wider than the Task Name column and its cell does not have focus
- **THEN** the name ends with an ellipsis inside the cell and hovering shows the full name
