# Spec Delta

## ADDED Requirements

### Requirement: Drag to pan
The user SHALL be able to move the view by dragging with the mouse. Dragging with the left button anywhere in the timeline (timescale, lanes or bars), or with the middle button anywhere in the workspace, SHALL scroll the workspace with the pointer, horizontally and vertically, within the existing scroll limits. A press that moves less than 4px SHALL behave as a normal click. Left-button drags in the grid SHALL NOT pan. Touch input SHALL keep its native scrolling.

#### Scenario: Left drag in the timeline
- **WHEN** the chart is zoomed in wider than the window and the user presses the left button on an empty lane and drags 200px to the left and 60px up
- **THEN** the timeline scrolls 200px to the right and the workspace 60px down, grid rows and lanes stay aligned, and the grid stays in place horizontally

#### Scenario: Drag starting on a bar
- **WHEN** the user presses the left button on a task bar and drags
- **THEN** the view pans and the task's dates do not change

#### Scenario: Middle drag over the grid
- **WHEN** the user drags with the middle button over the task grid
- **THEN** the workspace pans and the browser's autoscroll indicator does not appear

#### Scenario: Click is not a pan
- **WHEN** the user presses and releases the left button on a bar after moving less than 4px
- **THEN** the view does not move

#### Scenario: Grid editing unaffected
- **WHEN** the user left-drags inside a Task Name cell
- **THEN** the cell's text is selected and the view does not pan

#### Scenario: Pan stops at the edges
- **WHEN** the view is already scrolled fully left and the user drags to the right
- **THEN** the view stays at its left edge
