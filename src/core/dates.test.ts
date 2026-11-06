import { describe, expect, it } from "vitest";
import { addDays, addDaysIso, diffDays, durationOf, iso, parseDate } from "./dates";

describe("dates", () => {
  it("parses as local midnight without UTC shift", () => {
    const d = parseDate("2026-03-29");
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 2, 29, 0]);
    expect(iso(d)).toBe("2026-03-29");
  });
  it.each(["2026-01-01", "2026-12-31", "2024-02-29", "2026-10-25"])("round-trips %s", (s) => {
    expect(iso(parseDate(s))).toBe(s);
  });
  it.each([
    ["2026-01-31", 1, "2026-02-01"],
    ["2026-12-31", 1, "2027-01-01"],
    ["2027-01-01", -1, "2026-12-31"],
    ["2024-02-28", 1, "2024-02-29"],
    ["2026-02-28", 1, "2026-03-01"],
    ["2026-03-01", 0, "2026-03-01"],
    ["2026-03-28", 2, "2026-03-30"],
  ])("addDaysIso(%s, %i) = %s", (s, n, r) => {
    expect(addDaysIso(s, n)).toBe(r);
    expect(iso(addDays(parseDate(s), n))).toBe(r);
  });
  it("diffDays is whole days across DST changes", () => {
    expect(diffDays("2026-03-30", "2026-03-27")).toBe(3);
    expect(diffDays("2026-10-27", "2026-10-24")).toBe(3);
    expect(diffDays("2026-03-27", "2026-03-30")).toBe(-3);
    expect(diffDays(parseDate("2026-04-01"), "2026-03-01")).toBe(31);
  });
  it("durationOf is inclusive with min 1", () => {
    expect(durationOf({ s: "2026-11-02", e: "2026-11-06" })).toBe(5);
    expect(durationOf({ s: "2026-11-02", e: "2026-11-02" })).toBe(1);
    expect(durationOf({ s: "2026-11-05", e: "2026-11-02" })).toBe(1);
  });
});
