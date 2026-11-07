# Tasks

## 1. New project

- [x] 1.1 Add `{ type: "newProject" }` to `Action` in `src/core/model.ts` and handle it in `src/core/reducer.ts` (empty "Untitled Project", default zoom, `nextId: 1`). Verify with reducer tests that it returns an empty project and that the result round-trips through `encodeProject`/`decodeProject`.
- [x] 1.2 Create `src/ui/ConfirmDialog.tsx`: native `<dialog>` with title, message, one or two action buttons and Cancel; Escape cancels and focus returns to the opener. Reuse the settings dialog CSS. Verify with a Testing Library test covering confirm, cancel and Escape.
- [x] 1.3 Add the New button (File group, before Print) in `App.tsx`. Ask for confirmation only when tasks exist, then `history.pushState` the new URL, dispatch `newProject` and clear expanded rows. Add a `popstate` listener that loads the decoded URL. Verify with tests for confirm (empty grid, URL title "Untitled Project"), cancel (URL unchanged) and the empty project (no dialog), and in a browser that Back restores the previous project with its links.

## 2. Resizable columns and overflow-free cells

- [x] 2.1 Add `columnWidths` to `Settings`: merge and clamp in `mergeSettings`, export a `COLUMN_DEFAULTS` table (default and min per column, Duration default 88). Extend `settings.test.ts` with tests for invalid widths being dropped, clamping to the minimum, and Reset clearing widths.
- [x] 2.2 Make `gridColumnVars(cols, widths)` in `src/ui/grid/columns.ts` use the overrides for screen widths, keeping the print widths. Add `data-col` attributes to header and body cells. Unit-test that the emitted `--cols-wide` and `--grid-w-wide` reflect the overrides.
- [x] 2.3 Add a resize handle component on each resizable header cell: pointer drag with a live CSS-variable override and a commit on pointerup; double-click auto-fit by measuring `[data-col]` cells; keyboard ←/→ ±8px and Home to reset; `role="separator"` with `aria-valuenow`. Verify with Testing Library tests for the keyboard resize (→ ×3 adds 24px, the minimum is respected) and in a browser by dragging Task Name +80px (grid pane +80px, timeline aligned) and double-clicking to auto-fit.
- [x] 2.4 Make cells overflow-free: ellipsis on text cells, `title` on name and predecessor inputs, Duration as a flex input plus suffix with a container-query fallback. Verify in a browser that Duration `100` and `9999` show in full at the default width with no overlap, and that a long name ends in an ellipsis with a tooltip.

## 3. Docs and integration

- [x] 3.1 Update `README.md` (New command, resizable columns) and `CLAUDE.md` (pushState only for New, plus the popstate loader; column widths in settings; `ConfirmDialog`). Run `npm run lint`, `npm test` and `npm run build`, then confirm in a browser at 1440px and 390px that nothing else changed. Check that resize handles are absent below 980px.
