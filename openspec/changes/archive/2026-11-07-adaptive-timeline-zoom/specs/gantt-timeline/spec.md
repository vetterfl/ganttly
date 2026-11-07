# Spec Delta

## MODIFIED Requirements

### Requirement: Two-tier timescale
The timeline SHALL show a two-tier header covering the task date range padded by 2 days before and 3 days after. The tiers SHALL depend on the width of one day (w):
- w ≥ 20px: months over every day
- 12–20px: months over day numbers of Mondays and the 1st
- 3.5–12px: months over calendar weeks
- 0.8–3.5px: years over months
- below 0.8px: years over quarters

#### Scenario: Header spans the range
- **WHEN** tasks run from 2026-11-02 to 2026-11-25
- **THEN** the timescale starts at 2026-10-31 and covers at least 2026-11-28, with an "October 2026" and a "November 2026" segment on the top tier

#### Scenario: Dense zoom thins day labels
- **WHEN** the zoom gives each day between 12 and 20px
- **THEN** only Mondays and the 1st of each month show a day number

#### Scenario: Weeks
- **WHEN** each day is 6px wide
- **THEN** the lower tier shows one cell per calendar week, labelled with its ISO week number ("KW 45" with German notation, "W45" with English)

#### Scenario: Multi-year project
- **WHEN** a project spans 2026-01-01 to 2028-12-31 and is shown at Fit in a 1200px-wide timeline
- **THEN** the upper tier shows the years 2026, 2027 and 2028, and the lower tier shows months or quarters, with no overlapping labels

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

## REMOVED Requirements

### Requirement: Zoom levels
**Reason**: Five fixed pixel-per-day presets cannot show long projects at once and are too coarse; replaced by zoom relative to the project's fitted width.
**Migration**: See "Fit-relative zoom". Zoom presets stored in older share links are ignored and those charts open at Fit (see share-links).

## ADDED Requirements

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
