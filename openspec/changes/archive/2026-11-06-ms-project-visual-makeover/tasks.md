# Tasks

The project has no test suite. Each step is checked by opening `index.html` in a browser (served with `python3 -m http.server`) unless it says otherwise.

## 1. Foundations: tokens, palette, page shell

- [x] 1.1 Replace the `:root` tokens with the Office-like theme (accent `#185abd`, greys, 2–4px radii, no soft shadows) and add `--row-h`, `--detail-h` and `--header-h`. Delete the unused `--c0..--c7`. Verify the page still loads with no console errors.
- [x] 1.2 Replace `COLORS` with the 8 bold values from design.md §5, keeping the same index order. Verify with a small node/python script that each one has ≥ 3:1 contrast against `#ffffff`.
- [x] 1.3 Replace the header markup with a blue title bar (logo + project title input) and a ribbon with labelled groups Task / Share / View / File. Keep the existing button IDs so the current handlers still bind. Verify that Add task, Copy link, zoom ± and Print all still work.
- [x] 1.4 Replace `<main>`'s capped two-column grid with a full-width `.workspace` scroll container (height = viewport minus title bar and ribbon) holding `.grid-pane` and `.timeline-pane`. Verify that at a 2560px window width the workspace spans edge to edge.

## 2. Task grid with collapsible rows

- [x] 2.1 Implement `renderGrid()` that emits a sticky header (ID, toggle, Task Name, Duration, Start, Finish, % Complete) and one `.row` per task at `--row-h`, replacing `renderEditor()`. Verify that the default chart shows 7 numbered rows with correct durations, and that an empty chart shows the empty-state prompt.
- [x] 2.2 Wire inline editing of name (maxlength 120), Start and Finish with the existing clamping rules. Patch Duration in place, keep the debounced re-render, and patch derived cells instead of rebuilding the grid. Verify that typing a name keeps focus and that setting Finish < Start pulls Start along.
- [x] 2.3 Add the Duration `type=number` input (design.md §4): valid values ≥ 1 move Finish, and invalid values reset on blur. Verify that changing Duration to 10 on a task starting on 2026-11-02 gives Finish 2026-11-11, and that entering 0 reverts.
- [x] 2.4 Add the expand toggle and `.detail` strip (`--detail-h`) with colour swatches, progress slider (step 5), Delete, and narrow-screen-only Start/Finish/Duration inputs. Track expansion in a `Set` of task references. Verify that rows start collapsed, that the toggle opens and closes the strip, that the slider updates the % cell in place, and that deleting row 2 while row 3 is expanded keeps the former row 3 expanded.
- [x] 2.5 Make `addTask()` append the row and focus and select its name cell in the new grid. Verify that the new task starts the day after the latest finish and lasts 5 days.

## 3. Timeline restyle and lane alignment

- [x] 3.1 Rewrite `renderTimeline()` (from `renderChart()`) to build a sticky two-tier timescale at `--header-h`, followed by flow `.lane` elements (`--row-h`) and `.lane.spacer` elements (`--detail-h`) for expanded tasks, with day gridlines, weekend shading and lane separators. Verify that the grid and timeline headers are the same height and that every bar centre lines up with its grid row, collapsed and with rows 2 and 5 expanded.
- [x] 3.2 Restyle the bars: solid palette colour, 1px darker border, darker progress strip, name label always to the right of the bar, and a tooltip with name, start, finish and %. Verify on the default chart that the 45% task shows a dark strip over 45% and that labels are never clipped.
- [x] 3.3 Restyle the today marker (full height, labelled, highlighted day number) and read row geometry from the CSS variables via `getComputedStyle`, falling back to constants. Verify that the marker sits mid-column on today and is absent when all tasks are in the past.
- [x] 3.4 Check the zoom levels against the new layout. Verify that Compact shows only Monday and 1st-of-month labels, that Huge clamps, and that the zoom survives a reload of the copied link.

## 4. Scrolling, responsive and print

- [x] 4.1 Make the grid pane sticky on the left and both headers sticky on top, with the corner cell sticky on both axes. Verify with 40 tasks (added via the URL) in Chrome and Safari that vertical scroll keeps rows aligned and that horizontal scroll leaves the grid in place.
- [x] 4.2 Add the < 980px breakpoint: the grid shows only ID, toggle and name, and the detail strip shows the date and duration inputs. Verify in a 390px responsive view that the body has no horizontal scrollbar and that dates are editable via an expanded row.
- [x] 4.3 Rewrite the `@media print` rules: hide the ribbon, toggles, detail strips, spacer lanes and toast, remove sticky/overflow, show inputs as plain text, landscape. Verify in the print preview that the title, read-only table and bars appear with no controls.

## 5. Compatibility and docs

- [x] 5.1 Confirm that `encodeState`, `decodeState` and `sanitizeTask` are unchanged (`git diff` shows no changes in those functions). Load one v1 link (`?t=Demo&z=1&d=A|2026-11-02|2026-11-06|3|50`) and one v2 link copied before the change, and verify that both render with the correct tasks, zoom and colour slot.
- [x] 5.2 Update `CLAUDE.md`'s architecture section: replace the panel/editor notes with grid, timeline and workspace, describe the shared CSS row-geometry variables and `COLORS` as the single palette source, and remove the "46px duplicated" and "colours duplicated" notes. Verify that it matches the code.
