# Ganttly

MS Project–style Gantt charts in the browser — with task dependencies, predecessor shortcuts and shareable links. No sign-up, no backend: the whole project lives in the URL.

**Live app:** https://vetterfl.github.io/ganttly/

## Features

- **Task table + timeline** side by side, row-aligned like MS Project: ID, Task Name, Duration, Start, Finish, % Complete, Predecessors. Per-task colour, progress and delete live in a collapsible detail row (▸).
- **Resizable columns:** drag the right edge of a column header, double-click it to fit the widest entry, or focus it and use ←/→ (Home resets). Values that don't fit end in "…" and show in full on hover.
- **Groups:** *Add group* creates a section header (say, one per company). Each header shows the group's overall Start, Finish, Duration (earliest start to latest finish) and duration-weighted % Complete, plus a summary bar in the timeline; the chevron collapses it (stored in the link). Put tasks into a group with the header's **+**, the *Group* selector in a task's options, Alt+↑/↓ across a header, or by dragging. The header's **⋯** menu moves or deletes a group (you choose whether its tasks go too). Tasks stay numbered 1…n across groups.
- **Reorder tasks:** drag a row by the grip in its ID cell (mouse or touch; Escape cancels), press Alt+↑ / Alt+↓ in a row, or use *Up* / *Down* in the row's options. Rows renumber; predecessor links follow their tasks.
- **New project:** *New* in the File group starts an empty chart (asking first if the current one has tasks). The browser's Back button brings the previous chart back.
- **Dependencies** of all four MS Project types — finish-to-start, start-to-start, finish-to-finish, start-to-finish — with lag or lead in days or weeks, drawn as arrows in the timeline.
- **Auto-scheduling:** a task with predecessors starts as early as its links allow and keeps its duration. Move a task and everything that depends on it follows.
- **Calendar or working days:** in *Settings → Project*, choose whether the project is planned in calendar days or in working days (Mon–Fri). In a working-day project durations and lags skip weekends, a week (`1W`) is 5 days, tasks always start and end on weekdays, and durations read "5 wdays". The choice belongs to the project and travels with its link; switching keeps your dates.
- **Zoom that fits any project:** *Fit* (100%) shows the whole project, however long, in the visible timeline. Zoom in from there in fine steps with − / + (×1.25), the zoom slider, Ctrl/⌘ + / −, or Ctrl/⌘ + mouse wheel / trackpad pinch over the chart (the date under the pointer stays put), up to 120 px per day. *Fit* or Ctrl/⌘ 0 goes back. The timescale adapts: days → Mondays → calendar weeks (KW/W) → months → quarters.
- **Drag to pan:** grab the timeline with the left mouse button (or anywhere with the middle button) and drag to move around the chart, horizontally and vertically.
- **Shareable links:** *Copy link* puts the entire chart (title, zoom, calendar, groups, tasks, links) into a URL. Older Ganttly links keep working; links from before the fit-relative zoom open at *Fit*.
- **View settings** (per browser, never part of the link): German or English link notation, date format, row density, visible columns and their widths, and toggles for arrows, weekend shading, today marker and progress.
- Bold colour palette, landscape print layout, works on phones.

## Predecessor shortcuts

Type into a task's **Predecessors** cell, then press Enter. Separate several entries with `;` or `,`. German and English codes are both accepted; the cell shows them in the language chosen in *Settings* (default: German).

| Link type        | German | English | Meaning                                      |
|------------------|--------|---------|----------------------------------------------|
| Finish-to-start  | `EA`   | `FS`    | starts after the predecessor finishes (default) |
| Start-to-start   | `AA`   | `SS`    | starts when the predecessor starts           |
| Finish-to-finish | `EE`   | `FF`    | finishes when the predecessor finishes       |
| Start-to-finish  | `AE`   | `SF`    | finishes when the predecessor starts         |

Lag (`+`) or lead (`-`) units: days `d`, `day(s)`, `T`, `Tag(e)` (default) or weeks `w`, `wk`, `week(s)`, `Wo`, `Woche(n)`.

| You type        | Meaning                                                    |
|-----------------|------------------------------------------------------------|
| `3`             | starts the day after task 3 finishes                       |
| `3EA+2T`, `3FS+2d` | two days after task 3 finishes                          |
| `3EE-2 Tage`, `3FF-2d` | finishes two days before task 3 finishes            |
| `2AA+1W; 4`     | starts a week after task 2 starts, and after task 4 finishes |

Unknown task numbers, links to the task itself and circular dependencies are rejected with an inline error; Escape reverts the cell. Days and weeks are counted in the project's calendar (calendar days by default, or working days).

## Development

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev        # dev server with hot reload
npm test           # unit + component tests (Vitest)
npm run lint       # ESLint + TypeScript type-check
npm run build      # static site in dist/
npm run preview    # serve the production build
```

Run a single test file with `npx vitest run src/core/schedule.test.ts`.

The build is a plain static site with relative asset paths, so `dist/` can be served from any host and any sub-path. Every push to `main` is linted, tested, built and deployed to GitHub Pages by [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

### Project layout

```
src/core/       framework-free logic: model, scheduler, notation parser, URL codec (fully unit-tested)
src/settings/   per-browser view settings (localStorage)
src/ui/         React components — task grid, timeline, dependency arrows, settings and confirm dialogs
src/styles/     theme and layout CSS
openspec/       specifications and change history (OpenSpec)
```

Behaviour is specified in [`openspec/specs/`](openspec/specs/); each change that shaped the app is archived under [`openspec/changes/archive/`](openspec/changes/archive/).

Built with Vite, React and TypeScript.
