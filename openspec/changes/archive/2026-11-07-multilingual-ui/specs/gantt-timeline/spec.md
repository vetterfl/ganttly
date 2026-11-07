# Spec Delta

## MODIFIED Requirements

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
