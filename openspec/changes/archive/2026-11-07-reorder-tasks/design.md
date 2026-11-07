# Design

## Context

Tasks are an ordered array in `Project.tasks`. The row number is `index + 1`, links reference stable IDs, and the codec writes tasks in array order. So reordering is purely an array move, and predecessor display and scheduling stay correct by construction. Grid rows and lanes are rendered in the same order with shared row metrics. `laneTops()` already gives each row's y position, including open detail strips.

See `proposal.md` and `specs/`.

## Goals / Non-Goals

**Goals:** reordering that works the same with mouse, touch and keyboard; no flicker or misalignment while dragging; a single reducer primitive that phase 4 can reuse for moving between groups.

**Non-Goals:**
- Multi-select moves.
- Dragging bars in the timeline (that would change dates, not order).
- Drag to reorder columns.
- Sorting by column ("sort by start date"). That could be a later command built on `moveTask`.

## Decisions

### 1. One primitive: `moveTask { id, toIndex }`
The reducer removes the task and inserts it at `toIndex`, clamped to `[0, n−1]`. It's a no-op when the index doesn't change. No `schedule()` call is needed because dates don't depend on order, but the reducer stays uniform and runs it anyway (cheap). Up and down moves are `toIndex = index ± 1`. Phase 4 will extend the action with a group target instead of adding a new one.

### 2. Pointer-based drag, not HTML5 drag-and-drop
HTML5 DnD doesn't fire for touch, renders a ghost image we can't align, and can't auto-scroll our own scroll container reliably. The `useRowDrag` hook does the following instead:
- **Start:** `pointerdown` on the grip, then `setPointerCapture`. The grip has `touch-action: none` so touch dragging doesn't scroll the page.
- **Move:** compute `y` in workspace content coordinates (`clientY − workspaceTop + scrollTop − headerH`). The target slot is the first row whose midpoint (from `laneTops`) is below `y`, giving 0..n. State `{ dragId, slot }` drives the following:
  - a 2px accent drop line, rendered once in the grid body and once in the timeline body at `laneTops[slot]`;
  - the dragged row styled with reduced opacity. The row is not moved, so nothing reflows mid-drag.
- **Auto-scroll:** a `requestAnimationFrame` loop while the pointer is within 40px of the workspace's top or bottom edge. The speed is proportional to the depth into the zone, up to 18px per frame.
- **Drop:** dispatch `moveTask` with `toIndex = slot > fromIndex ? slot − 1 : slot`.
- **Escape or `pointercancel`:** reset without dispatching.

### 3. Keyboard and focus
- A `keydown` handler on each `.row` and `.detail` catches Alt+ArrowUp/Down, calls `preventDefault`, and dispatches.
- Focus restoration works the same way as add-task: `focusAfterMove = { id, selector }`, where the selector is the `data-col` or class of the element that had focus. A `useEffect` on `tasks` refocuses the same control in the moved row.
- Since row keys are task IDs, React moves the DOM node rather than recreating it, and focus usually survives on its own. The effect is a fallback.
- Detail-strip buttons get `aria-label="Move task up"`/`"Move task down"`, and are disabled at the edges.

## Risks / Trade-offs

- [Alt+↑/↓ conflicts with OS or browser shortcuts] → none on macOS or Windows for text inputs (Alt+↑ is not "go up a directory" in browsers). Only handled with focus inside a row.
- [Touch long-press on the grip may trigger text selection or the context menu] → the grip gets `user-select: none` and `-webkit-touch-callout: none`, and the drag starts on `pointerdown` without a delay.
- [Drop line computed from `laneTops` drifts if metrics are stale] → `useRowMetrics` already re-reads on resize and density change. The drag reads the metrics at `pointerdown`.
