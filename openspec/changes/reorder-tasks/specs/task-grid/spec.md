# Spec Delta

## ADDED Requirements

### Requirement: Move tasks up and down
The system SHALL let the user move a task one position up or down with Move up and Move down buttons in its detail strip, and with Alt+↑ / Alt+↓ while focus is in the task's row. Moving SHALL renumber the rows and keep each task's dates, links and open detail strip. Focus SHALL stay on the moved task.

#### Scenario: Move down with the keyboard
- **WHEN** focus is in row 2's Task Name cell and the user presses Alt+↓
- **THEN** that task becomes row 3, the former row 3 becomes row 2, and focus is still in the moved task's Task Name cell

#### Scenario: Links follow the task
- **WHEN** task 5 has predecessor `2` and task 2 is moved to position 4
- **THEN** the same task is now row 4, task 5's Predecessors cell shows `4`, and no dates change

#### Scenario: Edges
- **WHEN** the first task is moved up or the last task is moved down
- **THEN** nothing changes, and the corresponding button is disabled

#### Scenario: Order is shared
- **WHEN** the user reorders tasks and copies the share link
- **THEN** opening the link shows the tasks in the new order

### Requirement: Drag to reorder
Each row SHALL have a drag grip in its ID cell. Dragging it with mouse, pen or touch SHALL show a drop indicator between rows, and dropping SHALL move the task to that position. Dragging near the top or bottom edge of the workspace SHALL auto-scroll, and Escape SHALL cancel the drag without changes.

#### Scenario: Drag to a new position
- **WHEN** the user drags row 6's grip and drops it between rows 1 and 2
- **THEN** that task becomes row 2 and rows 2–5 shift down by one

#### Scenario: Cancel
- **WHEN** the user is dragging a row and presses Escape
- **THEN** the drag ends and the task order is unchanged

#### Scenario: Auto-scroll
- **WHEN** a chart has 40 tasks and the user drags a row to the bottom edge of the workspace
- **THEN** the workspace scrolls down until the user moves away from the edge or the end is reached

#### Scenario: Timeline follows
- **WHEN** a drag is dropped
- **THEN** the timeline lanes, bars and arrows are redrawn in the new order and stay aligned with the grid rows
