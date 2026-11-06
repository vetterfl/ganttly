# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Ganttly is a single-file, dependency-free Gantt chart web app. Everything (HTML, CSS, JS) lives in `index.html`. There is no build step, package manager, linter, or test suite.

## Running

Open `index.html` directly in a browser, or serve the directory (e.g. `python3 -m http.server`) so `location.origin` produces a usable share link.

## Architecture

- **All state lives in the URL.** There is no backend or localStorage. `state = { title, tasks[] }` plus `zoomIdx` are serialized on every change via `syncURL()` → `history.replaceState`. The "Copy link" button copies that same URL.
- **URL format (v2):** `?d=<base64url(JSON {v:2, t, z, tasks})>`. `decodeState()` also reads a legacy v1 format (`?t=title&z=zoom&d=name|start|end|color|progress~...`). Keep v1 decoding working when changing serialization — old shared links depend on it. Any format change should bump `v` and keep older versions readable.
- **Task shape uses short keys** to keep URLs compact: `n` name, `s` start / `e` end (`YYYY-MM-DD`, end inclusive), `c` color index into `COLORS`, `p` progress 0–100. All decoded tasks pass through `sanitizeTask()`, which is the trust boundary for URL input.
- **Dates** are handled as local-time `Date` objects via `parseDate()` / `iso()` / `addDays()`; avoid `new Date("YYYY-MM-DD")` (parses as UTC and shifts days).
- **Layout (MS Project–style):** blue title bar + ribbon (Task / Share / View / File groups), then `#workspace`, the *single* scroll container. Inside it `.split` holds `#gridPane` (task table, `position: sticky; left: 0`) and `#timelinePane`. The grid header and `.timescale` are `sticky; top: 0`. Vertical scroll is shared by construction — don't introduce a second scroller or JS scroll syncing.
- **Row alignment is pure CSS:** grid `.row` and timeline `.lane` both use `--row-h`; an expanded `.detail` strip and its timeline `.lane.spacer` both use `--detail-h`; both headers use `--header-h`. Lanes are in normal flow (not absolutely positioned), so alignment holds as long as both panes emit the same sequence of heights. Breakpoints and print override these variables (and `--cols`/`--grid-w`), not JS.
- **Rendering** is string-built `innerHTML`:
  - `update()` = `syncURL()` + `renderTimeline()` + document/print title. Called on every edit; the timeline is always fully rebuilt (it has no inputs).
  - `renderGrid()` rebuilds the table only on structural changes (load, add, delete, expand/collapse). Cell edits go through one delegated `input` handler on `#gridBody` and `syncRow(i)` patches the row's other fields in place, skipping `document.activeElement`, so typing never loses focus. Invalid duration/empty dates snap back on `focusout`.
  - Expanded rows are a `Set` of task *object references* (UI-only, never in the URL), so deleting a row doesn't shift expansion to a neighbour.
  - User text must go through `escapeHtml()` / `escapeAttr()` when interpolated into templates.
- **Timeline range:** pixels-per-day from `ZOOMS[zoomIdx].w`; range = min/max task dates padded −2/+3 days, then extended right so bar labels (measured with a canvas) are never clipped and the timeline fills the visible width (re-rendered on window resize).
- **Colors:** `COLORS` in JS is the single palette source (8 bold colours, index = `c` in the URL, ≥3:1 contrast on white). Keep the index order stable — old links store indexes.
- **Narrow (<980px):** CSS hides Duration/Start/Finish/% columns; the detail strip's `.narrow-only` inputs (always rendered) carry those fields instead.
- **Print** uses `@media print`: hides title bar, ribbon, toggles, detail strips and spacer lanes, un-sticks panes, renders inputs as plain text, shows the `.print-only` title block, landscape.
