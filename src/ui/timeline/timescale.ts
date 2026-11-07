// Pure timescale builder: which header tiers, labels, gridlines and weekend
// shading to draw for a given day width. The DOM it implies grows with the
// number of visible units (months, weeks, …), not with the number of days.
import { addDays, diffDays } from "../../core/dates";


export interface Cell {
  key: string;
  /** Left edge (px) relative to the range start. */
  x: number;
  width: number;
  /** "" when the label does not fit its cell. */
  label: string;
  today?: boolean;
  /** Extra left offset (px) of the label, e.g. to clear the Today flag. */
  indent?: number;
}

export interface Timescale {
  top: Cell[];
  bottom: Cell[];
  /** x positions (px) of the vertical gridlines: lower-tier unit boundaries. */
  lines: number[];
  /** Weekend shading applies at this scale. */
  weekends: boolean;
  /** The lower tier shows day numbers (and so can highlight today). */
  dayNumbers: boolean;
}

/** Day-width thresholds (px) between the tier bands, widest first. */
export const BANDS = { days: 20, mondays: 12, weeks: 3.5, months: 0.8 } as const;

/** Horizontal room a label needs inside its cell besides its own width. */
const LABEL_PAD = 6;

/** ISO 8601 week number (weeks start Monday; week 1 contains the first Thursday). */
export function isoWeek(d: Date): number {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7)); // Thursday of this week
  const jan4 = new Date(t.getFullYear(), 0, 4);
  return 1 + Math.round((diffDays(t, jan4) - 3 + ((jan4.getDay() + 6) % 7)) / 7);
}

/** First label candidate that fits `width`, else "". */
function fit(width: number, candidates: string[], labelWidth: (s: string) => number, pad = LABEL_PAD): string {
  for (const c of candidates) if (labelWidth(c) + pad <= width) return c;
  return "";
}

/**
 * Split [min, min + totalDays) at the dates produced by `next(d)` (the start of
 * the unit after d's unit). Returns [startDay, endDayExclusive, unitStart] spans.
 */
function units(min: Date, totalDays: number, next: (d: Date) => Date): [number, number, Date][] {
  const out: [number, number, Date][] = [];
  let from = 0;
  let cur = new Date(min);
  while (from < totalDays) {
    const to = Math.min(totalDays, diffDays(next(cur), min));
    out.push([from, to, cur]);
    from = to;
    cur = addDays(min, to);
  }
  return out;
}

const nextMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 1);
const nextYear = (d: Date) => new Date(d.getFullYear() + 1, 0, 1);
const nextQuarter = (d: Date) => new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3 + 3, 1);
const nextMonday = (d: Date) => addDays(d, 7 - ((d.getDay() + 6) % 7));
const nextDay = (d: Date) => addDays(d, 1);

export function buildTimescale(
  min: Date, totalDays: number, w: number,
  opts: {
    today?: Date;
    /** Calendar-week label candidates for ISO week n, longest first (e.g. ["KW 45", "45"]). Default English. */
    weekLabel?: (n: number) => string[];
    /** Width of a tier label (12px semibold). */
    labelWidth?: (s: string) => number;
    /** Width of a day number (11px regular); centred, so it needs no padding. */
    dayLabelWidth?: (s: string) => number;
    locale?: string;
  } = {},
): Timescale {
  const lw = opts.labelWidth ?? ((s: string) => s.length * 7);
  const dlw = opts.dayLabelWidth ?? ((s: string) => s.length * 6);
  const weekLabel = opts.weekLabel ?? ((n: number) => [`W${n}`, `${n}`]);
  const loc = opts.locale;
  const cells = (spans: [number, number, Date][], label: (d: Date, width: number) => string, kind: string): Cell[] =>
    spans.map(([a, b, d]) => {
      const width = (b - a) * w;
      return { key: `${kind}${a}`, x: a * w, width, label: label(d, width) };
    });

  const monthLabel = (d: Date, width: number) => fit(width, [
    d.toLocaleDateString(loc, { month: "long", year: "numeric" }),
    d.toLocaleDateString(loc, { month: "short", year: "numeric" }),
    d.toLocaleDateString(loc, { month: "short" }),
  ], lw);
  const yearLabel = (d: Date, width: number) => fit(width, [String(d.getFullYear()), `'${String(d.getFullYear()).slice(2)}`], lw);

  if (w >= BANDS.weeks) {
    const top = cells(units(min, totalDays, nextMonth), monthLabel, "m");
    if (w >= BANDS.mondays) {
      const thin = w < BANDS.days;
      const todayOff = opts.today ? diffDays(opts.today, min) : -1;
      const bottom = cells(units(min, totalDays, nextDay), (d, width) => {
        if (thin && d.getDay() !== 1 && d.getDate() !== 1) return "";
        return fit(width, [String(d.getDate())], dlw, 0);
      }, "d").map((c, i) => (i === todayOff ? { ...c, today: true } : c));
      return { top, bottom, lines: bottom.map(c => c.x), weekends: true, dayNumbers: true };
    }
    const weeks = units(min, totalDays, nextMonday);
    const bottom = cells(weeks, (d, width) => {
      const n = isoWeek(d);
      return fit(width, weekLabel(n), lw);
    }, "w");
    return { top, bottom, lines: bottom.map(c => c.x), weekends: true, dayNumbers: false };
  }

  const top = cells(units(min, totalDays, nextYear), yearLabel, "y");
  if (w >= BANDS.months) {
    const bottom = cells(units(min, totalDays, nextMonth), (d, width) => {
      const short = d.toLocaleDateString(loc, { month: "short" });
      return fit(width, width < 22 ? [short.charAt(0)] : [short, short.charAt(0)], lw);
    }, "m");
    return { top, bottom, lines: bottom.map(c => c.x), weekends: false, dayNumbers: false };
  }
  const bottom = cells(units(min, totalDays, nextQuarter), (d, width) =>
    fit(width, [`Q${Math.floor(d.getMonth() / 3) + 1}`], lw), "q");
  return { top, bottom, lines: bottom.map(c => c.x), weekends: false, dayNumbers: false };
}

/**
 * Keep labels clear of an overlay spanning [x0, x1] (the Today flag): a label
 * that would intersect it moves to start after it, or is dropped when it then
 * no longer fits its cell.
 */
export function avoidSpan(cells: Cell[], x0: number, x1: number, labelWidth: (s: string) => number): Cell[] {
  return cells.map(c => {
    if (!c.label) return c;
    const start = c.x + LABEL_PAD / 2 + 1;
    const end = start + labelWidth(c.label);
    if (end <= x0 || start >= x1) return c;
    const indent = x1 + 4 - start;
    return start + indent + labelWidth(c.label) + LABEL_PAD / 2 <= c.x + c.width
      ? { ...c, indent }
      : { ...c, label: "" };
  });
}

/** One rectangle per (possibly clipped) Saturday–Sunday pair in the range. */
export function weekendRects(min: Date, totalDays: number, w: number): { x: number; width: number }[] {
  const out: { x: number; width: number }[] = [];
  for (let i = 0; i < totalDays; i++) {
    const day = addDays(min, i).getDay();
    if (day === 6 || (day === 0 && i === 0)) {
      const len = Math.min(day === 6 ? 2 : 1, totalDays - i);
      out.push({ x: i * w, width: len * w });
      i += len - 1;
    }
  }
  return out;
}
