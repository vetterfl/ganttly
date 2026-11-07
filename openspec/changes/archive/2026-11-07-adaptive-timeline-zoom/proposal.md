# Proposal

**Phase 2 of 4.** Apply after `new-project-and-resizable-columns` is archived; this change modifies the Command ribbon requirement in the form that phase leaves it.

## Why

Zoom is five fixed pixel-per-day presets (14–76px). A one-year plan at the smallest preset is over 5,000px wide, so you can never see a long project at once. A two-week plan at the largest preset still leaves most of a wide screen empty, and the jumps between presets are coarse. The header always shows months over days, which turns into an unreadable strip of day numbers for long projects.

## What Changes

- **Zoom is relative to the project.** "Fit" (100%) is the scale at which the whole project, including padding and bar labels, fills the visible timeline width. Zoom is a factor of that, from 100% up to the scale where one day is 120px wide.
  - Fit is recalculated whenever the project's date span or the window width changes. The chosen factor is kept.
- **Finer control:**
  - ± buttons step by ×1.25.
  - A logarithmic zoom slider and a percentage label.
  - A **Fit** button.
  - Ctrl/⌘ + and −, plus Ctrl/⌘ 0 to fit.
  - Ctrl/⌘ + mouse wheel or trackpad pinch over the timeline, zooming around the pointer.
  - The date under the pointer, or the centre for buttons, stays in place.
- **Adaptive timescale:** the two header tiers switch with the day width:
  - months over days
  - months over Mondays and the 1st
  - months over calendar weeks
  - years over months
  - years over quarters

  Gridlines follow the lower tier. Weekend shading is shown only while single days are visibly wide.
- **Share links move to format v4**, which stores the zoom factor. **BREAKING** for zoom only: links in v1–v3 open at Fit, because their stored presets have no meaning in the new model. Their tasks and links load exactly as before.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `gantt-timeline`: Two-tier timescale (adaptive tiers), Grid lines (per lower-tier unit, weekend threshold) and Zoom levels (fit-relative, fine-grained) are rewritten.
- `share-links`: the URL stores the zoom factor, the format is now v4, and in older links zoom falls back to Fit.
- `workspace-layout`: the View group's commands change (slider, percentage, Fit).
- `dependency-arrows`: the zoom scenario in "Arrows follow layout" no longer names presets.

## Impact

- **Model:** `src/core/model.ts` — `Project.zoom` becomes a factor. `ZOOMS` and `clampZoom` are replaced by `MIN_ZOOM`, `MAX_DAY_PX`, `clampZoomFactor` and `ZOOM_STEP`.
- **Codec and reducer:** `urlCodec.ts` (v4 encode; zoom fallback for v1–v3) and `reducer.ts` (`setZoom` takes a factor).
- **Timeline geometry and rendering:**
  - `src/ui/timeline/geometry.ts`: a new `fitDayWidth`.
  - New `src/ui/timeline/timescale.ts`: pure tier and gridline builder.
  - `Timeline.tsx`: renders per-unit cells instead of per-day cells, which is also much lighter for long projects.
- **Ribbon and input:** `App.tsx` gets new View controls and wheel zoom with scroll anchoring.
- The `newProject` default zoom becomes factor 1 (Fit).
- Docs need updating.
