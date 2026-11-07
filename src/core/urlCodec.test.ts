import { describe, expect, it } from "vitest";
import { b64decode, b64encode, decodeProject, encodeProject, sanitizeTask } from "./urlCodec";
import { lk, mk } from "./helpers.testutil";
import { reducer } from "./reducer";
import { MAX_DURATION, type Project } from "./model";

const TODAY = new Date(2026, 10, 6);
const enc = (o: unknown) => "?d=" + b64encode(JSON.stringify(o));

describe("legacy decoding", () => {
  it("v1 spec example", () => {
    const p = decodeProject("?t=Demo&z=1&d=A|2026-11-02|2026-11-06|3|50", TODAY)!;
    expect(p.title).toBe("Demo");
    expect(p.zoom).toBe(1);
    expect(p.tasks).toEqual([{ id: 1, n: "A", s: "2026-11-02", e: "2026-11-06", c: 3, p: 50, deps: [] }]);
    expect(p.nextId).toBe(2);
  });
  it("v1 multiple rows, encoded names", () => {
    const p = decodeProject("?d=" + "A%2520b|2026-11-02|2026-11-06|1|5~B|2026-11-07|2026-11-08|2|10", TODAY)!;
    expect(p.tasks.map((t) => t.n)).toEqual(["A b", "B"]);
    expect(p.title).toBe("My Project");
  });
  it("v2 payload as built by legacy encodeState, with unicode", () => {
    const tasks = [{ n: "Ünïcødé 🚀", s: "2026-11-02", e: "2026-11-06", c: 3, p: 50 }, { n: "B", s: "2026-11-07", e: "2026-11-08", c: 0, p: 0 }];
    const legacy = btoa(unescape(encodeURIComponent(JSON.stringify({ v: 2, t: "Üni", z: 4, tasks }))))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const p = decodeProject("?d=" + legacy, TODAY)!;
    expect(p.title).toBe("Üni");
    expect(p.zoom).toBe(1); // v2 zoom preset ignored: Fit
    expect(p.tasks.map((t) => [t.id, t.n, t.s, t.e, t.c, t.p, t.deps.length])).toEqual([
      [1, "Ünïcødé 🚀", "2026-11-02", "2026-11-06", 3, 50, 0],
      [2, "B", "2026-11-07", "2026-11-08", 0, 0, 0],
    ]);
    expect(p.nextId).toBe(3);
  });
  it("sanitizes with injected today", () => {
    const p = decodeProject(enc({ v: 2, tasks: [{ n: null, s: "bad", c: 99, p: -4 }] }), TODAY)!;
    expect(p.tasks[0]).toMatchObject({ n: "Task", s: "2026-11-06", e: "2026-11-06", c: 7, p: 0 });
  });
  it("b64 helpers round-trip", () => {
    expect(b64decode(b64encode("Ünï 🚀 ~?/+"))).toBe("Ünï 🚀 ~?/+");
  });
});

describe("garbage", () => {
  it.each([["?d=%%%"], ["?d=abc"], ["?d="], [""], ["?t=x"], ["?d=" + btoa("null")], ["?d=A|notadate|x"], ["?d=A|2026-11-02"], ["?d=~"]])(
    "%j -> null",
    (s) => expect(decodeProject(s, TODAY)).toBeNull(),
  );
});

const sample = (): Project => ({
  title: "Hello Ünï", zoom: 2.5, calendar: "days", groups: [], nextId: 10,
  tasks: [
    mk(1, "2026-11-01", "2026-11-05", [], "A"),
    mk(4, "2026-11-06", "2026-11-08", [lk(1)], "B"),
    mk(7, "2026-11-04", "2026-11-05", [lk(4, "FF", -2), lk(1, "SS", 3)], "C"),
  ],
});
const scheduled = () => reducer(sample(), { type: "load", project: sample() });

describe("v5", () => {
  it("round-trips ids, nextId, deps", () => {
    const p = scheduled();
    const q = decodeProject(encodeProject(p), TODAY)!;
    expect(q).toEqual(p);
    expect(q.nextId).toBe(10);
  });
  it("omits d when empty and uses expected shape", () => {
    const json = JSON.parse(b64decode(encodeProject(scheduled()).slice(3)));
    expect(json.v).toBe(6);
    expect("cal" in json).toBe(false); // calendar days are the default
    expect(json.zf).toBe(2.5);
    expect("z" in json).toBe(false);
    expect(json.tasks[0]).toEqual({ i: 1, n: "A", s: "2026-11-01", e: "2026-11-05", c: 0, p: 0 });
    expect(json.tasks[2].d).toEqual([[4, 2, -2], [1, 1, 3]]);
  });
  it("ids survive deletion; links point to the same tasks by name", () => {
    let p = scheduled();
    p = reducer(p, { type: "deleteTask", id: 4 });
    p = reducer(p, { type: "setPredecessors", id: 7, links: [lk(1, "SS", 2)] });
    const q = decodeProject(encodeProject(p), TODAY)!;
    const nameOf = (pr: Project, id: number) => pr.tasks.find((t) => t.id === id)!.n;
    expect(q.tasks.map((t) => t.id)).toEqual([1, 7]);
    expect(nameOf(q, q.tasks[1]!.deps[0]!.pred)).toBe("A");
  });
  it("tampered A<->B cycle keeps at most one link", () => {
    const o = { v: 3, t: "x", z: 2, n: 3, tasks: [{ i: 1, n: "A", s: "2026-11-01", e: "2026-11-02", c: 0, p: 0, d: [[2, 0, 0]] }, { i: 2, n: "B", s: "2026-11-01", e: "2026-11-02", c: 0, p: 0, d: [[1, 0, 0]] }] };
    const q = decodeProject(enc(o), TODAY)!;
    expect(q.tasks[0]!.deps).toHaveLength(1);
    expect(q.tasks[1]!.deps).toHaveLength(0);
  });
  it("drops unknown, self, malformed links; fixes type and lag", () => {
    const o = {
      v: 3, tasks: [
        { i: 1, n: "A", s: "2026-11-01", e: "2026-11-02", c: 0, p: 0 },
        { i: 2, n: "B", s: "2026-11-01", e: "2026-11-02", c: 0, p: 0, d: [[99, 0, 0], [2, 0, 0], "x", [1, 9, 1.5], [1, 1, 0]] },
        { i: 3, n: "C", s: "2026-11-01", e: "2026-11-02", c: 0, p: 0, d: [[1, 2, 99999]] },
      ],
    };
    const q = decodeProject(enc(o), TODAY)!;
    expect(q.tasks[1]!.deps).toEqual([lk(1, "FS", 0)]);
    expect(q.tasks[2]!.deps[0]).toEqual(lk(1, "FF", MAX_DURATION));
  });
  it("repairs missing and duplicate ids and nextId", () => {
    const t = (extra: object) => ({ n: "x", s: "2026-11-01", e: "2026-11-02", c: 0, p: 0, ...extra });
    const q = decodeProject(enc({ v: 3, n: 2, tasks: [t({ i: 5 }), t({ i: 5 }), t({}), t({ i: -1 }), t({ i: 1.5 })] }), TODAY)!;
    expect(q.tasks.map((x) => x.id)).toEqual([5, 6, 7, 8, 9]);
    expect(q.nextId).toBe(10);
  });
  it("schedules on load", () => {
    const o = { v: 3, tasks: [{ i: 1, n: "A", s: "2026-11-01", e: "2026-11-05", c: 0, p: 0 }, { i: 2, n: "B", s: "2026-01-01", e: "2026-01-02", c: 0, p: 0, d: [[1, 0, 0]] }] };
    expect(decodeProject(enc(o), TODAY)!.tasks[1]!.s).toBe("2026-11-06");
  });
  it("legacy v2 decoder (rollback) reads v3 payloads with same task fields", () => {
    const p = scheduled();
    const o = JSON.parse(b64decode(encodeProject(p).slice(3)));
    expect(Array.isArray(o.tasks)).toBe(true);
    const old = (o.tasks as Record<string, unknown>[]).map((t) => sanitizeTask(t, TODAY));
    expect(old).toEqual(p.tasks.map((t) => ({ n: t.n, s: t.s, e: t.e, c: t.c, p: t.p })));
  });
});

describe("zoom factor (v4) and older links", () => {
  const tasks = [{ i: 1, n: "A", s: "2026-11-02", e: "2026-11-06", c: 0, p: 0 }, { i: 2, n: "B", s: "2026-11-09", e: "2026-11-10", c: 1, p: 0, d: [[1, 0, 2]] }];
  it("v4 round-trips zoom 2.5", () => {
    const p = decodeProject(enc({ v: 4, t: "Z", zf: 2.5, n: 3, tasks }), TODAY)!;
    expect(p.zoom).toBe(2.5);
    expect(decodeProject(encodeProject(p), TODAY)).toEqual(p);
  });
  it.each([[undefined], ["x"], [0.5], [null], [-3]])("invalid zf %j opens at Fit", (zf) => {
    expect(decodeProject(enc({ v: 4, t: "Z", zf, n: 3, tasks }), TODAY)!.zoom).toBe(1);
  });
  it("v3 with zoom preset 4 opens at Fit, links intact", () => {
    const p = decodeProject(enc({ v: 3, t: "Old", z: 4, n: 3, tasks }), TODAY)!;
    expect(p.zoom).toBe(1);
    expect(p.tasks[1]!.deps).toEqual([lk(1, "FS", 2)]);
    expect([p.tasks[1]!.s, p.tasks[1]!.e]).toEqual(["2026-11-09", "2026-11-10"]);
  });
});

describe("calendar (v5)", () => {
  const tasks = [{ i: 1, n: "A", s: "2026-11-09", e: "2026-11-13", c: 0, p: 0 }, { i: 2, n: "B", s: "2026-11-16", e: "2026-11-18", c: 1, p: 0, d: [[1, 0, 2]] }];
  it("working-day round trip with links", () => {
    const p = decodeProject(enc({ v: 5, t: "W", zf: 1.5, cal: 1, n: 3, tasks }), TODAY)!;
    expect(p.calendar).toBe("workdays");
    expect([p.tasks[1]!.s, p.tasks[1]!.e]).toEqual(["2026-11-18", "2026-11-20"]); // FS+2 working days
    const json = JSON.parse(b64decode(encodeProject(p).slice(3)));
    expect([json.v, json.cal]).toEqual([6, 1]);
    expect(decodeProject(encodeProject(p), TODAY)).toEqual(p);
  });
  it.each([[undefined], ["x"], [0], [2], ["workdays"]])("cal %j means calendar days", (cal) => {
    expect(decodeProject(enc({ v: 5, t: "W", zf: 1, cal, n: 3, tasks }), TODAY)!.calendar).toBe("days");
  });
  it("tampered Saturday start in a working-day link moves to Monday", () => {
    const p = decodeProject(enc({ v: 5, t: "W", zf: 1, cal: 1, n: 2, tasks: [{ i: 1, n: "A", s: "2026-11-07", e: "2026-11-12", c: 0, p: 0 }] }), TODAY)!;
    expect([p.tasks[0]!.s, p.tasks[0]!.e]).toEqual(["2026-11-09", "2026-11-12"]);
  });
  it("v4 opens in calendar days with its zoom", () => {
    const p = decodeProject(enc({ v: 4, t: "Z", zf: 2.5, cal: 1, n: 3, tasks }), TODAY)!;
    expect([p.calendar, p.zoom]).toEqual(["days", 2.5]);
    expect([p.tasks[1]!.s, p.tasks[1]!.e]).toEqual(["2026-11-16", "2026-11-18"]);
  });
});

describe("groups (v6)", () => {
  const tasks = [
    { i: 1, n: "U", s: "2026-11-09", e: "2026-11-10", c: 0, p: 0 },
    { i: 2, n: "A1", s: "2026-11-11", e: "2026-11-13", c: 1, p: 0, g: 10 },
    { i: 3, n: "G1", s: "2026-11-16", e: "2026-11-17", c: 2, p: 0, g: 20, d: [[2, 0, 0]] },
    { i: 4, n: "A2", s: "2026-11-16", e: "2026-11-18", c: 3, p: 0, g: 10 },
  ];
  const groups = [{ i: 10, n: "Acme", x: 1 }, { i: 20, n: "Globex" }];
  const order = (p: Project) => p.tasks.map(t => `${t.n}${t.g ? "@" + t.g : ""}`);

  it("round-trips a collapsed group in a working-day project", () => {
    const p = decodeProject(enc({ v: 6, t: "G", zf: 1, cal: 1, n: 30, groups, tasks }), TODAY)!;
    expect(p.calendar).toBe("workdays");
    expect(p.groups).toEqual([{ id: 10, n: "Acme", collapsed: true }, { id: 20, n: "Globex", collapsed: false }]);
    expect(order(p)).toEqual(["U", "A1@10", "A2@10", "G1@20"]); // normalised order
    expect(decodeProject(encodeProject(p), TODAY)).toEqual(p);
    const json = JSON.parse(b64decode(encodeProject(p).slice(3)));
    expect(json.groups).toEqual([{ i: 10, n: "Acme", x: 1 }, { i: 20, n: "Globex" }]);
    expect(json.tasks[0]).not.toHaveProperty("g");
  });
  it("an unknown group reference loads ungrouped", () => {
    const p = decodeProject(enc({ v: 6, t: "G", zf: 1, n: 30, groups, tasks: [{ ...tasks[1], g: 77 }] }), TODAY)!;
    expect(p.tasks[0]!.g).toBeUndefined();
  });
  it("a group id colliding with a task id (or a duplicate) gets a fresh id", () => {
    const p = decodeProject(enc({
      v: 6, t: "G", zf: 1, n: 5,
      groups: [{ i: 2, n: "Clash" }, { i: 20, n: "Globex" }, { i: 20, n: "Dupe" }, { n: "NoId" }],
      tasks: [tasks[0], { ...tasks[1], g: 20 }],
    }), TODAY)!;
    const ids = p.groups.map(g => g.id);
    expect(new Set([...ids, ...p.tasks.map(t => t.id)]).size).toBe(ids.length + p.tasks.length);
    expect(p.groups[1]).toEqual({ id: 20, n: "Globex", collapsed: false });
    expect(p.tasks.find(t => t.n === "A1")!.g).toBe(20);
    expect(p.nextId).toBeGreaterThan(Math.max(...ids, ...p.tasks.map(t => t.id)));
  });
  it("v5 opens without groups, keeping calendar and zoom", () => {
    const p = decodeProject(enc({ v: 5, t: "W", zf: 2.5, cal: 1, n: 30, tasks, groups }), TODAY)!;
    expect([p.calendar, p.zoom, p.groups]).toEqual(["workdays", 2.5, []]);
    expect(p.tasks.every(t => t.g === undefined)).toBe(true);
  });
});
