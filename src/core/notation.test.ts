import { describe, expect, it } from "vitest";
import { formatPredecessors, parsePredecessors } from "./notation";
import { lk, mk } from "./helpers.testutil";
import type { Task } from "./model";

const six: Task[] = [1, 2, 3, 4, 5, 6].map((i) => mk(i * 10, "2026-11-01", "2026-11-02"));
// row i -> id i*10; parse for the task in row 6 (id 60)
const parse = (t: string, id = 60, tasks = six) => parsePredecessors(t, tasks, id);

describe("parsePredecessors", () => {
  it.each([
    ["3", [lk(30)]],
    ["3EA", [lk(30)]],
    ["3ea", [lk(30)]],
    ["3EE-2 Tage", [lk(30, "FF", -2)]],
    ["3FF-2d", [lk(30, "FF", -2)]],
    ["3 ff - 2 days", [lk(30, "FF", -2)]],
    ["2aa+1W", [lk(20, "SS", 7)]],
    ["2aa+1W, 4", [lk(20, "SS", 7), lk(40)]],
    ["3FS+2", [lk(30, "FS", 2)]],
    ["3AE", [lk(30, "SF")]],
    ["3 SF + 1 Woche", [lk(30, "SF", 7)]],
    ["3;4SS+1d", [lk(30), lk(40, "SS", 1)]],
    ["3EE-1Wochen", [lk(30, "FF", -7)]],
    ["  ", []],
    ["", []],
    [" ; , ", []],
    ["3;3SS+1", [lk(30, "SS", 1)]],
  ])("%j", (text, links) => {
    expect(parse(text)).toEqual({ ok: true, links });
  });

  it("task 5 given 3 and 4SS+1d", () => {
    expect(parse("3, 4SS+1d", 50)).toEqual({ ok: true, links: [lk(30), lk(40, "SS", 1)] });
  });

  it.each([
    ["3XY+2d", "syntax", 'Invalid entry "3XY+2d"'],
    ["abc", "syntax", 'Invalid entry "abc"'],
    ["3+", "syntax", 'Invalid entry "3+"'],
    ["3+2x", "syntax", 'Invalid entry "3+2x"'],
    ["9EA", "unknown", "Task 9 does not exist"],
    ["0", "unknown", "Task 0 does not exist"],
    ["6", "self", "A task cannot depend on itself"],
  ])("error %j", (text, kind, message) => {
    const r = parse(text);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe(kind);
      expect(r.error.message).toBe(message);
    }
  });

  it("syntax error wins over later errors; first failing entry reported", () => {
    const r = parse("9, 3XY");
    expect(r.ok === false && r.error.kind).toBe("unknown");
  });

  it("rejects cycles", () => {
    const tasks = [mk(1, "2026-11-01", "2026-11-02"), mk(2, "2026-11-01", "2026-11-02", [lk(1)]), mk(3, "2026-11-01", "2026-11-02", [lk(2)])];
    const r = parsePredecessors("3", tasks, 1);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe("cycle");
      expect(r.error.message).toMatch(/^Circular dependency: .*3/);
    }
  });
});

describe("formatPredecessors", () => {
  const links = [lk(30), lk(40, "FF", -2)];
  it("de/en examples", () => {
    expect(formatPredecessors(links, six, "de")).toBe("3;4EE-2T");
    expect(formatPredecessors(links, six, "en")).toBe("3,4FF-2d");
  });
  it.each([
    [lk(30, "FS", 2), "3+2T", "3+2d"],
    [lk(30, "FS", -2), "3-2T", "3-2d"],
    [lk(20, "SS", 0), "2AA", "2SS"],
    [lk(20, "SF", 3), "2AE+3T", "2SF+3d"],
    [lk(20), "2", "2"],
  ])("single %j", (l, de, en) => {
    expect(formatPredecessors([l], six, "de")).toBe(de);
    expect(formatPredecessors([l], six, "en")).toBe(en);
  });
  it("skips unknown, empty gives empty", () => {
    expect(formatPredecessors([lk(999), lk(10)], six, "en")).toBe("1");
    expect(formatPredecessors([], six, "de")).toBe("");
  });
  it("round-trips through the parser", () => {
    const text = formatPredecessors([lk(20, "SS", 7), lk(40, "SF", -3)], six, "de");
    expect(parse(text)).toEqual({ ok: true, links: [lk(20, "SS", 7), lk(40, "SF", -3)] });
  });
});

describe("weeks follow the project calendar", () => {
  it("2aa+1W is 7 days in calendar days and 5 in working days", () => {
    expect(parsePredecessors("2aa+1W", six, 60, "days")).toEqual({ ok: true, links: [lk(20, "SS", 7)] });
    expect(parsePredecessors("2aa+1W", six, 60, "workdays")).toEqual({ ok: true, links: [lk(20, "SS", 5)] });
    expect(parsePredecessors("3EE-2Wochen; 4+3T", six, 60, "workdays")).toEqual({ ok: true, links: [lk(30, "FF", -10), lk(40, "FS", 3)] });
  });
});
