# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Ganttly is an MS Project–style Gantt chart web app: Vite + React 18 + TypeScript (strict, `noUncheckedIndexedAccess`). No backend — the whole project lives in the URL. Planning is done with OpenSpec (`openspec/`; main specs in `openspec/specs/`, changes in `openspec/changes/`).

## Commands

```bash
npm install
npm run dev          # dev server with hot reload (use --host 127.0.0.1 if localhost resolves to ::1)
npm run build        # tsc -b + vite build → static site in dist/ (works from any sub-path, base "./")
npm run preview      # serve dist/
npm test             # vitest run (all tests, once)
npx vitest run src/core/schedule.test.ts   # single test file
npx vitest run -t "FF"                     # tests matching a name
npm run lint         # eslint . && tsc -b --noEmit
```

Opening `index.html` from disk does not work — it is only the Vite entry shell.

## Architecture

```
src/core/      pure TS: no DOM, no React, no implicit "now" (callers pass `today`)
src/settings/  per-browser view settings (localStorage) + React context
src/ui/        React components; grid/ and timeline/
src/styles/theme.css   all styling, incl. row-geometry CSS variables
```

- **`core/` is the brain and is fully unit-tested.** `model.ts` holds the types and the `Action` union (doc comments there are the behaviour contract). `reducer.ts` applies actions immutably and runs `schedule()` after every mutating action. UI code only dispatches actions — never mutate tasks or recompute dates in components.
- **Task model:** short keys kept from the URL format — `n` name, `s`/`e` start/finish (`YYYY-MM-DD`, finish inclusive), `c` palette index, `p` progress — plus a stable numeric `id` and `deps: Link[]` (`{ pred: id, type: FS|SS|FF|SF, lag }`). The row number shown in the grid is `index + 1` and is never stored; links always reference ids.
- **Project calendar** (`calendar.ts`, pure): `Project.calendar` is `"days"` or `"workdays"` (Mon–Fri). It maps dates to integer day indexes (`calendarOps(cal).startIdx/finishIdx/toIso`, O(1)); all duration/lag arithmetic happens on indexes, so the formulas are the same for both calendars. Invariant: in a working-day project every task starts and ends on a weekday — `schedule()` snaps manual tasks (start → next Monday, finish → previous Friday, never before start). Use `durationIn(task, cal)` / `calendarOps`, never raw `diffDays`, for durations. The calendar is project data (in the link), not a view setting; it is edited in the Settings dialog's Project section.
- **Scheduling** (`schedule.ts`, `schedule(tasks, cal)`): in the project calendar's days, as-soon-as-possible. A task with deps is auto-scheduled (start = latest candidate across its links, duration kept); a task without deps is manual. Full recompute via topological sort on every change — simple and fast enough for hundreds of tasks. `wouldCreateCycle` guards every link change.
- **Notation** (`notation.ts`): MS Project predecessor shortcuts. Parses German (EA/AA/EE/AE, T/Tage, W/Wochen) and English (FS/SS/FF/SF, d/days, w/weeks), `;` or `,` separated; formats in the language chosen in settings. Lags are in project days; a week is 7 days, or 5 in a working-day project (`parsePredecessors(..., cal)`). Row numbers ↔ ids are mapped here.
- **URL codec** (`urlCodec.ts`): writes v6 (`?d=` base64url JSON `{v:6,t,zf,cal?,n,groups:[{i,n,x?}],tasks:[{i,n,s,e,c,p,d?,g?}]}`, `cal: 1` = working days, `x: 1` = collapsed, `g` = group id), reads v6, v5, v4, v3, v2 and legacy v1 (v1–v4 are calendar-day projects, v1–v5 have no groups). Group ids share `nextId` with tasks; colliding/duplicate ids get fresh ones on decode. v1–v3 stored a zoom *preset index*, which is ignored (they open at Fit). Old shared links must keep working — add a new version rather than changing an existing one. Everything decoded is untrusted: sanitised, bad/cyclic links dropped, then scheduled.
- **Dates:** use `core/dates.ts` (local-time `parseDate`/`iso`/`addDays`/`diffDays`); never `new Date("YYYY-MM-DD")` (UTC shift).
- **Settings** (`settings/settings.ts`): notation, date format, density, visible columns, column widths, overlay toggles. Stored under `ganttly.settings.v1`, merged over defaults field-by-field, all storage access in try/catch. Never put settings in the share link. `columnWidths` holds only the columns the user resized (clamped to `COLUMN_DEFAULTS[col].min`..`MAX_COLUMN_WIDTH`); "Reset to defaults" clears them.
- **History:** every edit rewrites the URL with `history.replaceState`. Only *New* uses `pushState` (so Back restores the previous project); a `popstate` listener in `App.tsx` decodes the URL and dispatches `load`. Don't push history entries for ordinary edits.
- **Dialogs:** native `<dialog>` with the shared `.app-dialog` shell. Use `ConfirmDialog` (title, message, one or two actions + Cancel; Escape cancels, focus returns to the opener) instead of `window.confirm()`.
- **Zoom** is a factor relative to Fit (`Project.zoom`, ≥ 1, stored as `zf`). Day width is derived, never stored: `w = min(fitDayWidth(tasks, availPx, labelWidth, today) × zoom, MAX_DAY_PX)`. `fitDayWidth` (`timeline/geometry.ts`) solves for the largest w at which the padded span and every bar + label fit in a whole number of days. `timeline/useZoom.ts` owns the ribbon controls' state, Ctrl/⌘ +/−/0, Ctrl/⌘+wheel, and the scroll anchor (the date under the pointer or at the centre stays put). The stored factor is clamped only when used, so a narrower window doesn't destroy it.
- **Timescale** (`timeline/timescale.ts`, pure): `buildTimescale` picks the header tiers by w (≥20 days, 12–20 Mondays/1st, 3.5–12 ISO weeks, 0.8–3.5 years/months, <0.8 years/quarters), drops labels that don't fit their cell, and returns gridline x positions. Weekends are shaded (one rect per weekend) only for w ≥ 3.5. Header cells are absolutely positioned per unit; gridlines are one SVG path — never render one DOM node per day for the body.
- **Layout:** `.workspace` is the single scroll container; the grid pane is `position: sticky; left: 0`, both headers `sticky; top: 0`. Don't add a second scroller or JS scroll sync. Drag-to-pan (`ui/useDragPan.ts`) only changes `.workspace` scrollLeft/scrollTop: left-drag pans only inside `.timeline-pane` (never from inputs/buttons/handles or the grid), middle-drag anywhere, touch is left to native scrolling; a press under 4px stays a click.
- **Row alignment:** grid `.row` / timeline `.lane` use `--row-h`; an expanded `.detail` strip and its `.lane.spacer` use `--detail-h`; headers use `--header-h` (density and breakpoints change these in CSS). Lanes are in normal flow, so alignment is structural. Arrows can't use flow layout, so they compute lane tops from the same variables via `useRowMetrics()` + `laneTops()`; bars, labels and arrows share `barBox()`/`dayToX()` from `timeline/geometry.ts`.
- **Groups** (`core/groups.ts`): `Project.groups` (one level, in order) and `Task.g`. **Order invariant:** `tasks` is always ungrouped tasks, then each group's tasks in group order — `normalizeOrder()` (a stable partition) runs after every reducer action, so array order = display order and the row number stays `index + 1` (notation and scheduling don't know about groups). **`displayRows(project, expanded)` is the single row source** for grid, timeline lanes, arrows (links to tasks hidden by a collapsed group are skipped), drop slots and `rowTops()`; never iterate `tasks` to render rows. Header roll-ups come from `rollup(tasks, cal)`; moves across headers from `moveTarget`, drops from `taskDropTarget`/`groupDropIndex`. Fit/range use `Span`s (tasks + group summaries) so group labels fit.
- **Reordering:** order lives only in the `tasks` array, so moving is one primitive, `moveTask { id, toIndex }` (clamped; same object when nothing changes). Links reference ids, so they follow the task and only the displayed row numbers change. Row drag is `grid/useRowDrag.ts`: pointer events with capture on the ID-cell grip (not HTML5 drag-and-drop — no touch support, ghost image, can't auto-scroll our container); the slot comes from `laneTops()` midpoints (`slotAt`), the dragged row is only dimmed and a `.drop-line` is drawn in grid and timeline, rAF auto-scroll within 40px of the edges, Escape/pointercancel abort. Alt+↑/↓ on a row or detail strip moves it; `TaskGrid` restores focus to the same control after the move.
- **Dependency arrows:** one SVG overlay; routing in `timeline/arrows.ts` (pure, tested). Two overlays are rendered — `.screen-only` (with spacer lanes) and `.print-only` (without, since print hides detail strips).
- **Grid columns:** widths come from `grid/columns.ts` (`gridColumnVars(cols, widths)`), which emits `--cols-*`/`--grid-w-*` CSS variables for the visible columns; screen widths honour the user's overrides, print widths are fixed. Header and body cells carry `data-col`. `grid/ColumnResizer.tsx` is the header drag handle: during a drag it only overrides the pane's CSS variables and commits to settings on pointerup; double-click auto-fits by measuring `[data-col]` cells. The <980px breakpoint overrides the columns in CSS to ID/toggle/name (no resize handles), and the detail strip's `.narrow-only` fields take over. Text cells use ellipsis plus a `title` tooltip — never let content overflow a cell.
- **Palette:** `PALETTE` in `core/model.ts` is the single source (index = `c` in links; keep order stable).
