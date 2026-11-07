// Project calendars as a mapping between ISO dates and integer day indexes.
// "days": every calendar day counts. "workdays": only Monday–Friday count.
// All scheduling arithmetic happens on indexes, so the formulas are identical
// for both calendars. O(1) per conversion — no day-by-day loops.
import { addDays, diffDays, iso } from "./dates";

export type Calendar = "days" | "workdays";
export const CALENDARS: readonly Calendar[] = ["days", "workdays"];

export interface CalendarOps {
  /** Index of the first counted day on or after `date`. */
  startIdx(date: string): number;
  /** Index of the last counted day on or before `date`. */
  finishIdx(date: string): number;
  /** ISO date of a day index. */
  toIso(idx: number): string;
  /** Whether `date` is a counted day (always true for "days"). */
  isCounted(date: string): boolean;
}

/** A Monday, so that working-day weeks align with index arithmetic. */
const EPOCH = new Date(2000, 0, 3);

const daysOps: CalendarOps = {
  startIdx: (d) => diffDays(d, EPOCH),
  finishIdx: (d) => diffDays(d, EPOCH),
  toIso: (i) => iso(addDays(EPOCH, i)),
  isCounted: () => true,
};

/** Weeks since EPOCH and weekday 0 = Monday … 6 = Sunday. */
function weekDow(d: string): [number, number] {
  const n = diffDays(d, EPOCH);
  const week = Math.floor(n / 7);
  return [week, n - week * 7];
}

const workdaysOps: CalendarOps = {
  startIdx(d) {
    const [w, dow] = weekDow(d);
    return dow >= 5 ? (w + 1) * 5 : w * 5 + dow;
  },
  finishIdx(d) {
    const [w, dow] = weekDow(d);
    return dow >= 5 ? w * 5 + 4 : w * 5 + dow;
  },
  toIso(i) {
    const w = Math.floor(i / 5);
    return iso(addDays(EPOCH, w * 7 + (i - w * 5)));
  },
  isCounted: (d) => weekDow(d)[1] < 5,
};

export const calendarOps = (cal: Calendar): CalendarOps => (cal === "workdays" ? workdaysOps : daysOps);

/** Untrusted value → Calendar (anything unknown means calendar days). */
export const toCalendar = (v: unknown): Calendar => (v === "workdays" ? "workdays" : "days");

/**
 * Move a task's dates onto counted days: start forward, finish backward, but
 * never before the (snapped) start. Returns the same object when unchanged.
 */
export function snapTask<T extends { s: string; e: string }>(t: T, cal: Calendar): T {
  if (cal === "days") return t;
  const ops = calendarOps(cal);
  const si = ops.startIdx(t.s);
  const s = ops.toIso(si);
  const e = ops.toIso(Math.max(ops.finishIdx(t.e), si));
  return s === t.s && e === t.e ? t : { ...t, s, e };
}

/** Inclusive duration in counted days (min 1). */
export function durationIn(t: { s: string; e: string }, cal: Calendar): number {
  const ops = calendarOps(cal);
  return Math.max(1, ops.finishIdx(t.e) - ops.startIdx(t.s) + 1);
}

/** The counted day `n` counted days after `date` (date is first snapped forward). */
export function addUnits(date: string, n: number, cal: Calendar): string {
  const ops = calendarOps(cal);
  return ops.toIso(ops.startIdx(date) + n);
}

/** First counted day on or after `date`. */
export const snapStart = (date: string, cal: Calendar): string => addUnits(date, 0, cal);
