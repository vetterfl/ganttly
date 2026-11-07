import { describe, expect, it } from "vitest";
import { addUnits, calendarOps, durationIn, snapStart, snapTask, toCalendar } from "./calendar";
import { addDaysIso, durationOf } from "./dates";

const wd = calendarOps("workdays");
const dowOf = (iso: string) => new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8))).getDay();

describe("workdays index", () => {
  it("round-trips every weekday across year ends and DST weeks", () => {
    let d = "2025-12-20";
    for (let i = 0; i < 900; i++) {
      if (wd.isCounted(d)) {
        expect(wd.toIso(wd.startIdx(d))).toBe(d);
        expect(wd.finishIdx(d)).toBe(wd.startIdx(d));
      }
      d = addDaysIso(d, 1);
    }
  });

  it("consecutive indexes are consecutive weekdays", () => {
    const start = wd.startIdx("2026-03-27"); // Fri before the EU DST switch
    const seq = Array.from({ length: 7 }, (_, k) => wd.toIso(start + k));
    expect(seq).toEqual(["2026-03-27", "2026-03-30", "2026-03-31", "2026-04-01", "2026-04-02", "2026-04-03", "2026-04-06"]);
    expect(seq.every(s => dowOf(s) >= 1 && dowOf(s) <= 5)).toBe(true);
  });

  it("weekends: start → next Monday, finish → previous Friday", () => {
    expect(wd.toIso(wd.startIdx("2026-11-07"))).toBe("2026-11-09"); // Sat
    expect(wd.toIso(wd.startIdx("2026-11-08"))).toBe("2026-11-09"); // Sun
    expect(wd.toIso(wd.finishIdx("2026-11-07"))).toBe("2026-11-06");
    expect(wd.toIso(wd.finishIdx("2026-11-08"))).toBe("2026-11-06");
    expect(wd.isCounted("2026-11-07")).toBe(false);
    expect(wd.isCounted("2026-11-06")).toBe(true);
    expect(wd.toIso(wd.startIdx("2027-01-02"))).toBe("2027-01-04"); // across New Year
  });
});

describe("snapTask / durationIn / addUnits", () => {
  it("snaps both ends and clamps a finish before start to the start", () => {
    expect(snapTask({ s: "2026-11-07", e: "2026-11-12" }, "workdays")).toEqual({ s: "2026-11-09", e: "2026-11-12" });
    expect(snapTask({ s: "2026-11-07", e: "2026-11-08" }, "workdays")).toEqual({ s: "2026-11-09", e: "2026-11-09" });
    const t = { s: "2026-11-09", e: "2026-11-13" };
    expect(snapTask(t, "workdays")).toBe(t);
    const w = { s: "2026-11-07", e: "2026-11-08" };
    expect(snapTask(w, "days")).toBe(w);
  });

  it("durationIn counts working days", () => {
    expect(durationIn({ s: "2026-11-12", e: "2026-11-16" }, "workdays")).toBe(3); // Thu–Mon
    expect(durationIn({ s: "2026-11-02", e: "2026-11-13" }, "workdays")).toBe(10);
    expect(durationIn({ s: "2026-11-12", e: "2026-11-16" }, "days")).toBe(5);
  });

  it("addUnits steps over weekends", () => {
    expect(addUnits("2026-11-13", 1, "workdays")).toBe("2026-11-16");
    expect(addUnits("2026-11-16", -1, "workdays")).toBe("2026-11-13");
    expect(addUnits("2026-11-02", 9, "workdays")).toBe("2026-11-13");
    expect(snapStart("2026-11-07", "workdays")).toBe("2026-11-09");
  });

  it("days mode matches the plain date helpers", () => {
    let s = "2024-02-20";
    for (let i = 0; i < 400; i++) {
      const n = (i * 37) % 900 - 120;
      expect(addUnits(s, n, "days")).toBe(addDaysIso(s, n));
      const e = addDaysIso(s, Math.abs(n) % 60);
      expect(durationIn({ s, e }, "days")).toBe(durationOf({ s, e }));
      s = addDaysIso(s, 3);
    }
  });

  it("toCalendar falls back to days", () => {
    expect([toCalendar("workdays"), toCalendar("x"), toCalendar(undefined), toCalendar(1)]).toEqual(["workdays", "days", "days", "days"]);
  });
});
