# Design

## Context

All day arithmetic happens in a few places:
- `schedule.ts`: the four candidate formulas, plus `Finish = Start + D − 1`.
- `reducer.ts`: `addTask`, `setFinish` (auto → duration), `setDuration`.
- `dates.durationOf`, used by the scheduler and by the grid's `DurationInput`.
- `notation.ts`, where a week is ×7.

Dates are stored as ISO calendar dates (`s`, `e`), and the timeline draws bars from those dates. Settings live in localStorage and must never change project data. The link format is v4 (`{v:4,t,zf,n,tasks}`).

See `proposal.md` and `specs/`.

## Goals / Non-Goals

**Goals:**
- One abstraction that makes scheduling and editing calendar-aware without branching all over the reducer.
- Calendar-day projects behave bit-for-bit as before.
- Stored task dates stay plain calendar dates, so the timeline, Fit and the codec's task encoding don't change.

**Non-Goals:**
- Holidays and configurable work weeks.
- Partial days.
- Per-task calendars.
- Showing elapsed and working days side by side.

## Decisions

### 1. Calendar as an index mapping: `src/core/calendar.ts`

A calendar maps dates to integer **day indexes** and back:

```ts
type Calendar = "days" | "workdays";
interface CalendarOps {
  startIdx(iso): number;   // index of the first counted day on/after iso
  finishIdx(iso): number;  // index of the last counted day on/before iso
  toIso(idx): string;
  isCounted(iso): boolean;
}
```

- **`days`:** the index is days since an epoch, and start and finish map identically.
- **`workdays`:** the index is the working-day ordinal, `weeks × 5 + (Mon=0 … Fri=4)`, counted from an epoch Monday. A weekend date maps to the following Monday for `startIdx` and to the preceding Friday for `finishIdx`. Both are O(1), with no loops over dates, so 3,650-day durations stay cheap.

With that:
- `snapTask(t, cal)`: `s = toIso(startIdx(s))`, `e = toIso(max(finishIdx(e), startIdx(s)))`.
- `durationIn(t, cal) = finishIdx(e) − startIdx(s) + 1`.
- `addUnits(iso, n, cal) = toIso(startIdx(iso) + n)`, applied to an already-snapped date.

The scheduler's formulas are rewritten in index space: `FS: pe + 1 + L`, `SS: ps + L`, `FF: pe + L − (D−1)`, `SF: ps − 1 + L − (D−1)`, and `e = s + D − 1`. In `days` mode this is exactly today's arithmetic.

- **Alternative:** store durations in units and derive dates. Rejected: it changes the data model and the codec, and the timeline would need conversions everywhere.
- **Alternative:** loop day by day to skip weekends. Rejected: it's O(duration) per operation and easy to get wrong at the edges.

### 2. Calendar lives on the project

- `Project.calendar: Calendar`, defaulting to `"days"` in `sampleProject`, `emptyProject` and every decoded legacy link.
- New action `{ type: "setCalendar"; calendar }`.
- `schedule(tasks, cal)` takes the calendar. The reducer passes `project.calendar` everywhere, and every action that writes dates runs `snapTask` on manually scheduled tasks before `schedule()`.
- **`setCalendar`:** snaps all manual tasks (a no-op when switching to `days`), then reschedules. Dates are kept, and durations are whatever the snapped span counts in the new unit.
- **Alternative:** keep duration *numbers* when switching, so a 5-day task becomes 5 working days and gets longer. Rejected: switching would silently stretch the whole plan. Keeping dates is predictable, and the user can adjust durations afterwards.

### 3. Notation

`parsePredecessors(text, tasks, taskId, cal)` uses a week factor of 7 or 5. Formatting is unchanged: lags are shown in days, which are project days.

### 4. Link format v5

`{ v:5, t, zf, n, cal?: 1, tasks }`: `cal: 1` means working days, and the key is omitted for calendar days.

When decoding, `cal === 1` gives `workdays` and anything else gives `days`. Decoded manual tasks are snapped (untrusted dates may fall on weekends), then scheduled. v1–v4 decode as `days`.

An older build reading v5 falls into its v2 path (it has a `tasks` array), so tasks load without links. Documented as a rollback limitation.

`task-groups` (phase 4) moves to v6 = v5 + groups. Its plan has been updated.

### 5. UI

- **Settings dialog:** renamed to "Settings". A new first fieldset, **Project — saved with this project**, holds two radio buttons: "Calendar days" and "Working days (Mon–Fri)". `SettingsDialog` receives `calendar` and an `onCalendar` callback, so `App` dispatches `setCalendar`. "Reset to defaults" only touches view settings.
- **Duration cell:**
  - `DurationInput` uses `durationIn(task, cal)`.
  - The unit text is "days" or "wdays".
  - The tooltip reads "Duration in days" or "Duration in working days (Mon–Fri)".
  - The narrow-screen detail field gets the same unit.
- **Add task:** "today" is snapped to the next working day.
- **Timeline:** unchanged. Bars span calendar dates, and weekend shading shows the non-working days inside bars.

## Risks / Trade-offs

- [Switching a project back and forth snaps weekend dates once, so it is not a perfect round trip] → it's spec'd: dates are kept after snapping, and calendar mode never moves dates.
- [Lags in old links are read as working days if the user switches the project] → expected: lag numbers are in project days. The successor dates move, and the arrows show it.
- [A v5 link in an older build loses links] → same class of rollback limitation as v4, documented in the proposal.
- [`MAX_DURATION` (3650) now means 3650 *units*, about 14 years in working days] → acceptable. The timeline handles it.

## Migration Plan

- Old links open as calendar-day projects with identical dates.
- The URL is rewritten as v5 on the first edit.
- No settings migration.
