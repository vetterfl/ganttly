# Design

## Context

When this change is applied, `ms-project-visual-makeover` has already been implemented in the single `index.html`. That file holds an IIFE with module-level `state`, a `renderGrid()` that patches cells in place to keep focus, a full-`innerHTML` `renderTimeline()`, a sticky-pane `.workspace`, and the CSS variables `--row-h`/`--detail-h`/`--header-h`. Its URL codec (`encodeState`/`decodeState`/`sanitizeTask`, v1 + v2) is unchanged from today. There is no package.json, no tests and no git history yet.

See `proposal.md` for motivation and `specs/` for the behaviour contract. Where the makeover specs say Start is always editable, `task-scheduling` narrows that for auto-scheduled tasks. Where they list fixed grid columns, `view-settings` makes most of them optional.

## Goals / Non-Goals

**Goals:**
- A pure, framework-free core (model, scheduler, notation, URL codec) that has full unit test coverage and that the UI only calls.
- A React UI that reproduces the makeover's look and behaviour, then adds the Predecessors column, arrows and settings.
- Static `dist/` output that works from any sub-path.

**Non-Goals:**
- Working-day calendars, holidays and hour-level scheduling. Everything is in calendar days.
- Constraint types beyond "as soon as possible" (no Must Start On or Start No Earlier Than), percentage lags (`3EA+50%`), and the elapsed-day units `ed`/`eT`.
- Critical path, slack, summary tasks, row reordering, undo/redo and drag-to-link.
- Localising the UI chrome to German. Only the link notation switches language.
- Deployment pipeline/CI. Only the npm scripts are in scope.

## Decisions

### 1. Stack and layout

Vite + React 18 + TypeScript (strict), Vitest + Testing Library (jsdom), and ESLint flat config with `typescript-eslint` and `eslint-plugin-react-hooks`. `vite.config.ts` sets `base: "./"` so `dist/` works under any sub-path.

```
src/
  core/                     <-- pure TS, no DOM, no React
    model.ts                Task, Link, LinkType, Project types; id allocation
    dates.ts                parseDate/iso/addDays (moved verbatim), diffDays
    schedule.ts             topo order + ASAP forward pass, cycle check
    notation.ts             parsePredecessors / formatPredecessors (de|en)
    urlCodec.ts             encode v3; decode v3 | v2 | v1; sanitize
    reducer.ts              project actions -> new project (calls schedule)
  settings/
    settings.ts             Settings type, defaults, load/save (localStorage, try/catch)
    SettingsContext.tsx
  ui/
    App.tsx  Ribbon.tsx  TitleBar.tsx  Workspace.tsx
    grid/      TaskGrid.tsx  GridRow.tsx  DetailStrip.tsx  PredecessorCell.tsx
    timeline/  Timeline.tsx  Timescale.tsx  Bars.tsx  DependencyArrows.tsx
    SettingsDialog.tsx  Toast.tsx
  styles/   theme.css (the makeover's tokens + rules, ported)
  main.tsx
index.html                  Vite entry (shell only)
```

- **Why no framework-agnostic store library:** a single `useReducer` over `Project` is enough, and the reducer is pure and tested in `core/`.
- **Alternative:** keeping vanilla DOM with Vite (the earlier option). Rejected by the user's choice of React.

### 2. Data model

```ts
type LinkType = "FS" | "SS" | "FF" | "SF";        // canonical, language-neutral
interface Link { pred: number; type: LinkType; lag: number }   // pred = stable task id, lag in days
interface Task { id: number; n: string; s: string; e: string; c: number; p: number; deps: Link[] }
interface Project { title: string; zoom: number; tasks: Task[]; nextId: number }
```

The row number shown in the grid is `index + 1`, computed at render. The stable `id` is never shown. The notation layer maps between row numbers and IDs, so "Links follow tasks, not row numbers" holds by construction.

Duration is derived (`diffDays(e, s) + 1`) rather than stored, keeping the URL lean as today. The scheduler reads D from the task's current s/e before moving it.

### 3. Scheduler: full recompute after every action

`schedule(tasks): Task[]` does the following:
1. Builds the successor graph from `deps`.
2. Topologically sorts it (Kahn's algorithm).
3. For each task in topological order that has `deps`, computes the candidate starts from the spec formulas, takes the max, and sets `s` and `e = s + D − 1`.

Tasks without deps are untouched. This runs in the reducer after every mutating action, which makes propagation (including "pull earlier") automatic and keeps the code free of incremental bookkeeping. For the expected size (fewer than 200 tasks) it is O(V+E) and trivially fast.

`wouldCreateCycle(tasks, taskId, newDeps)` runs a DFS from each new predecessor back through `deps`. The notation parser calls it to reject an entry before it reaches the reducer. `urlCodec` uses it to drop offending links greedily, in task order, when loading untrusted data.

- **Alternative:** incremental propagation from the edited node only. It's faster but needs care for "pull earlier" across multiple predecessors. Not worth it at this size.

### 4. Notation grammar

The parser is a tokenising regex per entry, after splitting on `[;,]`:

```
^\s*(\d+)\s*(EA|AA|EE|AE|FS|SS|FF|SF)?\s*(?:([+-])\s*(\d+)\s*(d|days?|t|tage?|w|wks?|weeks?|wo|wochen?|woche)?)?\s*$   (case-insensitive)
```

German codes map to canonical codes (EA→FS, AA→SS, EE→FF, AE→SF). Weeks multiply by 7. It returns `{ ok: true, links } | { ok: false, error }`, where the error has a kind (syntax / unknown id / self / cycle) and the offending entry. That kind feeds the inline error message.

The formatter takes `(links, rowNumberOf, lang)` and emits `3;4EE-2T` (de) or `3,4FF-2d` (en), using the spec's omission rules. Both functions are pure and table-tested with every example from the specs.

### 5. Editing model in the grid

React-controlled inputs with local draft state, committed to the reducer:
- **Name, % and colour** commit on every input event, as today.
- **Dates and Duration** commit on input when valid, and revert on blur when invalid.
- **Predecessors** commit only on Enter or blur, because partial text such as `3E` is not meaningful. Escape reverts.

A rejected entry keeps the draft text, adds `aria-invalid` and a red outline, and shows the error in a small popover anchored under the cell. For auto-scheduled tasks, Start renders as plain text with a "linked" glyph and `title="Calculated from predecessors"`.

Row keys are task IDs, so React keeps focus stable through re-renders. This replaces the vanilla "patch cells in place" trick.

### 6. Dependency arrows: one SVG overlay per render

`DependencyArrows` renders a single absolutely positioned `<svg>` covering the timeline body (pointer-events none), with a shared `<marker>` arrowhead. Lane geometry is computed (`laneTop(i)` = sum of row heights before i, including the `--detail-h` spacers), never measured from the DOM. Bar X positions come from the same `dayToX` function the bars use, so arrows cannot drift.

Routing, with x1/y1 at the source anchor and x2/y2 at the target anchor, using 8px stubs:

```
forward (x2 >= x1 + 16):             backward (x2 < x1 + 16):
  x1 ---+                              x1 --+
        |                                   |  (down to lane gap)
        +---> x2                     +------+
                                     |
                                     +--> x2
```

Start anchors exit or enter from the left and end anchors from the right. The stub direction flips accordingly. The horizontal run of a backward route sits in the gap at the bottom of the source lane. Arrows use the ink colour at 70% opacity, 1.25px wide, so they read on top of bold bars without overpowering them.

### 7. Settings

```ts
interface Settings {
  notation: "de" | "en";             // default "de"
  dateFormat: "locale" | "iso" | "dmy";
  density: "compact" | "comfortable";
  columns: { duration; start; finish; pct; preds: boolean };
  showArrows; showWeekends; showToday; showProgress: boolean;
}
```

The settings are stored under one localStorage key (`ganttly.settings.v1`) as JSON, merged over defaults on load so that new keys pick up their defaults. All storage access is wrapped in try/catch. Density works by switching `--row-h`/`--detail-h` on the workspace root, and arrows and lanes read the same values from a `useRowMetrics()` hook. `SettingsDialog` uses the native `<dialog>` element (`showModal`, Escape and backdrop click handled, focus returns to the opener).

### 8. URL codec v3

`?d=` + base64url(JSON `{ v:3, t, z, n: nextId, tasks:[{ i, n, s, e, c, p, d:[[predId, typeIdx, lag], …] }] }`), with `d` omitted when empty and typeIdx 0–3 standing for FS/SS/FF/SF. The decoder tries v3, then v2, then v1, and falls back to the sample project when none parse. For v2 and v1 it assigns `id = index + 1`. The existing `b64encode`/`b64decode` and `sanitizeTask` logic is ported verbatim and extended with ID/deps checks (integer, unique, references existing IDs, not self). After a successful load, the project goes through `schedule()` once, so a hand-edited URL with inconsistent dates is normalised.

### 9. Porting the makeover first, then adding features

The first task group reproduces the makeover in React with **no** new features, and checks it against the makeover's specs side by side with the old `index.html`. Only then are links, arrows and settings added. This keeps regressions in the port separate from bugs in the new features.

## Risks / Trade-offs

- [The makeover is built in vanilla JS and immediately rewritten in React, so effort is duplicated] → accepted by the user when choosing the ordering. The makeover's CSS is reused almost unchanged, and its specs act as the port's acceptance test.
- [Opening `index.html` directly from disk no longer works] → documented in CLAUDE.md. `npm run preview` serves `dist/`.
- [Full recompute makes manual dates on auto-scheduled tasks impossible to keep] → intended (ASAP semantics). Start is read-only for those tasks so users aren't surprised.
- [SF links and negative lags can schedule a successor before the project's earliest date] → the timeline range is computed after scheduling, so it simply extends left. Covered by a test.
- [Larger bundle than today's 24 KB file (React adds about 45 KB gzipped)] → acceptable for a tool page. No other runtime dependencies are added.
- [German shows `;` and English shows `,`, so a user may type either separator] → both are always accepted as separators. Lags are whole numbers, so `,` is never needed as a decimal mark and can't be misread.
- [localStorage settings differ between viewers of the same link] → intended by spec (settings are personal).

## Migration Plan

1. Implement `ms-project-visual-makeover` in `index.html` and commit it.
2. Scaffold Vite in place. The old `index.html` moves to `legacy/index.html` as a reference during the port and is deleted at the end of this change.
3. Deploy target: serve `dist/`. Old shared links (v1 and v2) keep working against the new build.
4. Rollback: redeploy the last single-file `index.html` commit. v3 links would then load without their links, as a degraded but readable chart via the v2 path. In fact v2 decoding of v3 JSON works, since the extra fields are ignored.
