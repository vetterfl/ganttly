# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
