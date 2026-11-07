# Design

## Context

- The project state lives in a `useReducer` in `App.tsx`. Every change is written with `history.replaceState` (`?d=` v3), so no history entries are ever created today.
- The grid's column widths are hard-coded in `src/ui/grid/columns.ts`. It emits `--cols-wide`, `--grid-w-wide` and the print variants as inline CSS variables on `.grid-pane`. The <980px breakpoint overrides `--cols` in CSS.
- Duration is a number input followed by a fixed "days" span inside a 72px cell, which is why `100` collides with the suffix.
- Settings are a validated, field-by-field-merged object in localStorage (`ganttly.settings.v1`).

See `proposal.md` for motivation and `specs/` for behaviour.

## Goals / Non-Goals

**Goals:** a safe New that can be undone with Back; resize that feels native (pointer, touch and keyboard); grid cells that never overflow.

**Non-Goals:**
- Reordering or hiding columns by drag. Visibility stays in Settings.
- Resizing the timeline's day width. That is zoom, which phase 2 handles.
- An undo stack beyond the single Back step.
- Resizing on narrow screens (<980px). Those columns are fixed.

## Decisions

### 1. New = `newProject` action + `pushState`
The reducer gets `{ type: "newProject" }`, which returns `{ title: "Untitled Project", zoom: DEFAULT_ZOOM, tasks: [], nextId: 1 }`.

`App` handles New like this:
1. If there are tasks, it opens `ConfirmDialog`.
2. On confirm, it calls `history.pushState` with the *new* project's URL, then dispatches.
3. It clears `expanded`.

A `popstate` listener decodes `location.search` and dispatches `load`, so Back and Forward work. All other edits keep using `replaceState`, so typing doesn't flood the history.

- **Alternative:** native `window.confirm()`. Rejected: it can't be styled, it blocks the page, and phase 4 needs a dialog with two choices anyway.

`ConfirmDialog` is a small native `<dialog>` with a title, a message and up to two action buttons plus Cancel. It shares the CSS shell of `SettingsDialog`.

### 2. Column widths in settings, merged over defaults
`Settings.columnWidths: Partial<Record<ResizableCol, number>>` holds only the columns the user changed. `ResizableCol` is `name | duration | start | finish | pct | preds`. `mergeSettings` keeps entries that are finite numbers, clamped to [min, 800]. `columns.ts` becomes `gridColumnVars(cols, widths)`, with `width = widths[key] ?? DEFAULT[key]`. "Reset to defaults" already replaces the whole object, so widths reset for free.

| column | default | min |
|--------|---------|-----|
| name | 200 | 80 |
| duration | 88 | 64 |
| start | 104 | 80 |
| finish | 104 | 80 |
| pct | 82 | 56 |
| preds | 96 | 56 |

Duration grows from 72 to 88 so `9999 days` fits.

### 3. Resize interaction
Each resizable header cell renders a `<div role="separator" aria-orientation="vertical" tabIndex=0 aria-valuenow=…>` handle, 6px wide and absolutely positioned on the cell's right edge, with `cursor: col-resize`.

- **Pointer:** `pointerdown` captures the pointer with `setPointerCapture`, which also works for touch. During the drag, the width is applied *only* as a CSS variable override on the grid pane, using a ref. This avoids re-rendering every row on every move. On `pointerup`, the final width is committed to settings in one update.
- **Double-click:** measures the column's content via `scrollWidth` of the cells in that column (`[data-col=key]`) plus padding, and commits that width.
- **Keyboard:** ←/→ change the width by ±8px, Home resets the column to its default, and each key commits immediately.

The timeline's `availPx` already derives from the grid pane's measured width (`useElementWidth`), so the timeline re-fits automatically.

### 4. Overflow-free cells
- Text cells (`.date-text`, `.cell-pct`, computed start, and the name and predecessor inputs when not focused) get `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`. The grid cell wrappers already have `min-width: 0`.
- Inputs need no special handling: they scroll their own text internally.
- Name and Predecessors inputs show `title` with the full value.
- **Duration** becomes a flex row where the input is `flex: 1 1 auto; min-width: 3ch` and the "days" span is `flex: none`, so the suffix never overlaps the number. In columns too narrow for both, the suffix is hidden with a container query (`@container (max-width: 72px)`). The task-grid spec only requires 9999 days to fit at the default width.

## Risks / Trade-offs

- [`pushState` on New adds history entries, so a user who presses New repeatedly gets several Back steps] → that's acceptable and expected: Back walks through earlier projects.
- [Live drag updates through a CSS variable can drift from React's idea of the width] → React re-applies the variables from settings on commit, and the ref only ever overrides during an active drag.
- [Container queries in older browsers] → if they aren't supported, the suffix simply stays visible, and the number input still scrolls internally. The cell never overflows.
- [Phase 2 changes the zoom model] → `newProject` uses whatever "default zoom" means at the time. Phase 2 updates that single constant.
