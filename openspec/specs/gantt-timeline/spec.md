# gantt-timeline Specification

## Purpose

Draws the project schedule as a Project-style Gantt timeline: a timescale, gridlines and one bold bar per task, with each lane aligned to its task row in the grid.

## Requirements

### Requirement: Two-tier timescale
The timeline SHALL show a two-tier header covering the task date range padded by 2 days before and 3 days after. The tiers SHALL depend on the width of one day (w):
- w ≥ 20px: months over every day
- 12–20px: months over day numbers of Mondays and the 1st
- 3.5–12px: months over calendar weeks
- 0.8–3.5px: years over months
- below 0.8px: years over quarters

Month names and calendar-week labels SHALL be in the app language.

#### Scenario: Header spans the range
- **WHEN** tasks run from 2026-11-02 to 2026-11-25
- **THEN** the timescale starts at 2026-10-31 and covers at least 2026-11-28, with an "October 2026" and a "November 2026" segment on the top tier (in an English app)

#### Scenario: Dense zoom thins day labels
- **WHEN** the zoom gives each day between 12 and 20px
- **THEN** only Mondays and the 1st of each month show a day number

#### Scenario: Weeks
- **WHEN** each day is 6px wide
- **THEN** the lower tier shows one cell per calendar week, labelled with its ISO week number ("KW 45" in a German app, "W45" in an English app)

#### Scenario: Multi-year project
- **WHEN** a project spans 2026-01-01 to 2028-12-31 and is shown at Fit in a 1200px-wide timeline
- **THEN** the upper tier shows the years 2026, 2027 and 2028, and the lower tier shows months or quarters, with no overlapping labels

#### Scenario: German month names
- **WHEN** the app language is German and the tasks run from 2026-11-02 to 2026-11-25
- **THEN** the top tier shows "Oktober 2026" and "November 2026"

### Requirement: Grid lines, weekends and today
The timeline SHALL draw a vertical gridline at each lower-tier unit boundary, a horizontal separator per lane, and a clearly coloured vertical "Today" marker when today is within the range. Saturdays and Sundays SHALL be shaded while a day is at least 3.5px wide.

#### Scenario: Today visible
- **WHEN** today falls within the timeline range
- **THEN** a labelled, full-height vertical marker is drawn in the middle of today's column, and when day numbers are shown, today's number is highlighted in the header

#### Scenario: Today outside range
- **WHEN** all tasks finish before today
- **THEN** no today marker is drawn

#### Scenario: Weekend shading threshold
- **WHEN** each day is narrower than 3.5px
- **THEN** no weekend shading is drawn, and gridlines appear only at month or quarter boundaries

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

### Requirement: Fit-relative zoom
Zoom SHALL be a factor relative to Fit. At 100% (Fit), the whole padded task range including bar labels fills the visible timeline width. Zooming in SHALL be possible until one day is 120px wide, and zooming SHALL NOT go below Fit. When the date span or window width changes, the view SHALL refit, keeping the chosen factor. The factor SHALL be stored in the share link.

#### Scenario: Opens fitted
- **WHEN** a project spanning 400 days is opened with zoom 100%
- **THEN** the entire project is visible without horizontal scrolling and the zoom label reads "Fit"

#### Scenario: Fine steps
- **WHEN** the zoom is at Fit and the user clicks zoom in twice
- **THEN** the zoom is about 156% (×1.25 per step) and the label shows the percentage

#### Scenario: Fit command
- **WHEN** the user has zoomed in and clicks Fit or presses Ctrl/⌘ 0
- **THEN** the zoom returns to 100% and the whole project is visible again

#### Scenario: Zoom limits
- **WHEN** the user zooms in until one day is 120px wide and zooms in again, or zooms out at Fit
- **THEN** the zoom does not change

#### Scenario: Wheel zoom keeps the pointed date
- **WHEN** the user holds Ctrl/⌘ and scrolls the mouse wheel over a date in the timeline
- **THEN** the zoom changes and that date stays under the pointer (±1 day width)

#### Scenario: Refit on change
- **WHEN** the zoom is 200% and the user lengthens the last task by 100 days
- **THEN** Fit is recomputed for the new span and the zoom stays 200% of the new Fit
