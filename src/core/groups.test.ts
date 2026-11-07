import { describe, expect, it } from "vitest";
import { displayRows, groupDropIndex, groupSlots, moveTarget, normalizeOrder, rollup, snapGroupSlot, taskDropTarget } from "./groups";
import { mk } from "./helpers.testutil";
import type { Group, Project, Task } from "./model";

const g = (id: number, n: string, collapsed = false): Group => ({ id, n, collapsed });
const inG = (t: Task, gid: number): Task => ({ ...t, g: gid });
const proj = (tasks: Task[], groups: Group[]): Project => ({ title: "G", zoom: 1, calendar: "days", groups, tasks, nextId: 100 });
const names = (p: Project) => p.tasks.map(t => t.n);

describe("normalizeOrder", () => {
  it("stable partition: ungrouped, then groups in order", () => {
    const p = proj([
      inG(mk(1, "2026-11-02", "2026-11-03", [], "A1"), 10), mk(2, "2026-11-02", "2026-11-03", [], "U1"),
      inG(mk(3, "2026-11-02", "2026-11-03", [], "G1"), 20), inG(mk(4, "2026-11-02", "2026-11-03", [], "A2"), 10),
      mk(5, "2026-11-02", "2026-11-03", [], "U2"),
    ], [g(10, "Acme"), g(20, "Globex")]);
    expect(names(normalizeOrder(p))).toEqual(["U1", "U2", "A1", "A2", "G1"]);
  });
  it("only a regrouped task moves; others keep their relative order", () => {
    const base = proj([
      mk(1, "2026-11-02", "2026-11-03", [], "U1"), mk(2, "2026-11-02", "2026-11-03", [], "U2"),
      inG(mk(3, "2026-11-02", "2026-11-03", [], "A1"), 10), inG(mk(4, "2026-11-02", "2026-11-03", [], "A2"), 10),
      inG(mk(5, "2026-11-02", "2026-11-03", [], "G1"), 20),
    ], [g(10, "Acme"), g(20, "Globex")]);
    expect(normalizeOrder(base)).toBe(base);
    const moved = { ...base, tasks: base.tasks.map(t => (t.id === 1 ? { ...t, g: 20 } : t)) };
    expect(names(normalizeOrder(moved))).toEqual(["U2", "A1", "A2", "U1", "G1"]);
  });
  it("tasks of unknown groups become ungrouped", () => {
    const p = normalizeOrder(proj([inG(mk(1, "2026-11-02", "2026-11-03", [], "X"), 99)], []));
    expect(p.tasks[0]!.g).toBeUndefined();
    expect("g" in p.tasks[0]!).toBe(false);
  });
});

describe("rollup", () => {
  const a = { ...mk(1, "2026-11-02", "2026-11-06", [], "A"), p: 50 };
  const b = { ...mk(2, "2026-11-10", "2026-11-12", [], "B"), p: 100 };
  it("spec example: 11 days, 69%", () => {
    expect(rollup([a, b], "days")).toEqual({ s: "2026-11-02", e: "2026-11-12", d: 11, p: 69 });
  });
  it("in working days: 9 days, 69%", () => {
    expect(rollup([a, b], "workdays")).toEqual({ s: "2026-11-02", e: "2026-11-12", d: 9, p: 69 });
  });
  it("empty group: null", () => expect(rollup([], "days")).toBeNull());
});

describe("displayRows", () => {
  const p = proj([
    mk(1, "2026-11-02", "2026-11-03", [], "U"),
    inG(mk(2, "2026-11-02", "2026-11-03", [], "A1"), 10), inG(mk(3, "2026-11-02", "2026-11-03", [], "A2"), 10),
    inG(mk(4, "2026-11-02", "2026-11-03", [], "G1"), 20),
  ], [g(10, "Acme"), g(20, "Globex"), g(30, "Empty")]);
  const label = (r: ReturnType<typeof displayRows>[number]) => (r.kind === "group" ? `[${r.group.n}]` : `${r.number}:${r.task.n}`);
  it("display order with headers; numbers skip headers", () => {
    expect(displayRows(p, new Set()).map(label)).toEqual(["1:U", "[Acme]", "2:A1", "3:A2", "[Globex]", "4:G1", "[Empty]"]);
  });
  it("collapsed tasks are omitted but still counted", () => {
    const c = { ...p, groups: [g(10, "Acme", true), g(20, "Globex"), g(30, "Empty")] };
    const rows = displayRows(c, new Set([2]));
    expect(rows.map(label)).toEqual(["1:U", "[Acme]", "[Globex]", "4:G1", "[Empty]"]);
    const acme = rows[1]!;
    expect(acme.kind === "group" && acme.rollup).toEqual({ s: "2026-11-02", e: "2026-11-03", d: 2, p: 0 });
    const empty = rows[4]!;
    expect(empty.kind === "group" && empty.rollup).toBeNull();
  });
  it("detail flags follow the expanded set", () => {
    const rows = displayRows(p, new Set([3]));
    expect(rows.filter(r => r.kind === "task" && r.detail).map(label)).toEqual(["3:A2"]);
  });
});

describe("moving across headers and dropping", () => {
  // U1 U2 | Acme: A1 A2 | Globex: G1 | Empty
  const p = normalizeOrder(proj([
    mk(1, "2026-11-02", "2026-11-03", [], "U1"), mk(2, "2026-11-02", "2026-11-03", [], "U2"),
    inG(mk(3, "2026-11-02", "2026-11-03", [], "A1"), 10), inG(mk(4, "2026-11-02", "2026-11-03", [], "A2"), 10),
    inG(mk(5, "2026-11-02", "2026-11-03", [], "G1"), 20),
  ], [g(10, "Acme"), g(20, "Globex"), g(30, "Empty")]));
  const rows = displayRows(p, new Set());
  // rows: 0 U1, 1 U2, 2 [Acme], 3 A1, 4 A2, 5 [Globex], 6 G1, 7 [Empty]

  it("moveTarget: within a section swaps; at an edge crosses the header", () => {
    expect(moveTarget(p, 2, -1)).toEqual({ toIndex: 0 });
    expect(moveTarget(p, 1, -1)).toBeNull();
    expect(moveTarget(p, 3, -1)).toEqual({ toIndex: 2, group: null });   // A1 up → last ungrouped
    expect(moveTarget(p, 2, 1)).toEqual({ toIndex: 1, group: 10 });      // U2 down → first of Acme
    expect(moveTarget(p, 4, 1)).toEqual({ toIndex: 3, group: 20 });      // A2 down → first of Globex
    expect(moveTarget(p, 5, 1)).toEqual({ toIndex: 4, group: 30 });      // G1 down → into the empty group
  });
  it("moveTarget at the very bottom is null", () => {
    const last = normalizeOrder({ ...p, groups: p.groups.slice(0, 2) });
    expect(moveTarget(last, 5, 1)).toBeNull();
  });

  it("taskDropTarget: directly below a header → first task of that group", () => {
    expect(taskDropTarget(p, rows, 1, 6)).toEqual({ toIndex: 3, group: 20 });  // U1 between [Globex] and G1
  });
  it("taskDropTarget: above a header → end of the section above", () => {
    expect(taskDropTarget(p, rows, 1, 5)).toEqual({ toIndex: 3, group: 10 });  // U1 above [Globex] → last of Acme
    expect(taskDropTarget(p, rows, 3, 2)).toEqual({ toIndex: 2, group: null }); // A1 above [Acme] → last ungrouped
  });
  it("taskDropTarget: at the end → the last section (an empty group)", () => {
    expect(taskDropTarget(p, rows, 1, 8)).toEqual({ toIndex: 4, group: 30 });
  });
  it("taskDropTarget: no-op slots return null", () => {
    expect(taskDropTarget(p, rows, 2, 1)).toBeNull(); // above itself
    expect(taskDropTarget(p, rows, 2, 2)).toBeNull(); // below itself, still last ungrouped
  });

  it("group slots snap between groups; drop index", () => {
    expect(groupSlots(rows)).toEqual([2, 5, 7, 8]);
    expect(snapGroupSlot(rows, 4)).toBe(5);
    expect(snapGroupSlot(rows, 0)).toBe(2);
    expect(groupDropIndex(p, rows, 20, 2)).toBe(0);   // Globex above Acme
    expect(groupDropIndex(p, rows, 10, 8)).toBe(2);   // Acme to the end
    expect(groupDropIndex(p, rows, 10, 5)).toBeNull(); // stays
  });
});
