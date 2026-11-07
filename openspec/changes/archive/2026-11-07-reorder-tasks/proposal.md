# Proposal

**Phase 3 of 4.** Apply after `working-day-scheduling` is archived (queue: `timeline-drag-pan`, `working-day-scheduling`, then this). Phase 4 (`task-groups`) extends this phase's reordering to move tasks between groups.

## Why

New tasks are always appended at the bottom, and there is no way to change the order. Plans read top to bottom, so a task added late (say, "Legal review") can't be placed where it belongs. Phase 4 groups tasks by position, so moving rows is a prerequisite for grouping.

## What Changes

- **Move up / Move down** buttons in a task's detail strip.
- **Keyboard:** Alt+↑ / Alt+↓ moves the task whose row has focus. Focus stays with the moved task.
- **Drag and drop:** a grip in the ID cell lets the user drag a row to a new position with mouse or touch. A drop indicator shows the target slot, and the workspace auto-scrolls near its top and bottom edges. Escape cancels the drag.
- Rows are renumbered after a move. Predecessor links keep pointing to the same tasks (cells show the new row numbers). Dates and scheduling are unaffected. The new order is saved in the share link, which already stores tasks in order.
- Open detail strips stay with their task.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `task-grid`: new requirements for moving tasks with buttons and keyboard, and for drag-and-drop reordering.

## Impact

- `src/core/model.ts` and `src/core/reducer.ts`: a new `moveTask` action.
- `src/ui/grid/TaskGrid.tsx`: move buttons, the Alt+arrow handler, the drag grip, and the drop indicator.
- A new `src/ui/grid/useRowDrag.ts` hook (pointer-based dragging, target index from row geometry, auto-scroll).
- CSS for the grip, the dragged row, and the drop line.
- The share-link format is unchanged, since order is already encoded.
- Docs need updating.
