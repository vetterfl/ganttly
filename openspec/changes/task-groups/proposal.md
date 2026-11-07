# Proposal

**Phase 4 of 4.** Apply after `reorder-tasks` is archived (queue: `timeline-drag-pan`, `working-day-scheduling`, `reorder-tasks`, then this). This phase builds on all earlier phases: it reuses Phase 1's `ConfirmDialog`, extends the link format (v5 → v6) and Phase 2's ribbon, uses the project calendar for roll-up durations, and builds on Phase 3's `moveTask`.

## Why

Real plans are organised by who does the work: one section per company or team. A flat list mixes everyone's tasks and gives no overview of when each party is busy. MS Project solves this with summary rows. Ganttly needs a lightweight version: named section headers that collect tasks, show their overall span, and collapse.

## What Changes

- **Groups:** named section headers, for example one per company. Each task belongs to at most one group. Tasks without a group are listed first, without a header. Groups do not nest.
- **Group header row:**
  - It shows an editable name, a collapse chevron, and rolled-up **Start** (earliest), **Finish** (latest) and **Duration** (span from earliest start to latest finish, counted in the project's calendar).
  - It also shows **% Complete**, weighted by task duration.
  - Group rows are not numbered. Tasks are numbered 1..n across all groups, so predecessor numbers stay unambiguous.
- **Timeline summary bar** per group, in the MS Project bracket style spanning the group's start to finish, with the group's name beside it.
- **Collapse/expand** per group. Collapsing hides the group's tasks in both grid and timeline; the header and summary bar remain. Arrows to or from hidden tasks are hidden. The collapsed state is part of the share link.
- **Managing groups:**
  - *Add group* in the ribbon's Task group appends an empty group and focuses its name.
  - A "+" on each header adds a task to that group.
  - A *Group* selector in the task detail strip moves a task to another group.
  - Moving a task (Phase 3 buttons, Alt+↑/↓, drag) across a header moves it into the neighbouring group.
  - Groups can be moved up and down (with their tasks) and deleted. Deleting asks whether to delete the tasks too or keep them ungrouped.
- **Share link format v6** adds groups. v1–v5 links open as before, without groups.
- **Not included:** nesting, groups as predecessors, per-group colours and group-level dates. Groups have no dates of their own; everything is rolled up from their tasks.

## Capabilities

### New Capabilities
- `task-groups`: groups covering membership and display order, the header row and its roll-ups, collapsing, the summary bar, add/rename/move/delete, and moving tasks between groups.

### Modified Capabilities
- `workspace-layout`: the ribbon's Task group gains *Add group*.
- `share-links`: the URL holds groups, membership and collapsed state. The format moves to v6, and v5 links stay readable.
- `dependency-arrows`: arrows involving tasks in collapsed groups are hidden.

## Impact

- **Core logic:**
  - `src/core/model.ts`: `Group`, `Project.groups`, `Task.g`, and new actions.
  - `src/core/reducer.ts`: group actions, and order normalisation as an invariant.
  - New `src/core/groups.ts`: roll-ups and display rows.
  - `src/core/urlCodec.ts`: v6.
- **UI:**
  - `src/ui/grid/TaskGrid.tsx`: header rows and the group selector.
  - Timeline: summary bars, and lanes from display rows.
  - `DependencyArrows`: hide arrows for collapsed tasks.
  - `useRowDrag`: header-aware slots.
  - `App.tsx`: Add group, and the delete-group dialog.
- Docs need updating.
