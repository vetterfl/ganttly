# Tasks

Prerequisite: `timeline-drag-pan` and `working-day-scheduling` are applied and archived.

## 1. Core

- [ ] 1.1 Add `{ type: "moveTask"; id; toIndex }` to `Action` and implement it in `reducer.ts`: clamp the index, return a no-op when unchanged, keep the IDs and deps. Write reducer tests for move down, move up, clamping at both ends, the no-op returning the same object, and the spec scenario (task 5 has predecessor `2`; after moving task 2 to position 4, `formatPredecessors` shows `4` and the dates are unchanged).

## 2. Buttons and keyboard

- [ ] 2.1 Add Move up and Move down buttons to the detail strip (disabled at the edges) and an Alt+↑/↓ handler on rows and detail strips, with focus restored to the same control in the moved row. Write Testing Library tests: Alt+↓ in row 2's name moves it to row 3 with focus kept; the buttons are disabled at the edges; an open detail strip stays with its task; the URL order changes.

## 3. Drag and drop

- [ ] 3.1 Implement `src/ui/grid/useRowDrag.ts` per design §2: pointer capture, slot from `laneTops`, drop line in grid and timeline, dimmed source row, rAF auto-scroll within 40px of the edges, Escape/pointercancel cancel. Add the grip to the ID cell with `touch-action: none`. Unit-test the pure slot calculation (midpoint rule, expanded rows, first and last slot). Verify in a browser with Playwright mouse drag: row 6 dropped between rows 1 and 2 becomes row 2; Escape mid-drag leaves the order unchanged; with 40 tasks, holding near the bottom edge scrolls; bars, arrows and grid rows stay aligned after the drop (≤1px).
- [ ] 3.2 Verify touch dragging in WebKit with touch emulation (`hasTouch`, dispatched pointer events): the drag starts from the grip without scrolling the page, and a drop reorders the tasks.

## 4. Docs and integration

- [ ] 4.1 Update `README.md` (reordering: buttons, Alt+↑/↓, drag) and `CLAUDE.md` (`moveTask` primitive, pointer-based drag hook, why not HTML5 DnD). Run lint, tests and build.
