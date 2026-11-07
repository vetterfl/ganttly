import { describe, expect, it } from "vitest";
import { reducer } from "./reducer";
import { lk, mk } from "./helpers.testutil";
import { MAX_NAME, sampleProject, type Project } from "./model";
import { formatPredecessors } from "./notation";
import { decodeProject, encodeProject } from "./urlCodec";
import { displayRows } from "./groups";

const proj = (tasks = [mk(1, "2026-11-02", "2026-11-06"), mk(2, "2026-11-09", "2026-11-12")]): Project => ({
  title: "P", zoom: 2, calendar: "days", groups: [], nextId: tasks.length + 1, tasks,
});
const TODAY = "2026-11-06";

describe("reducer basics", () => {
  it("newProject: empty Untitled Project with default zoom and nextId 1", () => {
    const p = reducer({ ...proj(), title: "Old", zoom: 4, nextId: 9 }, { type: "newProject" });
    expect(p).toEqual({ title: "Untitled Project", zoom: 1, calendar: "days", groups: [], tasks: [], nextId: 1 });
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
    const p = reducer({ title: "", zoom: 2, calendar: "days", groups: [], tasks: [], nextId: 1 }, { type: "addTask", today: TODAY });
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
    expect(reducer(proj(), { type: "setZoom", zoom: 2.5 }).zoom).toBe(2.5);
    expect(reducer(proj(), { type: "setZoom", zoom: 0.5 }).zoom).toBe(1);
    expect(reducer(proj(), { type: "setZoom", zoom: NaN }).zoom).toBe(1);
    expect(reducer(proj(), { type: "setZoom", zoom: Infinity }).zoom).toBe(1);
    expect(reducer(proj(), { type: "setZoom", zoom: 1e9 }).zoom).toBe(10000);
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

describe("working-day calendar", () => {
  const wp = (tasks: ReturnType<typeof mk>[]): Project =>
    reducer({ title: "W", zoom: 1, calendar: "workdays", groups: [], nextId: 99, tasks }, { type: "load", project: { title: "W", zoom: 1, calendar: "workdays", groups: [], nextId: 99, tasks } });
  const span = (p: Project, id: number) => { const t = p.tasks.find(x => x.id === id)!; return [t.s, t.e]; };
  const P = (s: string, e: string) => mk(1, s, e);
  const S3 = (deps: ReturnType<typeof lk>[]) => mk(2, "2026-11-02", "2026-11-04", deps); // 3 working days

  it("auto-scheduled after a Friday finish starts Monday", () => {
    let p = wp([P("2026-11-09", "2026-11-13"), mk(2, "2026-11-23", "2026-11-25")]);
    p = reducer(p, { type: "setPredecessors", id: 2, links: [lk(1)] });
    expect(span(p, 2)).toEqual(["2026-11-16", "2026-11-18"]);
  });
  it("FS+2", () => expect(span(wp([P("2026-11-09", "2026-11-13"), S3([lk(1, "FS", 2)])]), 2)).toEqual(["2026-11-18", "2026-11-20"]));
  it("FF−2 (S has 4 days)", () => {
    const p = wp([P("2026-11-16", "2026-11-20"), mk(2, "2026-11-02", "2026-11-05", [lk(1, "FF", -2)])]);
    expect(span(p, 2)).toEqual(["2026-11-13", "2026-11-18"]);
  });
  it("SS+1", () => expect(span(wp([P("2026-11-13", "2026-11-13"), S3([lk(1, "SS", 1)])]), 2)[0]).toBe("2026-11-16"));
  it("SF (S has 2 days)", () => {
    const p = wp([P("2026-11-16", "2026-11-18"), mk(2, "2026-11-02", "2026-11-03", [lk(1, "SF")])]);
    expect(span(p, 2)).toEqual(["2026-11-12", "2026-11-13"]);
  });
  it("Finish on a Sunday for an auto task snaps to Friday and sets 4 days", () => {
    let p = wp([P("2026-11-02", "2026-11-09"), mk(2, "2026-11-10", "2026-11-12", [lk(1)])]);
    expect(span(p, 2)).toEqual(["2026-11-10", "2026-11-12"]);
    p = reducer(p, { type: "setFinish", id: 2, date: "2026-11-15" });
    expect(span(p, 2)).toEqual(["2026-11-10", "2026-11-13"]);
  });
  it("Duration 10 from Monday ends Friday of the next week", () => {
    const p = reducer(wp([P("2026-11-02", "2026-11-04")]), { type: "setDuration", id: 1, days: 10 });
    expect(span(p, 1)).toEqual(["2026-11-02", "2026-11-13"]);
  });
  it("Duration 3 from Thursday crosses the weekend", () => {
    const p = reducer(wp([P("2026-11-12", "2026-11-12")]), { type: "setDuration", id: 1, days: 3 });
    expect(span(p, 1)).toEqual(["2026-11-12", "2026-11-16"]);
  });
  it("Add task after a Friday finish: Monday to Friday", () => {
    const p = reducer(wp([P("2026-11-16", "2026-11-20")]), { type: "addTask", today: "2026-11-06" });
    expect(span(p, 99)).toEqual(["2026-11-23", "2026-11-27"]);
  });
  it("Add task to an empty project on a Saturday starts Monday", () => {
    const p = reducer(wp([]), { type: "addTask", today: "2026-11-07" });
    expect(span(p, 99)).toEqual(["2026-11-09", "2026-11-13"]);
  });
  it("Start on a Saturday moves to Monday", () => {
    const p = reducer(wp([P("2026-11-02", "2026-11-13")]), { type: "setStart", id: 1, date: "2026-11-07" });
    expect(span(p, 1)).toEqual(["2026-11-09", "2026-11-13"]);
  });
  it("switching to working days keeps (snapped) dates; switching back keeps them", () => {
    const days = reducer(proj([mk(1, "2026-11-07", "2026-11-12")]), { type: "load", project: proj([mk(1, "2026-11-07", "2026-11-12")]) });
    expect(span(days, 1)).toEqual(["2026-11-07", "2026-11-12"]);
    const w = reducer(days, { type: "setCalendar", calendar: "workdays" });
    expect(w.calendar).toBe("workdays");
    expect(span(w, 1)).toEqual(["2026-11-09", "2026-11-12"]);
    const back = reducer(w, { type: "setCalendar", calendar: "days" });
    expect(back.calendar).toBe("days");
    expect(span(back, 1)).toEqual(["2026-11-09", "2026-11-12"]);
    expect(reducer(back, { type: "setCalendar", calendar: "days" })).toBe(back);
  });
  it("switching reschedules links with lags in the new unit", () => {
    const base = proj([mk(1, "2026-11-09", "2026-11-13"), mk(2, "2026-11-02", "2026-11-04", [lk(1, "FS", 2)])]);
    const d = reducer(base, { type: "load", project: base });
    expect(span(d, 2)).toEqual(["2026-11-16", "2026-11-18"]); // Sat+Sun counted
    const w = reducer(d, { type: "setCalendar", calendar: "workdays" });
    expect(span(w, 2)).toEqual(["2026-11-18", "2026-11-20"]);
  });
  it("new project is calendar days", () => {
    expect(reducer(wp([]), { type: "newProject" }).calendar).toBe("days");
  });
});

describe("moveTask", () => {
  const five = () => proj([1, 2, 3, 4, 5].map(i => mk(i, "2026-11-02", "2026-11-04")));
  const ids = (p: Project) => p.tasks.map(t => t.id);
  it("moves down and up", () => {
    expect(ids(reducer(five(), { type: "moveTask", id: 2, toIndex: 3 }))).toEqual([1, 3, 4, 2, 5]);
    expect(ids(reducer(five(), { type: "moveTask", id: 5, toIndex: 0 }))).toEqual([5, 1, 2, 3, 4]);
  });
  it("clamps at both ends", () => {
    expect(ids(reducer(five(), { type: "moveTask", id: 2, toIndex: 99 }))).toEqual([1, 3, 4, 5, 2]);
    expect(ids(reducer(five(), { type: "moveTask", id: 4, toIndex: -3 }))).toEqual([4, 1, 2, 3, 5]);
  });
  it("is a no-op (same object) when the position doesn't change or the id is unknown", () => {
    const p = five();
    expect(reducer(p, { type: "moveTask", id: 3, toIndex: 2 })).toBe(p);
    expect(reducer(p, { type: "moveTask", id: 1, toIndex: -1 })).toBe(p);
    expect(reducer(p, { type: "moveTask", id: 42, toIndex: 0 })).toBe(p);
    expect(reducer(p, { type: "moveTask", id: 1, toIndex: NaN })).toBe(p);
  });
  it("links follow the task; dates are unchanged", () => {
    let p = proj([
      mk(1, "2026-11-02", "2026-11-03"), mk(2, "2026-11-04", "2026-11-05"), mk(3, "2026-11-06", "2026-11-07"),
      mk(4, "2026-11-08", "2026-11-09"), mk(5, "2026-11-02", "2026-11-03", [lk(2)]),
    ]);
    p = reducer(p, { type: "load", project: p });
    const before = p.tasks.map(t => [t.id, t.s, t.e]).sort();
    expect(formatPredecessors(p.tasks[4]!.deps, p.tasks, "de")).toBe("2");
    p = reducer(p, { type: "moveTask", id: 2, toIndex: 3 });
    expect(p.tasks[3]!.id).toBe(2);
    const t5 = p.tasks.find(t => t.id === 5)!;
    expect(formatPredecessors(t5.deps, p.tasks, "de")).toBe("4");
    expect(p.tasks.map(t => [t.id, t.s, t.e]).sort()).toEqual(before);
  });
});

describe("groups", () => {
  // U | Acme: A1, A2 | Globex: G1   (ids: U=1, A1=2, A2=3, G1=4; groups Acme=10, Globex=20)
  const base = (): Project => {
    const p: Project = {
      title: "G", zoom: 1, calendar: "days", nextId: 30,
      groups: [{ id: 10, n: "Acme", collapsed: false }, { id: 20, n: "Globex", collapsed: false }],
      tasks: [
        mk(1, "2026-11-02", "2026-11-03", [], "U"),
        { ...mk(2, "2026-11-04", "2026-11-05", [], "A1"), g: 10 },
        { ...mk(3, "2026-11-06", "2026-11-09", [lk(2)], "A2"), g: 10 },
        { ...mk(4, "2026-11-10", "2026-11-12", [lk(3)], "G1"), g: 20 },
      ],
    };
    return reducer(p, { type: "load", project: p });
  };
  const order = (p: Project) => p.tasks.map(t => `${t.n}${t.g ? "@" + t.g : ""}`);

  it("addGroup appends 'New group' with the next id", () => {
    const p = reducer(base(), { type: "addGroup" });
    expect(p.groups.at(-1)).toEqual({ id: 30, n: "New group", collapsed: false });
    expect(p.nextId).toBe(31);
  });
  it("renameGroup truncates; toggleGroup flips collapsed", () => {
    let p = reducer(base(), { type: "renameGroup", id: 10, name: "x".repeat(200) });
    expect(p.groups[0]!.n).toHaveLength(MAX_NAME);
    p = reducer(p, { type: "toggleGroup", id: 20 });
    expect(p.groups[1]!.collapsed).toBe(true);
    expect(reducer(p, { type: "toggleGroup", id: 99 })).toBe(p);
  });
  it("addTask into a group becomes that group's last task; unknown group is a no-op", () => {
    const p = reducer(base(), { type: "addTask", today: TODAY, group: 10 });
    expect(order(p)).toEqual(["U", "A1@10", "A2@10", "New task@10", "G1@20"]);
    const b = base();
    expect(reducer(b, { type: "addTask", today: TODAY, group: 99 })).toBe(b);
  });
  it("setTaskGroup moves U to the end of Globex", () => {
    const p = reducer(base(), { type: "setTaskGroup", id: 1, group: 20 });
    expect(order(p)).toEqual(["A1@10", "A2@10", "G1@20", "U@20"]);
    const back = reducer(p, { type: "setTaskGroup", id: 1, group: null });
    expect(order(back)).toEqual(["U", "A1@10", "A2@10", "G1@20"]);
  });
  it("moving A1 up across the header makes it the last ungrouped task", () => {
    const p = reducer(base(), { type: "moveTask", id: 2, toIndex: 1, group: null });
    expect(order(p)).toEqual(["U", "A1", "A2@10", "G1@20"]);
  });
  it("moving A2 down across the header makes it Globex's first task", () => {
    const p = reducer(base(), { type: "moveTask", id: 3, toIndex: 2, group: 20 });
    expect(order(p)).toEqual(["U", "A1@10", "A2@20", "G1@20"]);
  });
  it("dropping U as the first task of Globex", () => {
    const p = reducer(base(), { type: "moveTask", id: 1, toIndex: 2, group: 20 });
    expect(order(p)).toEqual(["A1@10", "A2@10", "U@20", "G1@20"]);
  });
  it("moveGroup moves a group with its tasks; numbers follow", () => {
    const p = reducer(base(), { type: "moveGroup", id: 20, toIndex: 0 });
    expect(p.groups.map(g => g.n)).toEqual(["Globex", "Acme"]);
    expect(order(p)).toEqual(["U", "G1@20", "A1@10", "A2@10"]);
    // links still point at the same tasks
    expect(formatPredecessors(p.tasks[1]!.deps, p.tasks, "de")).toBe("4");
  });
  it("deleteGroup keeping tasks: they join the end of the ungrouped section, links intact", () => {
    const p = reducer(base(), { type: "deleteGroup", id: 10, withTasks: false });
    expect(p.groups.map(g => g.n)).toEqual(["Globex"]);
    expect(order(p)).toEqual(["U", "A1", "A2", "G1@20"]);
    expect(p.tasks.find(t => t.id === 3)!.deps).toEqual([lk(2)]);
    expect(p.tasks.map(t => [t.s, t.e])).toEqual(base().tasks.map(t => [t.s, t.e]));
  });
  it("deleteGroup with tasks: links to them go, successors become manual with their dates", () => {
    const before = base().tasks.find(t => t.id === 4)!;
    const p = reducer(base(), { type: "deleteGroup", id: 10, withTasks: true });
    expect(order(p)).toEqual(["U", "G1@20"]);
    const g1 = p.tasks.find(t => t.id === 4)!;
    expect(g1.deps).toEqual([]);
    expect([g1.s, g1.e]).toEqual([before.s, before.e]);
  });
  it("roll-ups follow scheduling", () => {
    let p = base();
    p = reducer(p, { type: "setDuration", id: 2, days: 5 }); // A1 longer → A2 and G1 pushed
    const acme = displayRows(p, new Set()).find(r => r.kind === "group" && r.group.id === 10)!;
    expect(acme.kind === "group" && acme.rollup!.e).toBe(p.tasks.find(t => t.id === 3)!.e);
  });
  it("tasks referencing a deleted group can't survive normalisation", () => {
    const p = reducer(base(), { type: "moveTask", id: 1, toIndex: 3, group: 99 });
    expect(p).toEqual(base());
  });
});

describe("default names passed in by the UI", () => {
  it("addTask / addGroup / newProject use the given names (truncated); English otherwise", () => {
    let p = reducer(proj(), { type: "addTask", today: TODAY, name: "Neuer Vorgang" });
    expect(p.tasks.at(-1)!.n).toBe("Neuer Vorgang");
    p = reducer(p, { type: "addGroup", name: "Neue Gruppe" });
    expect(p.groups.at(-1)!.n).toBe("Neue Gruppe");
    expect(reducer(p, { type: "addGroup" }).groups.at(-1)!.n).toBe("New group");
    expect(reducer(p, { type: "newProject", title: "Unbenanntes Projekt" }).title).toBe("Unbenanntes Projekt");
    expect(reducer(p, { type: "newProject" }).title).toBe("Untitled Project");
    expect(reducer(proj(), { type: "addTask", today: TODAY, name: "x".repeat(300) }).tasks.at(-1)!.n).toHaveLength(MAX_NAME);
  });
  it("sampleProject takes localized names", () => {
    const s = sampleProject(new Date(2026, 10, 7), { title: "Website-Relaunch", tasks: ["A", "B", "C", "D", "E", "F", "G"] });
    expect(s.title).toBe("Website-Relaunch");
    expect(s.tasks.map(t => t.n)).toEqual(["A", "B", "C", "D", "E", "F", "G"]);
    expect(sampleProject(new Date(2026, 10, 7)).tasks[0]!.n).toBe("Research & strategy");
  });
});
