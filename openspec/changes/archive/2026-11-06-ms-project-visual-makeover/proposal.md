# Proposal

## Why

Ganttly looks like a pastel card-based web toy. Its task editor is a narrow column of tall cards that don't line up with the chart, and the chart stops at 1600px wide. People who plan in Microsoft Project expect a dense, table-plus-timeline workspace: one row per task, aligned with its bar, using the whole screen. A visual makeover makes Ganttly feel familiar and productive for that audience.

## What Changes

- Replace the card-based task editor with an **MS Project–style task grid** on the left (columns: ID, Task Name, Duration, Start, Finish, % Complete). Each grid row lines up with its bar in the timeline on the right.
- **Collapse per-task ("lane") options**: colour and the progress slider are hidden by default, and each row has an expand/collapse toggle that reveals a detail strip with those options plus Delete. When a row is expanded, the timeline grows the same lane so rows stay aligned.
- Make Duration editable in the grid. Changing it moves the task's finish date, keeping the start date.
- Restyle the timeline in a Project-like way: a two-tier timescale (months over days), crisp gridlines, weekend shading, a stronger "today" marker, and solid bars with a darker progress strip and the task name shown to the right of the bar.
- Switch to a **bold, saturated colour palette** for bars and accents. There are still 8 colours, so the existing colour indexes in shared links keep working and show the new colours.
- Replace the header with a Project-like **command ribbon** (app title bar plus grouped commands: Task → Add; Share → Copy link; View → Zoom; File → Print) and use denser, Office-like typography.
- Let the workspace use the **full page width** (remove the 1600px cap). The grid stays fixed on the left while the timeline scrolls horizontally, and both panes scroll vertically together.
- Print output shows the grid columns next to the timeline, without the interactive controls.
- No change to the URL/share format or saved data. All existing links stay valid.

## Capabilities

### New Capabilities
- `task-grid`: the tabular task editor: columns, inline editing, the expandable per-task detail row (colour, progress, delete), and adding tasks.
- `gantt-timeline`: the timeline view: timescale, gridlines, weekend and today markers, bar appearance and colour palette, zoom levels, and how lanes line up with grid rows.
- `workspace-layout`: the overall page shell: command ribbon, full-width split view, shared scrolling between grid and timeline, narrow-screen behaviour, and print layout.

### Modified Capabilities
<!-- none: no specs exist yet -->

## Impact

- `index.html`: almost all of the CSS and the editor/chart rendering code is rewritten. State, the URL serialisation (`encodeState`/`decodeState`/`sanitizeTask`) and the date helpers stay unchanged.
- `CLAUDE.md`: the architecture notes about the panel/editor, row height and colours need updating.
- No new dependencies, no backend, and no change to the share-link format.
