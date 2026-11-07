# Tasks

Prerequisite: `new-project-and-resizable-columns` is applied and archived.

## 1. Zoom model and share link v4

- [ ] 1.1 Replace `ZOOMS`, `DEFAULT_ZOOM` and `clampZoom` in `src/core/model.ts` with `MAX_DAY_PX`, `ZOOM_STEP`, `MAX_ZOOM_FACTOR` and `clampZoomFactor`. `setZoom` takes a factor, and `newProject`/`sampleProject` use 1. Update the reducer tests so setZoom clamps below 1 to 1 and NaN to 1.
- [ ] 1.2 Write v4 (`zf`, no `z`) in `src/core/urlCodec.ts`, and make v1–v3 decode with zoom 1. Update `urlCodec.test.ts` with: v4 round-trip with zoom 2.5; a v3 link with `z: 4` decoding to zoom 1 with links intact; the v1 spec example at zoom 1; invalid `zf` (missing, "x", 0.5) decoding to 1.

## 2. Geometry and timescale (pure, tested)

- [ ] 2.1 Add `fitDayWidth(tasks, availPx, labelWidth, today)` to `src/ui/timeline/geometry.ts` per design §2 (cap at 120, fallback when `availPx` is 0). Make `computeRange` take `w` from it. Write table tests for: an empty project, one task, a label-dominated case, a 3-year span at 1200px (everything fits), and a short project capped at 120.
- [ ] 2.2 Create `src/ui/timeline/timescale.ts` (`buildTimescale`, `isoWeek`) per the design §3 table, including label omission for narrow cells. Write tests for each band, the threshold boundaries (20, 12, 3.5, 0.8), ISO weeks at year ends (2026-12-31 → 53, 2027-01-04 → 1), `KW`/`W` by language, and that no two adjacent labels overlap.

## 3. Timeline rendering and zoom controls

- [ ] 3.1 Render `Timeline.tsx` from `buildTimescale`: per-unit header cells, gridlines and weekend rectangles (only when `weekends`), the today highlight only when day numbers are shown, and a minimum bar width of 2px. Verify in a browser that a 3-year project at Fit shows years over months or quarters with no overlapping labels and fewer than 200 timeline DOM nodes before lanes. Re-run the existing alignment and arrow checks.
- [ ] 3.2 Build the ribbon View controls in `App.tsx`: −/+ (×1.25), a logarithmic slider, a label ("Fit" or "N%"), a Fit button, and keyboard Ctrl/⌘ +/−/0. Add Testing Library tests for: two zoom-ins giving a label near 156%, Fit resetting to "Fit", and + being disabled at max zoom.
- [ ] 3.3 Add Ctrl/⌘+wheel zoom on `.workspace` (`passive: false`) and a `useZoomAnchor` hook that keeps the anchor date fixed for wheel, buttons and keys. Verify in a browser that the date under the pointer stays within 1 day width after a wheel zoom, that button zoom keeps the centre date, and that zooming at Fit then zooming out does nothing.

## 4. Docs and integration

- [ ] 4.1 Update `README.md` (Fit, fine zoom, wheel/pinch, adaptive header; old links open at Fit) and `CLAUDE.md` (zoom factor model, `fitDayWidth`, `timescale.ts`, v4 codec). Run lint, tests and build. Verify in Chromium and WebKit that a 14-day project and a 900-day project both open fitted with no horizontal scrollbar at 1440px, and that a v3 link from the live site opens with its links at Fit.
