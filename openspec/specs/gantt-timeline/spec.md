# gantt-timeline Specification

## Purpose

Draws the project schedule as a Project-style Gantt timeline: a timescale, gridlines and one bold bar per task, with each lane aligned to its task row in the grid.

## Requirements

### Requirement: Two-tier timescale
The timeline SHALL show a two-tier header: month-and-year labels on the top tier and day-of-month numbers on the bottom tier, covering the task date range padded by 2 days before and 3 days after.

#### Scenario: Header spans the range
- **WHEN** tasks run from 2026-11-02 to 2026-11-25
- **THEN** the timescale runs from 2026-10-31 to 2026-11-28, with an "October 2026" and a "November 2026" segment on the top tier

#### Scenario: Dense zoom thins day labels
- **WHEN** the zoom level gives each day less than 20px
- **THEN** only Mondays and the 1st of each month show a day number

### Requirement: Grid lines, weekends and today
The timeline SHALL draw a vertical gridline per day, a horizontal separator per lane, shading for Saturdays and Sundays, and a clearly coloured vertical "Today" marker when today is within the range.

#### Scenario: Today visible
- **WHEN** today falls within the timeline range
- **THEN** a labelled, full-height vertical marker is drawn in the middle of today's column and today's day number is highlighted in the header

#### Scenario: Today outside range
- **WHEN** all tasks finish before today
- **THEN** no today marker is drawn

### Requirement: Bold task bars
Each task SHALL be drawn as a solid bar in its palette colour from its start day to its finish day inclusive. Completed progress SHALL appear as a darker strip along the bar, and the task name SHALL appear as a label directly to the right of the bar.

#### Scenario: Bar with progress
- **WHEN** a task is 45% complete
- **THEN** its bar shows a darker progress strip covering 45% of the bar's length from the left

#### Scenario: Label beside bar
- **WHEN** any task is drawn
- **THEN** its name appears immediately right of the bar, in the timeline's text colour and not clipped by the bar's width

#### Scenario: Hover details
- **WHEN** the user hovers over a bar
- **THEN** a tooltip shows the task name, start, finish and % complete

### Requirement: Bold colour palette
The system SHALL offer exactly 8 saturated, high-contrast bar colours, indexed 0–7. Colour indexes stored in existing share links SHALL map to the new colours at the same position.

#### Scenario: Legacy link colours
- **WHEN** a link created before this change stores a task with colour index 3
- **THEN** the task is drawn in palette colour 3 of the new palette

#### Scenario: Contrast
- **WHEN** a bar is drawn on the white timeline background
- **THEN** the bar colour has a contrast ratio of at least 3:1 against the background

### Requirement: Lane alignment with grid
Each timeline lane SHALL line up vertically with its task's grid row, including when a row's detail strip is expanded.

#### Scenario: Collapsed alignment
- **WHEN** all rows are collapsed
- **THEN** the vertical centre of each bar lines up with the vertical centre of its grid row

#### Scenario: Expanded alignment
- **WHEN** row 2 is expanded
- **THEN** the timeline adds empty space after lane 2 equal to the height of the detail strip, and lanes 3 and later still line up with their grid rows

### Requirement: Zoom levels
The timeline SHALL offer five zoom levels (Compact, Cozy, Normal, Large, Huge), changed with the ribbon zoom controls or Ctrl/⌘ + and Ctrl/⌘ −. The chosen level SHALL be stored in the share link.

#### Scenario: Zoom in
- **WHEN** the zoom is Normal and the user clicks zoom in
- **THEN** the zoom becomes Large, the day columns get wider and the zoom label reads "Large"

#### Scenario: Zoom limit
- **WHEN** the zoom is Huge and the user zooms in
- **THEN** the zoom stays Huge
