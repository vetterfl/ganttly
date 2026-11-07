# Proposal

**Queue:** apply and archive this change first, then `working-day-scheduling`, then `reorder-tasks` (phase 3) and `task-groups` (phase 4). It is independent of the others; it only adds a requirement.

## Why

Since zoom became fit-relative, zooming in on a long plan gives a timeline far wider than the screen. Today the only ways to move around are the scrollbars, the touchpad or Shift+wheel. Project tools let you grab the chart and drag it, which is the natural way to move in a 2-D plan.

## What Changes

- **Left-button drag in the timeline pans the view.** It works on the timescale, empty lanes and bars, both horizontally and vertically. Vertical panning scrolls the grid along, since they share one scroll area.
- **Middle-button drag pans anywhere in the workspace**, including over the grid, and replaces the browser's autoscroll there.
- A press that moves less than 4px is still a normal click: tooltips, focus and grid editing behave exactly as before.
- **Cursor:** the timeline shows a grab cursor while idle and a grabbing cursor while panning.
- **Unchanged:**
  - Touch already scrolls natively.
  - Left-drag in the grid keeps selecting text in cells.
  - Ctrl/⌘ + wheel still zooms.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `workspace-layout`: new requirement "Drag to pan", next to the existing shared-scrolling behaviour.

## Impact

- New hook `src/ui/useDragPan.ts`, wired to `.workspace` in `App.tsx`. CSS cursors go in `theme.css`.
- No model, codec or settings changes. Share links are unaffected.
- README gets one line under features.
