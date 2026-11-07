// Pure timeline geometry shared by bars, labels, the timescale and dependency arrows.
import { addDays, diffDays, parseDate } from "../../core/dates";
import { MAX_DAY_PX, type Task } from "../../core/model";

/** Something drawn as a bar with a label to its right: a task, or a group's summary bar. */
export interface Span { s: string; e: string; n: string }

/** Space a bar label needs right of its bar: gap + label + margin (matches computeRange). */
const LABEL_ROOM = 12 + 12;
/** Day width used before the timeline has been measured. */
export const FALLBACK_DAY_PX = 34;
/** Floor for absurdly long projects, so w stays positive. */
const MIN_DAY_PX = 0.01;

/** Padded first/last day: tasks −2/+3 days, or around today when there are none. */
function paddedSpan(tasks: readonly Span[], today: Date): { min: Date; max: Date } {
  if (!tasks.length) return { min: addDays(today, -2), max: addDays(today, 3) };
  let min = parseDate(tasks[0]!.s), max = parseDate(tasks[0]!.e);
  for (const t of tasks) {
    const s = parseDate(t.s), e = parseDate(t.e);
    if (s < min) min = s;
    if (e > max) max = e;
  }
  return { min: addDays(min, -2), max: addDays(max, 3) };
}

/** Pixels needed at day width w: the padded span, and every bar plus its label. */
function neededPx(tasks: readonly Span[], min: Date, spanDays: number, w: number, labelWidth: (s: string) => number): number {
  let need = spanDays * w;
  for (const t of tasks) need = Math.max(need, (diffDays(t.e, min) + 1) * w + LABEL_ROOM + labelWidth(t.n));
  return need;
}

/**
 * Day width at which the whole padded project, bar labels included, fits in
 * `availPx` (zoom factor 1 = "Fit"). Capped at MAX_DAY_PX; FALLBACK_DAY_PX
 * while `availPx` is unknown (0).
 */
export function fitDayWidth(tasks: readonly Span[], availPx: number, labelWidth: (s: string) => number, today: Date): number {
  if (!(availPx > 0)) return FALLBACK_DAY_PX;
  const { min, max } = paddedSpan(tasks, today);
  const span = diffDays(max, min) + 1;
  let w = availPx / span;
  for (const t of tasks) {
    const room = availPx - LABEL_ROOM - labelWidth(t.n);
    if (room > 0) w = Math.min(w, room / (diffDays(t.e, min) + 1));
  }
  w = Math.min(Math.max(w, MIN_DAY_PX), MAX_DAY_PX);
  // The timeline is a whole number of days: shrink until ceil(need/w) days fit.
  for (let i = 0; i < 8; i++) {
    const days = Math.ceil(neededPx(tasks, min, span, w, labelWidth) / w - 1e-9);
    if (days * w <= availPx + 1e-6 || w <= MIN_DAY_PX) break;
    w = Math.max(availPx / days, MIN_DAY_PX);
  }
  return w;
}

export interface Range {
  min: Date;
  totalDays: number;
}

/**
 * Visible range: tasks padded −2/+3 days (around today when empty), extended
 * right so every bar label fits, and so the timeline fills `availPx` without
 * overflowing it by a partial day.
 */
export function computeRange(
  tasks: readonly Span[], w: number, availPx: number, today: Date, labelWidth: (s: string) => number,
): Range {
  const { min, max } = paddedSpan(tasks, today);
  const needPx = neededPx(tasks, min, diffDays(max, min) + 1, w, labelWidth);
  const totalDays = Math.max(Math.ceil(needPx / w - 1e-9), Math.floor(availPx / w + 1e-9));
  return { min, totalDays };
}

/** Pixel x of the left edge of a day column. */
export const dayToX = (date: string | Date, min: Date, w: number): number => diffDays(date, min) * w;

/** Bars never get thinner than this, however far out the zoom is. */
export const MIN_BAR_PX = 2;

/** Bar box for a task (1px inset on both sides, matching the rendered bar; at least MIN_BAR_PX wide). */
export function barBox(t: { s: string; e: string }, min: Date, w: number): { left: number; right: number; width: number } {
  const x0 = dayToX(t.s, min, w);
  const span = (diffDays(t.e, t.s) + 1) * w;
  const inset = Math.min(1, Math.max(0, (span - MIN_BAR_PX) / 2));
  const width = Math.max(span - 2 * inset, MIN_BAR_PX);
  return { left: x0 + inset, right: x0 + inset + width, width };
}

/** Anything laid out as a row: a task row (maybe with an open detail strip) or a group header. */
export type RowLike = { kind: "task"; detail: boolean } | { kind: "group" };
const rowHeight = (r: RowLike, rowH: number, detailH: number) => rowH + (r.kind === "task" && r.detail ? detailH : 0);

/**
 * Top y of each display row's lane. Every row is rowH high; a task row with an
 * open detail strip adds a spacer of detailH after it. The grid, timeline,
 * arrows and row dragging all use this, so they can't disagree.
 */
export function rowTops(rows: readonly RowLike[], rowH: number, detailH: number): number[] {
  const tops: number[] = [];
  let y = 0;
  for (const r of rows) {
    tops.push(y);
    y += rowHeight(r, rowH, detailH);
  }
  return tops;
}

/** Total height of all rows. */
export const rowsHeight = (rows: readonly RowLike[], rowH: number, detailH: number): number =>
  rows.reduce((h, r) => h + rowHeight(r, rowH, detailH), 0);

/** rowTops for a plain task list (no groups), `expanded` = tasks with an open detail strip. */
export function laneTops(tasks: Task[], expanded: ReadonlySet<number>, rowH: number, detailH: number): number[] {
  return rowTops(tasks.map(t => ({ kind: "task" as const, detail: expanded.has(t.id) })), rowH, detailH);
}
