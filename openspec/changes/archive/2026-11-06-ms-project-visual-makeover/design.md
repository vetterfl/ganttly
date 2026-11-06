# Design

## Context

Everything lives in `index.html` (inline CSS and an IIFE script, with no build step or dependencies). The state is `{ title, tasks[{n,s,e,c,p}] }` plus `zoomIdx`, and it is serialised to the URL on every edit. The current UI has three parts:

- `renderEditor()` builds a 340px column of tall cards. It is rebuilt only when needed, to keep input focus.
- `renderChart()` rebuilds the whole timeline with `innerHTML` on every edit.
- The page is a `<main>` CSS grid capped at `max-width: 1600px`.

The 46px row height is duplicated in CSS and JS, and the colours are duplicated in the `COLORS` array and the CSS `--c0..--c7` variables.

This change replaces the presentation layer and keeps state, the URL format and the date helpers. See `proposal.md` for the motivation and `specs/` for the required behaviour.

## Goals / Non-Goals

**Goals:**
- A single workspace in which grid rows and timeline lanes can never drift apart.
- Typing in the grid never loses focus or caret position.
- One source of truth for row height and the palette.

**Non-Goals:**
- No resizable or draggable splitter between grid and timeline, so the grid has a fixed width.
- No drag-to-edit on bars, dependencies, milestones, summary tasks or row reordering.
- No dark mode and no change to the URL/share format (`v` stays 2).
- Expanded or collapsed state is not persisted (in the URL or in localStorage).

## Decisions

### 1. One scroll container with a sticky grid pane, not two synced scrollers

```
+------------------------------- .workspace (overflow:auto) ------------------------+
| +-- .grid-pane (sticky left:0) --+-- .timeline-pane --------------------------->  |
| | header (sticky top:0)          | timescale (sticky top:0)                        |
| +--------------------------------+-------------------------------------------------+
| | 1 > Research   5d ...          | ==========                                      |
| | 2 v Wireframes 4d ...          |      ======                                     |
| |   [detail strip]               |      (empty spacer lane, same height)           |
| | 3 > Visual     6d ...          |          ======                                 |
| +--------------------------------+-------------------------------------------------+
+-----------------------------------------------------------------------------------+
```

The workspace is a single `overflow:auto` element sized to the viewport below the ribbon (`height: calc(100vh - ribbon)`). Inside it, a flex row holds the grid pane (`position: sticky; left: 0; z-index` above the bars) and the timeline pane (width = days × px-per-day). Both header rows use `position: sticky; top: 0`, and the top-left corner cell is sticky on both axes.

- **Why:** vertical scrolling is shared by construction, so no JS scroll syncing is needed and nothing jitters. Horizontal scrolling moves only the timeline because the grid sticks.
- **Alternative:** two scroll containers synced with `scroll` listeners. This is what most Gantt libraries do, but it lags by a frame and needs scrollbar compensation. Rejected.

### 2. Row geometry from shared CSS custom properties

`--row-h` (collapsed row, ~32px for Project-like density), `--detail-h` (expanded strip) and `--header-h` (two-tier header, the same in both panes) are defined on `:root`. JS reads them once with `getComputedStyle` to place the today marker and the bars. Lanes are real flow elements, not absolutely positioned rows: each task gives one `.lane` (height `--row-h`), plus a `.lane.spacer` (height `--detail-h`) when expanded. The grid emits `.row` and `.detail` with the same heights. Alignment then follows from both columns being made of the same sequence of fixed heights.

- **Why:** this removes the duplicated `46` constant and makes the "expanded alignment" scenario hold by construction.
- **Alternative:** measuring grid row offsets and positioning bars absolutely. That is fragile with fonts and zoom. Rejected.

### 3. Rendering split: build the grid rarely, patch it in place, rebuild the timeline freely

- `renderGrid()` rebuilds the grid's DOM only on structural changes: load, add, delete, expand/collapse, and debounced date normalisation (the current `renderEditorSoon` pattern).
- Cell edits update `state`, then call `update()` (URL + `renderTimeline()` + document title). Derived cells in the *same* row (Duration when a date changes, Finish when Duration changes, % Complete when the slider moves) are patched in place by updating their `.value`/`textContent`, never by re-rendering. This fixes today's stale "N days" label.
- `renderTimeline()` stays a full `innerHTML` rebuild because it holds no focusable inputs.
- Expanded state is a `Set` of task *object references* (not indexes), so deleting a row doesn't shift expansion onto its neighbour. References are dropped when tasks are deleted.

### 4. Duration input semantics

Duration is a `type=number` (min 1) input. On `input`, a valid integer ≥ 1 sets `e = iso(addDays(parseDate(s), d-1))`. Invalid values are ignored while typing, and on `blur` the field is reset to the actual duration. Start and Finish keep their current clamping rules (moving one past the other drags the other along).

### 5. Palette: same 8 slots, bolder values, one definition

The new `COLORS` keep the same hue order so old links look like "the same colour, but bolder":

| idx | was (hue) | new        |
|-----|-----------|------------|
| 0   | blue      | `#1f5fd1`  |
| 1   | teal      | `#00897b`  |
| 2   | amber     | `#b26a00`  |
| 3   | pink      | `#c2185b`  |
| 4   | violet    | `#6a1b9a`  |
| 5   | sky       | `#0277bd`  |
| 6   | orange    | `#d84315`  |
| 7   | slate     | `#455a64`  |

All values aim for ≥ 3:1 contrast on white, which the implementation checks with a small script. `COLORS` in JS becomes the single source: the unused CSS `--c0..--c7` variables are deleted. The progress strip is `rgba(0,0,0,.28)` over the bar colour (darker, as in Project), not today's lighter overlay. The UI chrome uses an Office-like accent blue (`#185abd`) for the ribbon, the selection and focus.

### 6. Ribbon and typography

The single sticky `<header>` becomes two bands: a solid accent-blue **title bar** (logo, project title input in white-on-blue) and a light-grey **ribbon** containing `<div class="ribbon-group">` elements. Each group has its buttons on top and a small caption below ("Task", "Share", "View", "File"), as in Office. Fonts use `"Segoe UI", system-ui, …` at 13px for the grid, with tighter padding and square-ish 2–4px radii instead of 14px. The soft shadows are removed.

### 7. Bars

Bars are ~60% of `--row-h` tall with a 3px radius and a 1px darker border (`color-mix` or a precomputed shade). The name label is a sibling span placed at `left + width + 6px`, which is always outside the bar, as in Project. This removes today's `short` branching.

### 8. Narrow screens and print

- **Below 980px:** CSS hides the Duration, Start, Finish and % columns and narrows the grid to ID + toggle + name (~180px). The detail strip has Start, Finish and Duration inputs that are shown only in this breakpoint (always rendered, CSS-toggled), so there's no JS breakpoint logic.
- **Print:** hide the ribbon, toggles, `.detail` rows and spacer lanes. Remove sticky positioning and overflow. Show grid inputs as plain text via `@media print` styles on inputs (no borders or backgrounds). Print the page landscape. Very wide timelines may still be clipped (see Risks).

## Risks / Trade-offs

- [Sticky-inside-overflow quirks: Safari has had z-index/sticky bugs with nested sticky axes] → keep only one level of sticky per axis and test in Safari and Chrome.
- [`getComputedStyle` reads of `--row-h` returning strings like `" 32px"`] → parse with `parseFloat`, and fall back to constants if NaN.
- [The new palette changes how existing shared charts look] → this is intended by the request. The hue order is kept so the meaning ("the blue tasks") survives.
- [Expanded rows make the timeline show blank lanes] → this matches Project's behaviour for inserted detail. The spacer lanes keep the weekend shading so they don't look broken.
- [Wide timelines are clipped when printed] → existing limitation, not addressed here. Users can pick the Compact zoom before printing.
- [Full rewrite of the CSS/render code in a single file risks regressions in URL handling] → leave `encodeState`/`decodeState`/`sanitizeTask` byte-for-byte unchanged and check v1 and v2 links manually after the change.

## Migration Plan

This is a static file with no data migration. Existing v1 and v2 links load unchanged. Rollback is reverting `index.html`.
