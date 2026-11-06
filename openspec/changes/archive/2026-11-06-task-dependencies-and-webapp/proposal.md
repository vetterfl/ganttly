# Proposal

## Why

Real project plans are chains: design can't start until research ends, and testing finishes two days before launch. Today every Ganttly task has hand-entered dates, so one slip means editing every later task by hand. People coming from MS Project expect to type `3EE-2 Tage` or `3FS+2d` into a Predecessors cell and have the schedule follow, with link arrows in the chart.

That logic (date propagation, cycle detection, notation parsing) needs unit tests and modules, which a single inline-script HTML file can't reasonably hold. This is the point to turn Ganttly into a proper built web app.

This change builds on `ms-project-visual-makeover` (task grid, ribbon, Project-style timeline), which is implemented first.

## What Changes

- **Web app foundation:** move from the single `index.html` to a Vite + TypeScript + React project with npm scripts for dev server, production build (static files, deployable to any static host), unit tests and lint/typecheck. The UI and behaviour delivered by `ms-project-visual-makeover` are ported one-to-one.
- **Task links (predecessors):** each task can depend on one or more other tasks. The four MS Project link types are supported: finish-to-start, start-to-start, finish-to-finish and start-to-finish. Each link has an optional lag or lead in days or weeks.
- **MS Project shortcut notation** in a new *Predecessors* grid column. Both German and English forms are accepted (e.g. `3`, `3EA`, `3EE-2 Tage`, `3FF-2d`, `2AA+1W;4`, `2SS+1w, 4`). Entries are shown back in the language picked in Settings. Invalid entries (unknown ID, self-link, cycle, bad syntax) are rejected with an inline error.
- **Auto-scheduling in calendar days:** a task with predecessors gets its dates from its links (as soon as possible) and keeps its duration. Changing a predecessor pushes all of its successors. Its Start is no longer edited by hand. Tasks without predecessors stay manually scheduled.
- **Dependency arrows** in the timeline, routed between the linked bar ends according to link type.
- **View settings** dialog, opened from the ribbon: link-notation language (default German), date format, visible grid columns, row density, and on/off for dependency arrows, weekend shading, today marker and progress display. Settings are stored per browser and are not part of the share link.
- **Share link format v3:** tasks get stable IDs and links are encoded in the URL. v1 and v2 links still open. **BREAKING** (for older copies only): a v3 link opened in an older copy of Ganttly would lose its links. No such copies are deployed, so the impact is nil.

## Capabilities

### New Capabilities
- `task-dependencies`: defining links between tasks: link types, lag/lead, the Predecessors column and its German/English notation, validation (cycles, unknown IDs), and what happens to links when tasks are deleted.
- `task-scheduling`: how task dates are derived: manual vs auto-scheduled tasks, date formulas per link type, propagation to successors, and which fields stay editable.
- `dependency-arrows`: drawing links in the timeline: arrow routing per link type, alignment with bars and lanes, and visibility toggle.
- `view-settings`: the settings dialog, the available options, their defaults, and how they are stored per browser.
- `share-links`: the share-link format (v3 with stable task IDs and links), the round-trip guarantee, and backwards compatibility with v1/v2 links.
- `app-build`: the developer-facing build contract: dev server, static production build, test and lint scripts.

### Modified Capabilities
<!-- none: the capabilities from ms-project-visual-makeover (task-grid, gantt-timeline, workspace-layout) are not yet archived into openspec/specs/. Additions to them are captured as ADDED requirements in this change's task-grid and workspace-layout deltas. -->
- `task-grid`: adds the Predecessors column and read-only Start for auto-scheduled tasks (ADDED requirements, applied after the makeover is archived).
- `workspace-layout`: adds a Settings command to the ribbon (ADDED requirement).

## Impact

- **Code:** `index.html` is replaced by a `src/` tree (React components, a pure scheduler, a notation parser, a URL codec and a settings store), `package.json`, `vite.config.ts`, `tsconfig.json` and an ESLint config. The build output goes to `dist/`.
- **Dependencies (new, dev and runtime):** react, react-dom, vite, @vitejs/plugin-react, typescript, vitest, @testing-library/react, jsdom, eslint (+ typescript-eslint, react-hooks plugin).
- **Hosting:** the app must now be served from `dist/` after `npm run build`. Opening the source `index.html` directly no longer works.
- **Data:** the share-link format moves to v3. Per-browser settings are stored in localStorage.
- **Docs:** `CLAUDE.md` gets new commands and a new architecture section.
- **Order:** apply `ms-project-visual-makeover` first.
