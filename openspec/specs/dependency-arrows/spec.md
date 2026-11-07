# dependency-arrows Specification

## Purpose

Shows task links in the Gantt timeline as connector arrows between bars, so the schedule's logic is visible at a glance, like the link lines in MS Project.

## Requirements

### Requirement: Arrow per link
The timeline SHALL draw one arrow for every predecessor link. It starts at the predecessor bar's anchor edge and ends with an arrowhead at the successor bar's anchor edge. Anchors depend on type: FS goes from P's end to S's start, SS from start to start, FF from end to end, and SF from P's start to S's end.

#### Scenario: Finish-to-start arrow
- **WHEN** task 3 has predecessor `2`
- **THEN** an arrow leaves the right end of task 2's bar and points into the left end of task 3's bar

#### Scenario: Finish-to-finish arrow
- **WHEN** task 4 has predecessor `2EE`
- **THEN** an arrow leaves the right end of task 2's bar and points into the right end of task 4's bar

### Requirement: Orthogonal routing
Arrows SHALL be drawn as horizontal and vertical segments (elbow connectors) that run in the gaps between lanes, not through other bars' labels. When the target anchor is left of the source anchor, the arrow SHALL route around by dropping into the gap between lanes before turning back.

#### Scenario: Backward-pointing link
- **WHEN** an SS link with negative lag places the successor's start left of the predecessor's start
- **THEN** the arrow leaves the predecessor, turns into the inter-lane gap, runs left, and enters the successor from the left with its arrowhead visible

### Requirement: Arrows follow layout
Arrows SHALL stay attached to their bars when the zoom level changes, when rows are expanded or collapsed, and when tasks are rescheduled.

#### Scenario: Expanded row between linked tasks
- **WHEN** task 2 links to task 4 and row 3 is expanded
- **THEN** the arrow's vertical segment stretches across the extra space and still ends at task 4's bar

#### Scenario: Zoom change
- **WHEN** the user zooms from 300% back to Fit, or zooms with the mouse wheel
- **THEN** every arrow is redrawn to the new bar positions

### Requirement: Arrow visibility setting
Arrows SHALL be shown by default and SHALL be hidden when the "Show dependency arrows" view setting is off. Links and scheduling are unaffected either way.

#### Scenario: Hide arrows
- **WHEN** the user turns off "Show dependency arrows"
- **THEN** no arrows are drawn, and the Predecessors cells and task dates are unchanged

### Requirement: Arrows in print
Visible arrows SHALL appear in printed output.

#### Scenario: Print with arrows
- **WHEN** arrows are shown and the user prints
- **THEN** the print preview contains the arrows between bars
