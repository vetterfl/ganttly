# Tasks

Prerequisite: `ms-project-visual-makeover` is implemented and committed in `index.html`.

## 1. Web app scaffold

- [ ] 1.1 Move the current `index.html` to `legacy/index.html`. Add `package.json` with the scripts `dev`, `build` (`tsc -b && vite build`), `preview`, `test` (`vitest run`) and `lint` (`eslint . && tsc -b --noEmit`), and add `vite.config.ts` (`base: "./"`, React plugin, Vitest jsdom env), strict `tsconfig.json`, `eslint.config.js` and a Vite `index.html` shell. Verify that `npm install && npm run build` succeeds and that `npm run dev` serves a placeholder page.
- [ ] 1.2 Add a `.gitignore` (`node_modules`, `dist`) and a trivial Vitest smoke test. Verify that `npm test` and `npm run lint` both exit 0.

## 2. Pure core (ported, no new behaviour yet)

- [ ] 2.1 Create `src/core/dates.ts` by porting `iso`/`parseDate`/`addDays` verbatim, and add `diffDays`. Write tests covering local-time parsing (no UTC shift) and month/year boundaries. Verify with `npx vitest run src/core/dates.test.ts`.
- [ ] 2.2 Create `src/core/model.ts` (`Task` with `id` and `deps`, `Link`, `Project`, `nextId` allocation) and `src/core/reducer.ts` with the makeover's actions (add, delete, rename, set dates with clamping, set duration, set colour/progress, set title, set zoom). Port the default sample project. Test each action, including that the add-task date rule is "day after latest finish, 5 days".
- [ ] 2.3 Create `src/core/urlCodec.ts` by porting `b64encode`/`b64decode`/`sanitizeTask` and v1/v2 decoding verbatim. Test that the spec's v1 example and a v2 payload produced by `legacy/index.html` decode to the expected projects, and that garbage input falls back to the sample.

## 3. React port of the makeover UI

- [ ] 3.1 Port the makeover CSS to `src/styles/theme.css` and build `App`, `TitleBar`, `Ribbon` (Task/Share/View/File groups), `Workspace` (sticky grid pane plus timeline pane) and `Toast`, wired to `useReducer` and URL sync (`history.replaceState` on every change). Verify side by side with `legacy/index.html` that the layout matches and that Copy link, Print and zoom (buttons + Ctrl/⌘ ±) work.
- [ ] 3.2 Build `TaskGrid`/`GridRow`/`DetailStrip` with task-id keys, expand state as a `Set<id>`, inline editing, Duration semantics and the < 980px column rules. Add Testing Library tests for: focus kept while typing a name, Finish < Start clamping, Duration 0 reverting on blur, and delete keeping the right row expanded.
- [ ] 3.3 Build `Timeline`/`Timescale`/`Bars` with geometry from a shared `useRowMetrics()` + `dayToX` (spacer lanes for expanded rows, weekend shading, today marker, label right of bar, tooltip). Verify by walking through the makeover's `gantt-timeline` and `workspace-layout` scenarios in the browser, including print preview.

## 4. Dependencies and scheduling core

- [ ] 4.1 Implement `src/core/schedule.ts` (topological sort, ASAP forward pass, `wouldCreateCycle`) and call it from the reducer after every mutating action. Add table tests for every `task-scheduling` scenario (FS+2d, FF−2, SS+1, SF, max of two links, chain push, pull earlier, last link removed → manual at current dates, SF before project start).
- [ ] 4.2 Implement `src/core/notation.ts` (`parsePredecessors` with row→id mapping and error kinds, `formatPredecessors` for de/en). Table-test every example from the `task-dependencies` spec (`3EE-2 Tage`, `3FF-2d`, `2aa+1W, 4`, `3FS+2`, empty, `3XY+2d`, unknown ID, self, cycle) plus the display examples `3;4EE-2T` / `3,4FF-2d`.
- [ ] 4.3 Add reducer actions `setPredecessors` and delete-with-link-cleanup (successors with no remaining links become manual at their current dates). Test renumbering after deletion (the former task 5's cell shows `3`) and the delete-predecessor scenario.
- [ ] 4.4 Extend `urlCodec` with v3 encode/decode (stable IDs, `nextId`, compact deps), dropping unknown, self and cyclic links on load and running `schedule()` after decoding. Test the v3 round-trip, that IDs survive deletion across reload, the tampered A↔B cycle loading with at most one link, and that v1/v2 still load without links.

## 5. Predecessors in the UI and arrows

- [ ] 5.1 Add `PredecessorCell` (draft state, commit on Enter/blur, Escape reverts, `aria-invalid` + error popover) as the grid column after % Complete and in the narrow-screen detail strip. Render Start as read-only computed text for auto-scheduled tasks. Add Testing Library tests for: entering `2EE-2T` in row 4 reschedules it, Escape reverts, a cycle error leaves the links unchanged, and Start is not editable when links exist.
- [ ] 5.2 Implement `DependencyArrows` (single SVG overlay, shared marker, anchors per link type, forward/backward elbow routing from computed lane geometry). Add unit tests for the path builder (FS forward, FF, backward SS with negative lag). Verify in the browser that arrows stay attached through zoom changes, row expand/collapse and rescheduling, and that they appear in print preview.

## 6. View settings

- [ ] 6.1 Implement `src/settings/settings.ts` (type, defaults, load-merge-save under `ganttly.settings.v1`, storage errors swallowed) and `SettingsContext`. Test that defaults load on first visit, that unknown or missing keys merge over defaults, and that a throwing `localStorage` falls back to defaults.
- [ ] 6.2 Build `SettingsDialog` (native `<dialog>`, live apply, Close/Escape/backdrop, focus return, Reset to defaults) and a Settings command in the ribbon View group. Wire notation, date format (grid cells, tooltip, subtitle), density (row metrics), column visibility and the arrows/weekends/today/progress toggles. Add Testing Library tests for: Escape closes and returns focus, switching notation to English re-renders `3;4EE-2T` as `3,4FF-2d`, and Reset restores defaults. Verify that settings survive a reload and are absent from the copied link.

## 7. Integration, cleanup and docs

- [ ] 7.1 Run `npm run lint`, `npm test` and `npm run build`, then serve `dist/` from a sub-directory (e.g. `npx serve` with the build copied under `tools/gantt/`). Verify that the app loads, that a copied link points to `/tools/gantt/?d=…`, and that a v1 link, a legacy v2 link and a fresh v3 link with links all open correctly.
- [ ] 7.2 Delete `legacy/`. Verify that nothing imports or references it (`grep -r legacy src index.html`) and that the build still passes.
- [ ] 7.3 Rewrite `CLAUDE.md` with the commands (dev/build/preview/test/lint, single test file via `npx vitest run <file>`) and the architecture: pure `core/` (model, scheduler, notation, URL codec v1/v2/v3), React `ui/`, settings in localStorage and not in the URL, and calendar-day ASAP scheduling. Verify that every command it lists runs as written.
