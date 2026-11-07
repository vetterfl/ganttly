# Tasks

Prerequisite: `timeline-drag-pan` is applied and archived. Apply and archive this before `reorder-tasks`.

## 1. Core: calendar, scheduling, notation, link format

- [x] 1.1 Create `src/core/calendar.ts` per design §1 (`calendarOps`, `snapTask`, `durationIn`, `addUnits`). Unit-test: working-day index round trips across year ends and DST weeks; Sat/Sun → Monday for start and Friday for finish; a finish snapped before start clamps to start; `durationIn` of Thu–Mon = 3; `days` mode matches `durationOf`/`addDaysIso` for random dates.
- [x] 1.2 Add `Calendar`, `Project.calendar` (sample/empty `"days"`) and `setCalendar` to `model.ts`. Make `schedule(tasks, cal)` and every date-writing reducer action calendar-aware, including snapping manual tasks. Verify that all existing scheduler and reducer tests pass unchanged with `"days"`. Add reducer tests for every working-day scenario in the `task-scheduling`, `task-grid` and `project-calendar` deltas (FS+2, FF−2, SS+1, SF, Finish-edit snapping, Duration 10, Add task after Friday, Start on Saturday, switching to working days and back).
- [x] 1.3 Make `parsePredecessors` take the calendar (a week is 5 days in working days). Test `2aa+1W` → lag 5 in working days and 7 in calendar days.
- [x] 1.4 Write link format v5 (`cal: 1` only for working days) and decode v5 with snapping. Tests: a v5 working-day round trip with links; v5 without `cal` → days; `cal: "x"` → days; a tampered Saturday start → Monday; v4 with zoom 2.5 → days at 2.5; the v1–v3 tests still pass.

## 2. UI

- [x] 2.1 Add the Project section to the Settings dialog (renamed to "Settings"; two radios, dispatching `setCalendar`). Make the Duration unit and tooltip and the narrow detail field follow the calendar, and snap Add task's "today". Testing Library tests:
  - switching shows "wdays" and reschedules a linked task;
  - the URL holds `cal: 1`, and localStorage settings don't contain the calendar;
  - "Reset to defaults" keeps working days;
  - loading another project's link shows that project's calendar;
  - existing tests that look up the dialog heading still pass.
- [x] 2.2 Verify in Chromium and WebKit: switch the sample to working days; check that no bar starts or ends on a weekend, that durations show "wdays" without overflow at the default Duration width (including "3650 wdays"), and that arrows still attach. Copy the link, open it in a fresh context and check it shows the same dates and calendar. Check that a live-site v3 link still opens in calendar days.

## 3. Docs

- [x] 3.1 Update `README.md` (Project calendar: calendar vs working days, weeks = 5 working days, shared via the link) and `CLAUDE.md` (`calendar.ts` index model, `schedule(tasks, cal)`, snapping invariant, v5 `cal`). Run `npm run lint`, `npm test` and `npm run build`.
