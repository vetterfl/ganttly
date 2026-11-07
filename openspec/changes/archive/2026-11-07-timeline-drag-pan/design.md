# Design

## Context

`.workspace` is the only scroll container. The grid pane is `position: sticky; left: 0`, and both headers are sticky at the top, so changing `scrollLeft`/`scrollTop` of `.workspace` moves everything consistently. `useZoom` already attaches a non-passive `wheel` listener to `.workspace`. The only pointer-driven widget is `ColumnResizer` in the grid header. Phase 3 (`reorder-tasks`) will add a drag grip in the grid's ID cell.

## Goals / Non-Goals

**Goals:** a native-feeling grab-and-drag pan in both axes, with no interference with clicks, editing, column resizing or the later reorder drag.

**Non-Goals:**
- Kinetic or inertial scrolling after release.
- Dragging bars to change dates.
- Custom touch handling (native touch scrolling already pans).
- Keyboard panning.

## Decisions

### 1. One hook on `.workspace`: `useDragPan(workspaceRef)`

The hook listens for `pointerdown` on the workspace. It starts a *pending* pan when one of these holds:
- **Middle button** (`button === 1`) anywhere in the workspace.
- **Left button** (`button === 0`) when the target is inside `.timeline-pane` and not inside an interactive element (`input, button, select, textarea, a, [role=separator], [contenteditable]`).

`pointerType === "touch"` never starts a pan.

A pure helper `panStartAllowed(target, button, pointerType)` makes this decision so it can be unit-tested in jsdom.

- **Alternative:** a handler on `.timeline-pane` only. Rejected: middle-drag should also work over the grid, and one listener keeps the logic in a single place.

### 2. Threshold, capture and scrolling

- **Threshold:** once the pointer has moved at least 4px (Euclidean) from where it was pressed, the pan becomes active.
- **On activation:**
  - `setPointerCapture`, so the pan continues outside the window edge.
  - The workspace gets class `panning`, which sets `cursor: grabbing` and `user-select: none`.
- **While active:** each `pointermove` sets `scrollLeft = startLeft − dx` and `scrollTop = startTop − dy`. The browser clamps both to the scroll limits.
- **On `pointerup` / `pointercancel`:** the pan ends and the class is removed. If a pan was active, the next `click` event is swallowed in the capture phase so that releasing over a button doesn't activate it.
- **Below the threshold:** nothing is prevented, so clicks and tooltips are untouched.

### 3. Middle button: suppress autoscroll

Windows/Linux Chromium and Firefox start autoscroll on middle `mousedown`. The hook calls `preventDefault()` on `pointerdown` *and* on `mousedown` with `button === 1` inside the workspace. Firefox also needs `auxclick` to be prevented, so middle-clicking a link doesn't open a tab (there are no links today, but it's cheap insurance).

### 4. Cursor affordance

- `.tl-body` and `.timescale` get `cursor: grab`.
- `.workspace.panning *` gets `cursor: grabbing !important`.
- Bars keep their `title` tooltip.

## Risks / Trade-offs

- [Left-drag on bars now pans; a future "drag bar to reschedule" feature would need a different gesture or a modifier] → this is acceptable: there is no bar dragging today, and the spec says so explicitly.
- [Swallowing the click after a pan could eat a legitimate click] → it only happens after the 4px threshold was crossed in the same press.
- [Phase 3's reorder grip uses left-drag in the grid] → no conflict, since left-drag pans only in the timeline. A middle-drag on the grip pans, which is fine.

## Migration Plan

None. This is purely additive UI behaviour, with no data or link changes.
