// Pure timeline geometry shared by bars, labels, the timescale and dependency arrows.
import { addDays, diffDays, parseDate } from "../../core/dates";
import type { Task } from "../../core/model";

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
  tasks: Task[], w: number, availPx: number, today: Date, labelWidth: (s: string) => number,
): Range {
  let min: Date, max: Date;
  if (tasks.length) {
    min = tasks.reduce((m, t) => (parseDate(t.s) < m ? parseDate(t.s) : m), parseDate(tasks[0]!.s));
    max = tasks.reduce((m, t) => (parseDate(t.e) > m ? parseDate(t.e) : m), parseDate(tasks[0]!.e));
    min = addDays(min, -2);
    max = addDays(max, 3);
  } else {
    min = addDays(today, -2);
    max = addDays(today, 3);
  }
  let needPx = (diffDays(max, min) + 1) * w;
  for (const t of tasks) {
    const right = (diffDays(t.e, min) + 1) * w;
    needPx = Math.max(needPx, right + 12 + labelWidth(t.n) + 12);
  }
  const totalDays = Math.max(Math.ceil(needPx / w), Math.floor(availPx / w));
  return { min, totalDays };
}

/** Pixel x of the left edge of a day column. */
export const dayToX = (date: string | Date, min: Date, w: number): number => diffDays(date, min) * w;

/** Bar box for a task (1px inset on both sides, matching the rendered bar). */
export function barBox(t: Task, min: Date, w: number): { left: number; right: number; width: number } {
  const x0 = dayToX(t.s, min, w);
  const span = (diffDays(t.e, t.s) + 1) * w;
  return { left: x0 + 1, right: x0 + span - 1, width: span - 2 };
}

/**
 * Top y of each task's lane (in task order), given which tasks have an open
 * detail strip (each adds a spacer lane of detailH after its own lane).
 */
export function laneTops(tasks: Task[], expanded: ReadonlySet<number>, rowH: number, detailH: number): number[] {
  const tops: number[] = [];
  let y = 0;
  for (const t of tasks) {
    tops.push(y);
    y += rowH + (expanded.has(t.id) ? detailH : 0);
  }
  return tops;
}
