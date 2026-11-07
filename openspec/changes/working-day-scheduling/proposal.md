# Proposal

**Queue:** apply after `timeline-drag-pan` is archived and before `reorder-tasks` (phase 3) and `task-groups` (phase 4). This change takes link format **v5**, so `task-groups` moves to v6; its plan has been updated accordingly.

## Why

Ganttly schedules in calendar days: a "5 days" task that starts on Thursday ends on Monday, after working through the weekend, and an FS link can start the next task on a Saturday. Most real plans are made in working days. In MS Project, "5 days" means a working week. Users need to choose per project which of the two a plan uses.

## What Changes

- **Each project has a calendar:** *calendar days* (today's behaviour and the default) or *working days (Mon–Fri)*. It is chosen in the Settings dialog in a new **Project** section, and it is saved with the project and its share link, not per browser, because it changes the dates everyone sees.
- **In a working-day project:**
  - Durations, lags and link formulas count only Monday–Friday. A week (`1W`) is 5 working days.
  - Tasks always start and finish on working days. Dates entered on a weekend snap to the next Monday (start) or the previous Friday (finish).
  - New tasks start on the next working day and last 5 working days.
  - The Duration column labels the unit as working days (`5 wdays`), with a tooltip.
- **Switching keeps the plan's dates:** manual tasks keep their dates (snapped to working days), durations are re-counted in the new unit, and linked tasks are rescheduled with their lags read in the new unit.
- **Share link format v5** stores the calendar. v1–v4 links open as calendar-day projects, exactly as before. **BREAKING** only for rollback: a v5 link opened by an older build loses its links and the calendar.
- **Not in scope:**
  - Holidays or custom work weeks.
  - Hours within a day.
  - Per-task calendars.
  - Elapsed-day units inside a working-day project (MS Project's `edays`).

## Capabilities

### New Capabilities
- `project-calendar`: the per-project choice of calendar days or working days, what a working day is, how dates snap, how switching behaves, and where the option lives.

### Modified Capabilities
- `task-scheduling`: Finish, the link formulas and Finish→Duration edits count in the project's calendar units.
- `task-grid`: Duration editing and Add task use the project's units, and the Duration unit label changes in working-day projects.
- `task-dependencies`: a week lag equals 5 days in working-day projects.
- `share-links`: format v5 stores the calendar; v4 joins the backward-compatible formats.
- `view-settings`: the Settings dialog gains a Project section whose options belong to the project, not the browser.

## Impact

- **Model and scheduling:**
  - `src/core/model.ts`: `Calendar` type, `Project.calendar`, `setCalendar` action.
  - New pure `src/core/calendar.ts`: working-day index arithmetic, snapping and unit spans.
  - `schedule.ts` and `reducer.ts` evaluate everything through the project's calendar.
  - `notation.ts`: the week factor depends on the calendar.
- **Codec:** `urlCodec.ts` writes v5, and reads v5 plus v1–v4.
- **UI:**
  - `SettingsDialog.tsx` gets a Project section, which needs the project calendar and `dispatch`.
  - Grid duration cells (`cells.tsx`, `TaskGrid.tsx`) and `App.tsx` change.
- **Unchanged in calendar-day projects:** everything. All existing tests keep passing unchanged.
- **Docs:** README and CLAUDE.md.
