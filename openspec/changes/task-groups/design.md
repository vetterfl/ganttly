# Design

## Context

After phases 1–3:
- `Project` is `{ title, zoom (factor), tasks[], nextId }`, and tasks are an ordered array.
- Row number = `index + 1`.
- `moveTask { id, toIndex }` reorders.
- `useRowDrag` computes drop slots from `laneTops`.
- The grid, timeline and arrows all iterate `tasks` directly and use `laneTops(tasks, expanded, …)`.
- Link format v4, and `ConfirmDialog` exists.

Groups introduce rows that are not tasks, plus hidden tasks, so "one row per task" no longer holds.

See `proposal.md` and `specs/`.

## Goals / Non-Goals

**Goals:**
- One derived list of display rows that the grid, timeline, arrows and drag all share, so alignment stays structural.
- Order and grouping can never disagree.
- Row numbers stay equal to `index + 1` in `tasks`, so the notation and scheduling code are untouched.

**Non-Goals:**
- Nesting.
- Groups as link endpoints.
- Group-level manual dates or constraints.
- Per-group colours.
- Sorting tasks within groups by date.
- Collapsing as a per-viewer setting: it lives in the document.

## Decisions

### 1. Data model: membership on the task, order as an invariant

```ts
interface Group { id: number; n: string; collapsed: boolean }
interface Task  { …; g?: number }               // group id, absent = ungrouped
interface Project { …; groups: Group[] }        // ids share nextId with tasks
```

**Invariant**, enforced by `normalizeOrder()` at the end of every reducer action: `tasks` is ordered as all ungrouped tasks, then the tasks of `groups[0]`, then `groups[1]`, and so on. Within each section the existing relative order is kept (a stable partition).

So the array order *is* the display order. `index + 1` is still the task number, `notation.ts` and `schedule.ts` need no changes, and phase 3's `moveTask` keeps working.

- **Alternative:** a flat row list with header entries interleaved in `tasks`. Rejected: it mixes kinds in an array the scheduler and notation iterate, and "membership by position" makes every edit able to silently regroup tasks.
- **Alternative:** a `tasks[]` array per group. Rejected: it breaks global numbering and the reducer and scheduler code that assumes one array.

### 2. Display rows: `displayRows(project, expandedTasks) → Row[]`

A pure function in the new `src/core/groups.ts`:

```ts
type Row =
  | { kind: "task"; task: Task; number: number; detail: boolean }
  | { kind: "group"; group: Group; rollup: Rollup | null }
```

Tasks of collapsed groups are omitted, but numbers still count them. `rollup(tasks)` computes min start, max finish, span duration, and the duration-weighted %, rounded.

The grid, timeline, arrows and drag all consume `rows`. `laneTops(rows, rowH, detailH)` replaces the task-based version: group rows are `rowH`, and tasks are `rowH` plus `detailH` when their detail strip is open. Arrows look up row indexes by task ID, and links with a missing endpoint (hidden task) are skipped.

### 3. Actions

- `addGroup` (name "New group", appended)
- `renameGroup` (truncated to 120)
- `toggleGroup` (collapsed)
- `moveGroup { id, toIndex }`
- `deleteGroup { id, withTasks: boolean }`
  - `withTasks: true` reuses the `deleteTask` link cleanup for each member.
  - `withTasks: false` clears `g`, and the normalisation moves those tasks to the end of the ungrouped section, keeping their relative order.
- `setTaskGroup { id, group: number | null }`: the task is placed at the end of the target section.
- `addTask` gains an optional `group?: number | null`. The ribbon passes the last group's ID, if any; a header's "+" passes its own.
- `moveTask { id, toIndex, group?: number | null }`: when `group` is given, it is assigned before the index move. The index is applied in the flattened order, then normalised.

**Up/down across headers:** the UI computes the target. If the task is first in its section and moves up, it gets the previous section's group and lands at that section's end. If it is last and moves down, it gets the next section's group and lands at the start.

### 4. UI

- **Header row** (`.row.group-row`, same `--row-h`):
  - **ID cell:** a drag grip for the group, with no number.
  - **Toggle cell:** a collapse chevron (`aria-expanded`). It replaces the detail toggle, since groups have no detail strip.
  - **Name cell:** a bold input.
  - **Roll-up cells:** read-only text in the Duration, Start, Finish and % columns.
  - **Predecessors column:** hosts the header's actions (+ add task, ↑, ↓, delete) as compact icon buttons. On narrow screens they move into a small overflow menu.
  - Tasks inside groups get `padding-left: 16px` on the name cell.
- **Summary bar:** an absolutely positioned bar in the header lane. It is 6px high, dark ink, with two 6px downward-pointing triangular caps drawn with CSS borders. The label is placed exactly like task labels (`LABEL_GAP`).
- **Delete:** if the group has tasks, `ConfirmDialog` offers "Delete group and N tasks" (destructive), "Keep tasks (ungroup)" and Cancel. An empty group is deleted straight away.
- **Drag:** slots are computed over display rows.
  - A task dropped directly below a header joins that group.
  - A task dropped between tasks joins their section.
  - A group grip drags the whole group; valid drop slots are only between groups (or after the ungrouped section), and the indicator snaps to those.
- **Detail strip:** a `<select>` with "(No group)" and the group names, dispatching `setTaskGroup`.
- **Fit (phase 2):** `fitDayWidth` also accounts for group summary labels.

### 5. Link format v5

The format is `{ v:5, t, zf, n, groups:[{ i, n, x?:1 }], tasks:[{ …, g? }] }`.

When decoding:
- Group IDs must be unique positive integers that don't collide with task IDs; otherwise a fresh ID is assigned.
- A task whose `g` doesn't match a group becomes ungrouped.
- `nextId` is at least max(all IDs) + 1.
- `normalizeOrder` runs before `schedule()`.
- v4 and older decode with `groups: []`.

A v5 link opened by the v4-era build falls back like before: tasks and links load, and groups are ignored.

## Risks / Trade-offs

- [Normalising on every action could move a task the user didn't touch] → the partition is stable, and only tasks whose `g` changed can change section. Tests assert that no other task moves.
- [Hidden tasks still affect scheduling and roll-ups while invisible] → intended (spec). The header's roll-up keeps the collapsed group's dates visible.
- [Actions in the Predecessors column disappear if that column is hidden in settings] → the header actions render in whichever is the last visible column. Unit-tested with columns toggled.
- [Large refactor of grid and timeline iteration onto `rows`] → it lands first, as a pure refactor with no groups (task group 2), behind the existing alignment, arrow and drag tests, before any group UI.
