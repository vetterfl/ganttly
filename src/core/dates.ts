// Local-time date helpers. Never use `new Date("YYYY-MM-DD")` — it parses as UTC and shifts days.

export const DAY_MS = 86400000;

export function iso(d: Date): string {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Whole calendar days from b to a (a − b), DST-safe. Accepts ISO strings or Dates. */
export function diffDays(a: string | Date, b: string | Date): number {
  const da = typeof a === "string" ? parseDate(a) : a;
  const db = typeof b === "string" ? parseDate(b) : b;
  return Math.round((da.getTime() - db.getTime()) / DAY_MS);
}

/** Shift an ISO date by n days. */
export const addDaysIso = (s: string, n: number): string => iso(addDays(parseDate(s), n));

/** Inclusive duration in days (min 1). */
export const durationOf = (t: { s: string; e: string }): number => Math.max(1, diffDays(t.e, t.s) + 1);

export const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
