# Tasks

Prerequisite: `reorder-tasks` is applied and archived (and so are phases 1 and 2, `timeline-drag-pan` and `working-day-scheduling`).

## 1. Core model, roll-ups and order invariant

- [ ] 1.1 Add `Group`, `Project.groups` and `Task.g` to `src/core/model.ts` (the sample project gets `groups: []`). Create `src/core/groups.ts` with `normalizeOrder`, `rollup` and `displayRows`. Unit-test: stable partition (only regrouped tasks move); the roll-up spec example (11 days, 69%; 9 days in working days); an empty group roll-up of null; collapsed tasks omitted from rows but still counted in numbering; numbers skipping headers.
- [ ] 1.2 Add the reducer actions `addGroup`, `renameGroup`, `toggleGroup`, `moveGroup`, `deleteGroup{withTasks}` and `setTaskGroup`, extend `addTask`/`moveTask` with `group`, and run `normalizeOrder` after every action. Write reducer tests covering each `task-groups` spec scenario that has no UI dependency, including delete-with-tasks link cleanup (successors become manual with their dates kept) and delete-keep-tasks (tasks appended to the ungrouped section, links intact).
- [ ] 1.3 Implement link format v6 in `urlCodec.ts` per design §5. Tests: a v6 round-trip with a collapsed group in a working-day project; an unknown `g` becoming ungrouped; a group/task ID collision being reassigned; v5 decoding with no groups and its calendar and zoom kept; the existing v1–v4 tests still passing.

## 2. Refactor rendering onto display rows (no group UI yet)

- [ ] 2.1 Switch `TaskGrid`, `Timeline`, `DependencyArrows`, `laneTops` and `useRowDrag` from iterating `tasks` to `displayRows(...)`. Arrows skip links whose endpoint is not displayed. Verify that every existing unit and component test passes unchanged and that the browser alignment, arrow and drag checks still pass with no groups.

## 3. Group UI

- [ ] 3.1 Build the group header row (collapse chevron, bold name input, read-only roll-ups, actions in the last visible column, ID-cell grip), indent grouped task names, and add Add group to the ribbon's Task group. Testing Library tests: Add group focuses "New group"; renaming updates the URL; roll-ups show the spec example; collapse hides task rows and is in the URL; header actions follow when the Predecessors column is hidden.
- [ ] 3.2 Draw the summary bar in the header lane (bracket style, label beside it, none for empty groups) and include group labels in `fitDayWidth`. Verify in a browser that the bar spans the group's first to last day (±1px), that header lanes align with header rows (≤1px) collapsed and expanded, and that arrows to a collapsed group's tasks disappear and reappear.
- [ ] 3.3 Add the Group selector in the detail strip, up/down across headers, header-aware drag (tasks into groups, groups between groups) and the delete-group `ConfirmDialog`. Testing Library tests for the selector, Alt+↑ across a header, and both delete choices. Verify in a browser by dragging U below the "Globex" header and dragging a group above another.

## 4. Docs and integration

- [ ] 4.1 Update `README.md` (groups: creating, collapsing, roll-ups, moving tasks between groups) and `CLAUDE.md` (order invariant, `displayRows` as the single row source, v6 format). Run lint, tests and build. Verify in Chromium and WebKit at 1440px and 390px with a 3-company sample (one group collapsed), including print, which should show headers and summary bars with the collapsed group printed collapsed. Check that a v4 link from the live site opens unchanged.
