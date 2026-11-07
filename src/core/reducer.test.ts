import { describe, expect, it } from "vitest";
import { reducer } from "./reducer";
import { lk, mk } from "./helpers.testutil";
import { MAX_NAME, type Project } from "./model";
import { formatPredecessors } from "./notation";
import { decodeProject, encodeProject } from "./urlCodec";

const proj = (tasks = [mk(1, "2026-11-02", "2026-11-06"), mk(2, "2026-11-09", "2026-11-12")]): Project => ({
  title: "P", zoom: 2, nextId: tasks.length + 1, tasks,
});
const TODAY = "2026-11-06";

describe("reducer basics", () => {
  it("newProject: empty Untitled Project with default zoom and nextId 1", () => {
    const p = reducer({ ...proj(), title: "Old", zoom: 4, nextId: 9 }, { type: "newProject" });
    expect(p).toEqual({ title: "Untitled Project", zoom: 2, tasks: [], nextId: 1 });
  });
  it("newProject: round-trips through the share link", () => {
    const p = reducer(proj(), { type: "newProject" });
    expect(decodeProject(encodeProject(p), new Date(2026, 10, 6))).toEqual(p);
  });
  it("addTask: day after latest finish, 5 days, next id", () => {
    const p = reducer(proj(), { type: "addTask", today: TODAY });
    const t = p.tasks[2]!;
    expect([t.id, t.n, t.s, t.e, t.c, t.p, t.deps]).toEqual([3, "New task", "2026-11-13", "2026-11-17", 2, 0, []]);
    expect(p.nextId).toBe(4);
  });
  it("addTask: uses today when it is later than all finishes (legacy rule)", () => {
    const p = reducer(proj([mk(1, "2026-10-01", "2026-10-05")]), { type: "addTask", today: TODAY });
    expect([p.tasks[1]!.s, p.tasks[1]!.e]).toEqual(["2026-11-07", "2026-11-11"]);
  });
  it("addTask: empty project starts today", () => {
    const p = reducer({ title: "", zoom: 2, tasks: [], nextId: 1 }, { type: "addTask", today: TODAY });
    expect([p.tasks[0]!.s, p.tasks[0]!.e, p.tasks[0]!.c]).toEqual([TODAY, "2026-11-10", 0]);
  });
  it("rename truncates", () => {
    const p = reducer(proj(), { type: "rename", id: 1, name: "x".repeat(500) });
    expect(p.tasks[0]!.n).toHaveLength(MAX_NAME);
  });
  it.each([[0], [-1], [3651], [2.5], [NaN]])("setDuration %s is a no-op", (days) => {
    const p = proj();
    expect(reducer(p, { type: "setDuration", id: 1, days })).toBe(p);
  });
  it("setDuration valid", () => {
    expect(reducer(proj(), { type: "setDuration", id: 1, days: 3 }).tasks[0]!.e).toBe("2026-11-04");
    expect(reducer(proj(), { type: "setDuration", id: 1, days: 1 }).tasks[0]!.e).toBe("2026-11-02");
  });
  it("manual setStart/setFinish clamp", () => {
    let p = reducer(proj(), { type: "setStart", id: 1, date: "2026-11-20" });
    expect([p.tasks[0]!.s, p.tasks[0]!.e]).toEqual(["2026-11-20", "2026-11-20"]);
    p = reducer(proj(), { type: "setFinish", id: 2, date: "2026-11-01" });
    expect([p.tasks[1]!.s, p.tasks[1]!.e]).toEqual(["2026-11-01", "2026-11-01"]);
  });
  it("invalid dates ignored", () => {
    const p = proj();
    expect(reducer(p, { type: "setStart", id: 1, date: "nope" })).toBe(p);
    expect(reducer(p, { type: "setFinish", id: 1, date: "" })).toBe(p);
  });
  it("color, progress, title, zoom", () => {
    expect(reducer(proj(), { type: "setColor", id: 1, color: 99 }).tasks[0]!.c).toBe(7);
    expect(reducer(proj(), { type: "setColor", id: 1, color: -3 }).tasks[0]!.c).toBe(0);
    expect(reducer(proj(), { type: "setProgress", id: 1, pct: 150 }).tasks[0]!.p).toBe(100);
    expect(reducer(proj(), { type: "setProgress", id: 1, pct: 33.6 }).tasks[0]!.p).toBe(34);
    expect(reducer(proj(), { type: "setProgress", id: 1, pct: -5 }).tasks[0]!.p).toBe(0);
    expect(reducer(proj(), { type: "setTitle", title: " a " }).title).toBe(" a ");
    expect(reducer(proj(), { type: "setZoom", zoom: 99 }).zoom).toBe(4);
  });
  it("unknown id is a no-op; immutability", () => {
    const p = proj();
    expect(reducer(p, { type: "rename", id: 99, name: "x" })).toBe(p);
    reducer(p, { type: "rename", id: 1, name: "z" });
    expect(p.tasks[0]!.n).toBe("T1");
  });
  it("load schedules", () => {
    const p = reducer(proj(), { type: "load", project: proj([mk(1, "2026-11-01", "2026-11-05"), mk(2, "2026-11-01", "2026-11-02", [lk(1)])]) });
    expect(p.tasks[1]!.s).toBe("2026-11-06");
  });
});

describe("dependencies via reducer", () => {
  it("adding a link auto-schedules the task", () => {
    const p0 = proj([mk(1, "2026-11-04", "2026-11-09"), mk(2, "2026-11-01", "2026-11-05")]);
    const p = reducer(p0, { type: "setPredecessors", id: 2, links: [lk(1)] });
    expect([p.tasks[1]!.s, p.tasks[1]!.e]).toEqual(["2026-11-10", "2026-11-14"]);
  });
  it("removing the last link keeps the dates and makes it manual", () => {
    const p0 = proj([mk(1, "2026-11-04", "2026-11-09"), mk(2, "2026-11-10", "2026-11-14", [lk(1)])]);
    const p = reducer(p0, { type: "setPredecessors", id: 2, links: [] });
    expect([p.tasks[1]!.s, p.tasks[1]!.e, p.tasks[1]!.deps]).toEqual(["2026-11-10", "2026-11-14", []]);
    expect(reducer(p, { type: "setStart", id: 2, date: "2026-11-11" }).tasks[1]!.s).toBe("2026-11-11");
  });
  it("finish edit on auto task changes duration and reschedules successors", () => {
    const p0 = proj([
      mk(1, "2026-11-01", "2026-11-05"),
      mk(2, "2026-11-06", "2026-11-08", [lk(1)]),
      mk(3, "2026-11-09", "2026-11-10", [lk(2)]),
    ]);
    const p = reducer(p0, { type: "setFinish", id: 2, date: "2026-11-12" });
    expect([p.tasks[1]!.s, p.tasks[1]!.e]).toEqual(["2026-11-06", "2026-11-12"]);
    expect([p.tasks[2]!.s, p.tasks[2]!.e]).toEqual(["2026-11-13", "2026-11-14"]);
    const q = reducer(p0, { type: "setFinish", id: 2, date: "2026-10-01" });
    expect([q.tasks[1]!.s, q.tasks[1]!.e]).toEqual(["2026-11-06", "2026-11-06"]);
  });
  it("setDuration on auto task reschedules successors", () => {
    const p0 = proj([mk(1, "2026-11-01", "2026-11-05"), mk(2, "2026-11-06", "2026-11-08", [lk(1)]), mk(3, "2026-11-09", "2026-11-10", [lk(2)])]);
    expect(reducer(p0, { type: "setDuration", id: 2, days: 1 }).tasks[2]!.s).toBe("2026-11-07");
  });
  it("setStart on auto task is ignored", () => {
    const p0 = proj([mk(1, "2026-11-01", "2026-11-05"), mk(2, "2026-11-06", "2026-11-08", [lk(1)])]);
    expect(reducer(p0, { type: "setStart", id: 2, date: "2026-11-20" })).toBe(p0);
  });
  it("rejects unknown, self and cyclic predecessors", () => {
    const p0 = proj([mk(1, "2026-11-01", "2026-11-05"), mk(2, "2026-11-06", "2026-11-08", [lk(1)])]);
    expect(reducer(p0, { type: "setPredecessors", id: 1, links: [lk(99)] })).toBe(p0);
    expect(reducer(p0, { type: "setPredecessors", id: 1, links: [lk(1)] })).toBe(p0);
    expect(reducer(p0, { type: "setPredecessors", id: 1, links: [lk(2)] })).toBe(p0);
  });
  it("delete predecessor: successor becomes manual, dates kept", () => {
    const p0 = proj([mk(1, "2026-11-01", "2026-11-05"), mk(3, "2026-11-06", "2026-11-09"), mk(4, "2026-11-10", "2026-11-12", [lk(3)])]);
    const p = reducer(p0, { type: "deleteTask", id: 3 });
    expect(p.tasks.map((t) => t.id)).toEqual([1, 4]);
    expect([p.tasks[1]!.s, p.tasks[1]!.e, p.tasks[1]!.deps]).toEqual(["2026-11-10", "2026-11-12", []]);
  });
  it("delete keeps other links and reschedules; renumbering follows tasks", () => {
    const tasks = [1, 2, 3, 4, 5].map((i) => mk(i, "2026-11-01", "2026-11-02"));
    tasks[4] = mk(5, "2026-11-03", "2026-11-04", [lk(4)]);
    const p0 = proj(tasks);
    expect(formatPredecessors(p0.tasks[4]!.deps, p0.tasks, "en")).toBe("4");
    const p = reducer(p0, { type: "deleteTask", id: 2 });
    expect(p.tasks).toHaveLength(4);
    expect(formatPredecessors(p.tasks[3]!.deps, p.tasks, "en")).toBe("3");
    expect(p.tasks[3]!.id).toBe(5);
  });
  it("ids are never reused", () => {
    let p = reducer(proj(), { type: "deleteTask", id: 2 });
    p = reducer(p, { type: "addTask", today: TODAY });
    expect(p.tasks[1]!.id).toBe(3);
  });
});
