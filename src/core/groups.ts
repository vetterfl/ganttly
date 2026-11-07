// Groups: order invariant, roll-ups and the display-row list shared by the
// grid, timeline, arrows and row dragging. Pure.
import { calendarOps, durationIn, type Calendar } from "./calendar";
import type { Group, Project, Task } from "./model";

/**
 * Enforce the order invariant: ungrouped tasks first, then each group's tasks
 * in group order; relative order within a section is kept (stable partition).
 * Tasks pointing at a group that doesn't exist become ungrouped. Returns the
 * same project when nothing changes.
 */
export function normalizeOrder(p: Project): Project {
  const rank = new Map<number, number>(p.groups.map((g, i) => [g.id, i + 1]));
  let fixed = false;
  const tasks = p.tasks.map((t) => {
    if (t.g === undefined || rank.has(t.g)) return t;
    fixed = true;
    const rest = { ...t };
    delete rest.g;
    return rest;
  });
  const sectionOf = (t: Task) => (t.g === undefined ? 0 : (rank.get(t.g) as number));
  const sorted = tasks
    .map((t, i) => [t, i] as const)
    .sort((a, b) => sectionOf(a[0]) - sectionOf(b[0]) || a[1] - b[1])
    .map(([t]) => t);
  const moved = sorted.some((t, i) => t !== tasks[i]);
  if (!fixed && !moved) return p;
  return { ...p, tasks: sorted };
}

export interface Rollup {
  /** Earliest start, latest finish (ISO). */
  s: string;
  e: string;
  /** Span from s to e, inclusive, counted in the project calendar. */
  d: number;
  /** Progress weighted by each task's duration (in the project calendar), rounded. */
  p: number;
}

/** Roll-up of a group's tasks; null for an empty group. */
export function rollup(tasks: readonly Task[], cal: Calendar): Rollup | null {
  if (!tasks.length) return null;
  let s = tasks[0]!.s, e = tasks[0]!.e, w = 0, wp = 0;
  for (const t of tasks) {
    if (t.s < s) s = t.s;
    if (t.e > e) e = t.e;
    const d = durationIn(t, cal);
    w += d;
    wp += d * t.p;
  }
  const ops = calendarOps(cal);
  return { s, e, d: Math.max(1, ops.finishIdx(e) - ops.startIdx(s) + 1), p: Math.round(wp / w) };
}

export type Row =
  | { kind: "task"; task: Task; /** 1-based task number (counts hidden tasks too). */ number: number; /** Detail strip open. */ detail: boolean }
  | { kind: "group"; group: Group; rollup: Rollup | null };

/**
 * The rows shown in grid and timeline, top to bottom: ungrouped tasks, then
 * per group its header and (unless collapsed) its tasks. Numbers are task
 * indexes + 1, so they skip headers and still count collapsed tasks.
 */
export function displayRows(p: Project, expanded: ReadonlySet<number>): Row[] {
  const rows: Row[] = [];
  const byGroup = new Map<number, Task[]>();
  p.tasks.forEach((t, i) => {
    if (t.g === undefined) rows.push({ kind: "task", task: t, number: i + 1, detail: expanded.has(t.id) });
    else (byGroup.get(t.g) ?? byGroup.set(t.g, []).get(t.g)!).push(t);
  });
  const number = new Map(p.tasks.map((t, i) => [t.id, i + 1]));
  for (const g of p.groups) {
    const members = byGroup.get(g.id) ?? [];
    rows.push({ kind: "group", group: g, rollup: rollup(members, p.calendar) });
    if (g.collapsed) continue;
    for (const t of members) rows.push({ kind: "task", task: t, number: number.get(t.id)!, detail: expanded.has(t.id) });
  }
  return rows;
}

/** Where a moveTask goes: the flat index, and a new group when crossing a header (null = ungrouped). */
export interface MoveTarget { toIndex: number; group?: number | null }

/** Section keys in display order: ungrouped (null), then each group id. */
type Order = Pick<Project, "tasks" | "groups">;
const sections = (p: Order): (number | null)[] => [null, ...p.groups.map((g) => g.id)];
const sectionOf = (t: Task): number | null => t.g ?? null;

/**
 * Target for moving a task one step up (-1) or down (+1). Within its section
 * it swaps with its neighbour; at the section's edge it crosses the header
 * into the previous section's end / the next section's start (empty groups
 * included). null at the very top or bottom.
 */
export function moveTarget(p: Order, id: number, dir: -1 | 1): MoveTarget | null {
  const i = p.tasks.findIndex((t) => t.id === id);
  if (i < 0) return null;
  const s = sectionOf(p.tasks[i]!);
  const j = i + dir;
  const n = p.tasks[j];
  if (n && sectionOf(n) === s) return { toIndex: j };
  const secs = sections(p);
  const k = secs.indexOf(s) + dir;
  if (k < 0 || k >= secs.length) return null;
  // Same flat position, new group: the order invariant puts it at the end of
  // the previous section (moving up) or the start of the next one (moving down).
  return { toIndex: i, group: secs[k] };
}

/**
 * Resolve dropping a dragged task into gap `slot` (0..rows.length) of the
 * display rows. A gap above a task joins that task's section, before it; a gap
 * above a group header (or the end) joins the section of the row above it, at
 * its end — so "directly below a header" means "first task of that group".
 * null when the task would not move.
 */
export function taskDropTarget(p: Order, rows: readonly Row[], id: number, slot: number): MoveTarget | null {
  const from = p.tasks.findIndex((t) => t.id === id);
  if (from < 0) return null;
  const without = p.tasks.filter((t) => t.id !== id);
  const order = new Map(sections(p).map((s, k) => [s, k]));
  const rowSection = (r: Row): number | null => (r.kind === "task" ? sectionOf(r.task) : r.group.id);
  const below = rows[slot];
  let group: number | null;
  let toIndex: number;
  if (below?.kind === "task") {
    if (below.task.id === id) return null;
    group = sectionOf(below.task);
    toIndex = without.indexOf(below.task);
  } else {
    const above = slot > 0 ? rows[slot - 1] : undefined;
    group = above ? rowSection(above) : null;
    const k = order.get(group)!;
    toIndex = without.filter((t) => order.get(sectionOf(t))! <= k).length;
  }
  if (toIndex === from && group === sectionOf(p.tasks[from]!)) return null;
  return { toIndex, group };
}

/** Gaps a dragged group may land in: above any group header, or at the end. */
export function groupSlots(rows: readonly Row[]): number[] {
  const out: number[] = [];
  rows.forEach((r, k) => { if (r.kind === "group") out.push(k); });
  out.push(rows.length);
  return out;
}

/** Nearest allowed gap for a dragged group (ties go up). */
export function snapGroupSlot(rows: readonly Row[], slot: number): number {
  let best = rows.length;
  for (const k of groupSlots(rows)) if (Math.abs(k - slot) < Math.abs(best - slot)) best = k;
  return best;
}

/** Group index for dropping group `id` into gap `slot` (a groupSlots gap); null when it wouldn't move. */
export function groupDropIndex(p: Order, rows: readonly Row[], id: number, slot: number): number | null {
  const from = p.groups.findIndex((g) => g.id === id);
  if (from < 0) return null;
  const before = rows.slice(0, slot).filter((r) => r.kind === "group").length;
  const to = before - (from < before ? 1 : 0);
  return to === from ? null : to;
}
