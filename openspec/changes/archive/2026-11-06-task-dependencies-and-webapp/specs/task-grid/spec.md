# Spec Delta

## ADDED Requirements

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
