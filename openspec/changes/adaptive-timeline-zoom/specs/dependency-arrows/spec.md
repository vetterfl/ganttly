# Spec Delta

## MODIFIED Requirements

### Requirement: Arrows follow layout
Arrows SHALL stay attached to their bars when the zoom level changes, when rows are expanded or collapsed, and when tasks are rescheduled.

#### Scenario: Expanded row between linked tasks
- **WHEN** task 2 links to task 4 and row 3 is expanded
- **THEN** the arrow's vertical segment stretches across the extra space and still ends at task 4's bar

#### Scenario: Zoom change
- **WHEN** the user zooms from 300% back to Fit, or zooms with the mouse wheel
- **THEN** every arrow is redrawn to the new bar positions
