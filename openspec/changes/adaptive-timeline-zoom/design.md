# Design

## Context

Day width `w` comes from `ZOOMS[project.zoom].w`, with five presets from 14 to 76px. `computeRange()` pads the task span by −2/+3 days, extends it right so labels fit, and extends it further to fill the visible width. `Timeline.tsx` renders one header cell and one background `.day-col` per day: a 3-year project is about 2,200 DOM nodes even before tasks. Arrows, bars and labels all use `barBox()`/`dayToX()` with `w`.

See `proposal.md` and `specs/` for requirements.

## Goals / Non-Goals

**Goals:**
- Any project fits on screen at 100%.
- Smooth, fine zoom.
- A readable header at every scale.
- DOM size proportional to visible units, not days.

**Non-Goals:**
- Hour or minute resolution: 120px/day stays the maximum.
- Zooming below Fit (it only adds empty space).
- Horizontal virtualisation of lanes.
- Remembering the scroll position in the link.

## Decisions

### 1. Zoom is a factor; `w` is derived

The model changes:
- `Project.zoom` becomes a number ≥ 1, where 1 = Fit.
- New constants: `MAX_DAY_PX = 120`, `ZOOM_STEP = 1.25`, `MAX_ZOOM_FACTOR = 10000` (a sanity cap for the codec only).
- `clampZoomFactor(x)` returns `1` for anything non-finite or < 1, and otherwise `min(x, MAX_ZOOM_FACTOR)`.

The UI computes:

```
fitW = fitDayWidth(tasks, availPx, labelWidth)   // pure, in geometry.ts
w    = min(fitW * zoom, MAX_DAY_PX)
maxZoom = MAX_DAY_PX / fitW                      // for slider and + button limits
```

The stored factor is left alone even if it exceeds `maxZoom` for the current window. It is clamped only when used, so resizing a window narrower and back doesn't lose the user's zoom.

### 2. `fitDayWidth`: solve for the largest w that fits

With `D` = padded span in days, and for each task `t`, `endDays_t` = days from range start to the end of `t`, and `L_t` = label gap + label width + margin:

```
w = min( availPx / D,  min_t (availPx − L_t) / endDays_t ),   then clamped to (0, MAX_DAY_PX]
```

That is, the span must fit and every bar plus its label must fit. If `availPx` is 0 (not measured yet), it falls back to 34px. Unit tests cover: an empty project, one task, the label-dominated case, a 3-year span, and the cap at 120.

`computeRange()` keeps its contract: padded span, labels never clipped, and the range extended to fill `availPx` when the content is narrower (when `fitW` is capped at 120).

### 3. Timescale as data: `timescale.ts`

`buildTimescale(min, totalDays, w, lang) → { top: Cell[], bottom: Cell[], lines: number[], weekends: boolean, dayNumbers: boolean }`, where `Cell = { key, x, width, label, today? }`.

| w (px/day) | top tier | bottom tier | gridlines at | weekends |
|---|---|---|---|---|
| ≥ 20 | month YYYY | every day | days | yes |
| 12–20 | month YYYY | day number on Mon and 1st (blank otherwise) | days | yes |
| 3.5–12 | month YYYY | ISO week `KW 45` (de) / `W45` (en) | Mondays | yes |
| 0.8–3.5 | YYYY | month short name (`Jan`; single letter when narrower than 22px) | 1st of month | no |
| < 0.8 | YYYY | quarter `Q1` | quarter start | no |

- Labels are omitted when their cell is narrower than the label (measured with the same canvas `labelWidth`).
- Weekend shading is rendered as one rectangle per weekend (Sat + Sun = 2w wide) rather than per day. Gridlines are a single SVG `<path>` or a repeating background, depending on count.
- Background columns and day cells are generated per unit, which brings the DOM for a 3-year project from about 2,200 nodes to about 50.

The ISO week number is a small pure function, tested on year boundaries (2026-12-31 is W53, 2027-01-04 is W1).

### 4. Zoom controls and anchoring

- **Ribbon View group:**
  - `−` and `+` multiply or divide the factor by 1.25.
  - A slider (`<input type=range>`) maps logarithmically: `value = log(zoom)/log(maxZoom)` scaled to 0..1000.
  - The label shows `Fit` at 1, otherwise `Math.round(zoom*100)%`.
  - A Fit button.
- **Keyboard:** Ctrl/⌘ +/− step and Ctrl/⌘ 0 fits. The existing handler is extended to cover `0`.
- **Wheel:** a `wheel` listener on `.workspace` with `{ passive: false }`, active only when `ctrlKey || metaKey`. Trackpad pinch sends `ctrlKey` wheel events in Chromium, Safari and Firefox. The factor becomes `zoom * exp(−deltaY * 0.0015)`.
- **Anchoring:** before dispatching, record the anchor date under the pointer (or the viewport centre for buttons and keys) as fractional days: `(scrollLeft + pointerX − gridW) / w`. After render, `useLayoutEffect` sets `scrollLeft = anchorDays * w' − pointerX + gridW`. This lives in a small `useZoomAnchor()` hook so `App` stays readable.

### 5. Share link v4

`encodeProject` writes `{ v: 4, t, zf: zoom, n, tasks }`; `z` is no longer written. `decodeProject`:
- **v4:** `zoom = clampZoomFactor(o.zf)`.
- **v3, v2 and v1:** decoded as today, except `zoom = 1`.

A v4 payload read by the v3-era build falls into its v2 path (it has a `tasks` array). It would show the tasks without links at its preset index zoom 2, which is a degraded but working rollback. The task, ID and link encoding is unchanged, so the existing codec tests keep passing except the zoom assertions.

## Risks / Trade-offs

- [Fit changes whenever tasks change, so the chart "breathes" while editing at 100%] → that's intended: the whole project stays visible. When zoomed in (factor > 1), the scroll is anchored at the viewport centre, so editing doesn't jump the view.
- [Wheel zoom hijacks Ctrl+wheel page zoom over the timeline] → only over `.workspace`. The browser's own page zoom still works via the menu, keyboard shortcuts outside the app, or Ctrl+wheel over the ribbon.
- [Very tiny w (a 10-year project at 0.2px/day) makes short bars invisible] → bars get a 2px minimum width. The tooltip and grid still give exact dates.
- [Old links lose their preset zoom] → documented as BREAKING in the proposal. It is cosmetic, and Fit is usually what people want.
