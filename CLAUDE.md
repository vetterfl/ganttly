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
- **Scheduling** (`schedule.ts`): calendar days, as-soon-as-possible. A task with deps is auto-scheduled (start = latest candidate across its links, duration kept); a task without deps is manual. Full recompute via topological sort on every change — simple and fast enough for hundreds of tasks. `wouldCreateCycle` guards every link change.
- **Notation** (`notation.ts`): MS Project predecessor shortcuts. Parses German (EA/AA/EE/AE, T/Tage, W/Wochen) and English (FS/SS/FF/SF, d/days, w/weeks), `;` or `,` separated; formats in the language chosen in settings. Row numbers ↔ ids are mapped here.
- **URL codec** (`urlCodec.ts`): writes v3 (`?d=` base64url JSON `{v:3,t,z,n,tasks:[{i,n,s,e,c,p,d?}]}`), reads v3, v2 and legacy v1. Old shared links must keep working — add a new version rather than changing an existing one. Everything decoded is untrusted: sanitised, bad/cyclic links dropped, then scheduled.
- **Dates:** use `core/dates.ts` (local-time `parseDate`/`iso`/`addDays`/`diffDays`); never `new Date("YYYY-MM-DD")` (UTC shift).
- **Settings** (`settings/settings.ts`): notation, date format, density, visible columns, overlay toggles. Stored under `ganttly.settings.v1`, merged over defaults field-by-field, all storage access in try/catch. Never put settings in the share link.
- **Layout:** `.workspace` is the single scroll container; the grid pane is `position: sticky; left: 0`, both headers `sticky; top: 0`. Don't add a second scroller or JS scroll sync.
- **Row alignment:** grid `.row` / timeline `.lane` use `--row-h`; an expanded `.detail` strip and its `.lane.spacer` use `--detail-h`; headers use `--header-h` (density and breakpoints change these in CSS). Lanes are in normal flow, so alignment is structural. Arrows can't use flow layout, so they compute lane tops from the same variables via `useRowMetrics()` + `laneTops()`; bars, labels and arrows share `barBox()`/`dayToX()` from `timeline/geometry.ts`.
- **Dependency arrows:** one SVG overlay; routing in `timeline/arrows.ts` (pure, tested). Two overlays are rendered — `.screen-only` (with spacer lanes) and `.print-only` (without, since print hides detail strips).
- **Grid columns:** widths come from `grid/columns.ts`, which emits `--cols-*`/`--grid-w-*` CSS variables for the visible columns (screen and print); the <980px breakpoint overrides them in CSS to ID/toggle/name, and the detail strip's `.narrow-only` fields take over.
- **Palette:** `PALETTE` in `core/model.ts` is the single source (index = `c` in links; keep order stable).
