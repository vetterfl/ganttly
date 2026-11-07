import { describe, expect, it } from "vitest";
import { schedule, wouldCreateCycle } from "./schedule";
import { lk, mk } from "./helpers.testutil";
import { reducer } from "./reducer";
import type { Project } from "./model";

const dates = (t: { s: string; e: string }) => [t.s, t.e];

describe("schedule", () => {
  it.each([
    ["FS+2d", "FS", 2, ["2026-11-08", "2026-11-10"], ["2026-11-01", "2026-11-03"], ["2026-11-13", "2026-11-15"]],
    ["FF-2", "FF", -2, ["2026-11-10", "2026-11-20"], ["2026-11-01", "2026-11-04"], ["2026-11-15", "2026-11-18"]],
    ["SS+1", "SS", 1, ["2026-11-05", "2026-11-09"], ["2026-11-01", "2026-11-02"], ["2026-11-06", "2026-11-07"]],
    ["SF", "SF", 0, ["2026-11-10", "2026-11-14"], ["2026-11-01", "2026-11-02"], ["2026-11-08", "2026-11-09"]],
    ["FS0", "FS", 0, ["2026-11-01", "2026-11-09"], ["2026-11-01", "2026-11-05"], ["2026-11-10", "2026-11-14"]],
  ] as const)("%s", (_n, type, lag, p, c, expected) => {
    const out = schedule([mk(1, p[0], p[1]), mk(2, c[0], c[1], [lk(1, type, lag)])]);
    expect(dates(out[1]!)).toEqual(expected);
  });

  it("uses the latest of several links", () => {
    const out = schedule([
      mk(1, "2026-11-01", "2026-11-05"),
      mk(2, "2026-11-01", "2026-11-12"),
      mk(3, "2026-11-01", "2026-11-03", [lk(1), lk(2)]),
    ]);
    expect(dates(out[2]!)).toEqual(["2026-11-13", "2026-11-15"]);
  });

  it("keeps identity of unchanged tasks, returns new objects for changed, same order", () => {
    const a = mk(1, "2026-11-01", "2026-11-05");
    const b = mk(2, "2026-11-06", "2026-11-08", [lk(1)]);
    const c = mk(3, "2026-11-01", "2026-11-02", [lk(1)]);
    const out = schedule([c, a, b]);
    expect(out[1]).toBe(a);
    expect(out[2]).toBe(b);
    expect(out[0]).not.toBe(c);
    expect(out.map((t) => t.id)).toEqual([3, 1, 2]);
    expect(c.s).toBe("2026-11-01");
  });

  it("ignores links to unknown ids and survives cycles", () => {
    const t = mk(1, "2026-11-01", "2026-11-02", [lk(99)]);
    expect(schedule([t])[0]).toBe(t);
    const x = mk(1, "2026-11-01", "2026-11-02", [lk(2)]);
    const y = mk(2, "2026-11-05", "2026-11-06", [lk(1)]);
    const out = schedule([x, y]);
    expect(out[0]).toBe(x);
    expect(out[1]).toBe(y);
  });

  it("schedules in dependency order regardless of array order", () => {
    const out = schedule([
      mk(3, "2026-11-01", "2026-11-01", [lk(2)]),
      mk(2, "2026-11-01", "2026-11-01", [lk(1)]),
      mk(1, "2026-11-10", "2026-11-10"),
    ]);
    expect(out.map((t) => t.s)).toEqual(["2026-11-12", "2026-11-11", "2026-11-10"]);
  });

  it("allows scheduling before the earliest project date", () => {
    const out = schedule([
      mk(1, "2026-11-10", "2026-11-12"),
      mk(2, "2026-11-20", "2026-11-21", [lk(1, "SF", -3)]),
      mk(3, "2026-11-20", "2026-11-21", [lk(1, "FS", -10)]),
    ]);
    expect(dates(out[1]!)).toEqual(["2026-11-05", "2026-11-06"]);
    expect(dates(out[2]!)).toEqual(["2026-11-03", "2026-11-04"]);
  });
});

describe("chain push and pull via reducer", () => {
  const base: Project = {
    title: "x", zoom: 2, calendar: "days", nextId: 4,
    tasks: [
      mk(1, "2026-11-01", "2026-11-05"),
      mk(2, "2026-11-06", "2026-11-08", [lk(1)]),
      mk(3, "2026-11-09", "2026-11-10", [lk(2)]),
    ],
  };
  it.each([[3, "2026-11-08"], [-2, "2026-11-03"], [0, "2026-11-05"]])("finish of task 1 moved by %i", (n, fin) => {
    const p = reducer(base, { type: "setFinish", id: 1, date: fin });
    expect(p.tasks[1]!.s).toBe(n === 3 ? "2026-11-09" : n === -2 ? "2026-11-04" : "2026-11-06");
    expect(dates(p.tasks[2]!)).toEqual(
      n === 3 ? ["2026-11-12", "2026-11-13"] : n === -2 ? ["2026-11-07", "2026-11-08"] : ["2026-11-09", "2026-11-10"],
    );
  });
});

describe("wouldCreateCycle", () => {
  const tasks = [mk(1, "2026-11-01", "2026-11-02"), mk(2, "2026-11-01", "2026-11-02", [lk(1)]), mk(3, "2026-11-01", "2026-11-02", [lk(2)])];
  it.each([
    ["self", 1, [lk(1)], true],
    ["direct", 1, [lk(2)], true],
    ["transitive", 1, [lk(3)], true],
    ["forward ok", 3, [lk(1)], false],
    ["replaces own deps", 2, [lk(1, "SS", 2)], false],
    ["empty", 1, [], false],
    ["unknown ignored", 1, [lk(99)], false],
  ])("%s", (_n, id, links, expected) => {
    expect(wouldCreateCycle(tasks, id, links)).toBe(expected);
  });
});
