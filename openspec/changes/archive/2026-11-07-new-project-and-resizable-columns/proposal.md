# Proposal

**Phase 1 of 4.** This phase comes first; the others follow in order: `adaptive-timeline-zoom`, then `reorder-tasks`, then `task-groups`. Archive each phase before applying the next.

## Why

There is no way to start a fresh plan. Today you have to delete every task one by one, or edit the URL. The grid's column widths are also fixed, so wider values overflow their cells: a Duration of `100` already collides with the "days" suffix. Long task names are cut off, and nothing can be made wider.

Both are small, independent fixes. Grouping (phase 4) will add a column-like group name and roll-up values to the grid, so resizable columns should be in place first.

## What Changes

- **New command** in the ribbon's File group, before Print. It replaces the current project with an empty "Untitled Project".
  - If the project has tasks, it asks for confirmation first.
  - The previous project stays reachable with the browser's Back button.
- **Resizable columns.**
  - Every grid column except ID and the expand toggle has a drag handle on its header's right edge. Each column has a minimum width.
  - Double-clicking a handle auto-fits the column to its widest content.
  - Handles are keyboard-operable: focus the handle and press ←/→.
- **No cell overflow.**
  - Values that don't fit are cut off with an ellipsis, and the full value shows in a tooltip.
  - The Duration column's default width fits up to `9999 days`.
- **Column widths are view settings.** They are stored per browser, are not part of the share link, and are restored by *Reset to defaults*.
- **Spec housekeeping:** two older `task-grid` requirements are brought in line with auto-scheduling and the column settings.
  - "Task grid columns" now covers the optional columns and Predecessors.
  - "Inline editing of name and dates" now notes that Start is read-only for auto-scheduled tasks.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `workspace-layout`: the Command ribbon's File group gains *New*, and a new requirement covers the New project command.
- `task-grid`: column-list and inline-editing requirements updated (housekeeping); new requirements for resizable columns and overflow-free cells.
- `view-settings`: new requirement for per-browser column widths, which are reset by *Reset to defaults*.

## Impact

- `src/core/model.ts` and `src/core/reducer.ts`: new `newProject` action.
- `src/ui/App.tsx`: New button, confirm dialog, and history push/popstate handling.
- `src/settings/settings.ts`: a `columnWidths` field, merged and validated like the other fields.
- `src/ui/grid/columns.ts`, `src/ui/grid/TaskGrid.tsx` and `src/styles/theme.css`: width overrides, resize handles and ellipsis cells.
- New small `ConfirmDialog` component, which phase 4 reuses for deleting groups.
- The share-link format is unchanged.
- README and CLAUDE.md need small updates.
