# Tasks

Prerequisite: none. Apply and archive before `working-day-scheduling`.

## 1. Drag-to-pan

- [x] 1.1 Create `src/ui/useDragPan.ts` per design §1–3: the `panStartAllowed` helper, a pending pan with a 4px threshold, pointer capture, `scrollLeft`/`scrollTop` updates, the `panning` class, click swallowing after a pan, and middle-button `mousedown`/`auxclick` suppression. Wire it to `.workspace` in `App.tsx`. Unit-test `panStartAllowed` in jsdom (left on lane, bar and timescale → true; left on a grid input, resize handle or button → false; middle on the grid → true; touch → false).
- [x] 1.2 Add the cursor CSS (`grab` on `.tl-body`/`.timescale`, `grabbing` and no text selection while `.panning`). Verify in Chromium and WebKit with Playwright on a zoomed-in sample:
  - a left-drag of (−200, −60) on an empty lane scrolls by (+200, +60), with row alignment ≤1px and the grid fixed horizontally;
  - a drag starting on a bar pans without changing the URL;
  - a 2px move doesn't pan;
  - a middle-drag over the grid pans;
  - a left-drag in a name input selects text without panning;
  - dragging right at `scrollLeft = 0` stays at 0.

## 2. Docs

- [x] 2.1 Add drag-to-pan to `README.md` (features) and to `CLAUDE.md` (Layout: `useDragPan` scrolls `.workspace`; left-drag pans only in the timeline). Run `npm run lint`, `npm test` and `npm run build`.
