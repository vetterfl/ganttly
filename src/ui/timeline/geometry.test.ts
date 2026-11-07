import { describe, expect, it } from "vitest";
import type { Task } from "../../core/model";
import { computeRange, FALLBACK_DAY_PX, fitDayWidth } from "./geometry";

const TODAY = new Date(2026, 10, 7);
const t = (id: number, s: string, e: string, n = `T${id}`): Task => ({ id, n, s, e, c: 0, p: 0, deps: [] });
const lw = (s: string) => s.length * 7;

/** Rendered width at fit: whole days × w, and every bar+label inside it. */
function check(tasks: Task[], avail: number) {
  const w = fitDayWidth(tasks, avail, lw, TODAY);
  const r = computeRange(tasks, w, avail, TODAY, lw);
  return { w, width: r.totalDays * w, r };
}

describe("fitDayWidth", () => {
  it("falls back while unmeasured", () => {
    expect(fitDayWidth([t(1, "2026-11-02", "2026-11-06")], 0, lw, TODAY)).toBe(FALLBACK_DAY_PX);
  });

  it("empty project: the padded week around today, capped at 120", () => {
    // 6 padded days in 1000px would be 166px/day → capped
    expect(fitDayWidth([], 1000, lw, TODAY)).toBe(120);
    expect(fitDayWidth([], 300, lw, TODAY)).toBeCloseTo(50, 5);
  });

  it("one task: span-limited when the label is short", () => {
    // 2026-11-01..2026-11-30 padded → 2026-10-30..2026-12-03 = 35 days
    const { w, width } = check([t(1, "2026-11-01", "2026-11-30", "A")], 700);
    expect(w).toBeCloseTo(20, 5);
    expect(width).toBeLessThanOrEqual(700 + 1e-6);
  });

  it("label-dominated: a long label on the last task shrinks w so it still fits", () => {
    const tasks = [t(1, "2026-11-01", "2026-11-30", "x".repeat(40))]; // label 280px
    const { w, width, r } = check(tasks, 700);
    expect(w).toBeLessThan(20);
    const right = 32 * w + 24 + 280; // bar ends after day 32 from range start
    expect(right).toBeLessThanOrEqual(width + 1e-6);
    expect(width).toBeLessThanOrEqual(700 + 1e-6);
    expect(r.totalDays).toBeGreaterThanOrEqual(35);
  });

  it("3-year span fits in 1200px", () => {
    const { w, width } = check([t(1, "2026-01-01", "2026-06-30"), t(2, "2027-01-01", "2028-12-31", "Long")], 1200);
    expect(w).toBeLessThan(1.2);
    expect(w).toBeGreaterThan(0.9);
    expect(width).toBeLessThanOrEqual(1200 + 1e-6);
  });

  it("short project is capped at 120px per day and fills the width", () => {
    const { w, width } = check([t(1, "2026-11-02", "2026-11-03", "A")], 1400);
    expect(w).toBe(120);
    expect(width).toBeGreaterThan(1400 - 120);
    expect(width).toBeLessThanOrEqual(1400);
  });

  it.each([313, 777, 1024, 1189, 1440])("never needs more than %ipx at fit", (avail) => {
    const tasks = [t(1, "2026-11-02", "2026-12-18", "Research & strategy"), t(2, "2026-12-01", "2027-03-11", "Development and testing")];
    expect(check(tasks, avail).width).toBeLessThanOrEqual(avail + 1e-6);
  });
});
