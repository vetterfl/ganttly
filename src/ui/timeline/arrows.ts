// Orthogonal (elbow) routing for dependency arrows. Pure — unit tested.
import type { LinkType } from "../../core/model";

export const STUB = 5;
/** Bar labels start this far right of the bar, clear of arrow stubs. */
export const LABEL_GAP = 12;

export interface Anchor {
  x: number;
  y: number;
}

/** Which bar edge a link type leaves from (pred) and enters into (succ). */
export function anchorsFor(type: LinkType): { from: "start" | "end"; to: "start" | "end" } {
  switch (type) {
    case "FS": return { from: "end", to: "start" };
    case "SS": return { from: "start", to: "start" };
    case "FF": return { from: "end", to: "end" };
    case "SF": return { from: "start", to: "end" };
  }
}

/**
 * Build an SVG path from the predecessor anchor to the successor anchor.
 * Leaving an end edge exits to the right, a start edge to the left; entering a
 * start edge arrives from the left, an end edge from the right. When the
 * target cannot be reached by a single vertical run, the path drops into the
 * inter-lane gap (`gapY`, the boundary of the source lane toward the target),
 * runs horizontally there, and comes back up/down into the target.
 */
export function routeArrow(type: LinkType, src: Anchor, dst: Anchor, gapY: number): string {
  const { from, to } = anchorsFor(type);
  const d1 = from === "end" ? 1 : -1; // exit direction
  const e = to === "start" ? 1 : -1; // direction of travel when entering
  const xa = src.x + d1 * STUB; // after exit stub
  const xb = dst.x - e * STUB; // before entry stub

  let xv: number | null;
  if (e === 1 && d1 === 1) xv = xa <= xb ? xa : null; // FS
  else if (e === 1 && d1 === -1) xv = dst.x >= src.x ? xa : null; // SS
  else if (e === -1 && d1 === 1) xv = Math.max(xa, xb); // FF
  else xv = xa >= xb ? xa : null; // SF

  const f = (n: number) => Math.round(n * 10) / 10;
  if (xv !== null) {
    return `M${f(src.x)},${f(src.y)} H${f(xv)} V${f(dst.y)} H${f(dst.x)}`;
  }
  return `M${f(src.x)},${f(src.y)} H${f(xa)} V${f(gapY)} H${f(xb)} V${f(dst.y)} H${f(dst.x)}`;
}
