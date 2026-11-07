import type { Link, Task } from "./model";
import { calendarOps, durationIn, snapTask, type Calendar, type CalendarOps } from "./calendar";

/**
 * Candidate start index for a task of duration `d` (project days) given one
 * link and its predecessor. Indexes count the project's days (calendarOps),
 * so the same formulas serve calendar-day and working-day projects.
 */
function candidate(link: Link, pred: Task, d: number, ops: CalendarOps): number {
  switch (link.type) {
    case "FS":
      return ops.finishIdx(pred.e) + 1 + link.lag;
    case "SS":
      return ops.startIdx(pred.s) + link.lag;
    case "FF":
      return ops.finishIdx(pred.e) + link.lag - (d - 1);
    case "SF":
      return ops.startIdx(pred.s) - 1 + link.lag - (d - 1);
  }
}

/**
 * Recompute dates of all auto-scheduled tasks in the given calendar, and move
 * manual tasks onto counted days (a no-op for "days"). Pure; unchanged tasks
 * keep identity.
 */
export function schedule(tasks: Task[], cal: Calendar = "days"): Task[] {
  const ops = calendarOps(cal);
  const byId = new Map<number, Task>();
  for (const t of tasks) byId.set(t.id, t);

  const indeg = new Map<number, number>();
  const succ = new Map<number, number[]>();
  for (const t of tasks) {
    let n = 0;
    for (const l of t.deps) {
      if (!byId.has(l.pred)) continue;
      n++;
      const arr = succ.get(l.pred);
      if (arr) arr.push(t.id);
      else succ.set(l.pred, [t.id]);
    }
    indeg.set(t.id, n);
  }

  const cur = new Map<number, Task>(byId);
  const queue: number[] = tasks.filter((t) => indeg.get(t.id) === 0).map((t) => t.id);
  for (let qi = 0; qi < queue.length; qi++) {
    const id = queue[qi] as number;
    const t = cur.get(id) as Task;
    const links = t.deps.filter((l) => cur.has(l.pred));
    if (links.length > 0) {
      const d = durationIn(t, cal);
      let start: number | null = null;
      for (const l of links) {
        const c = candidate(l, cur.get(l.pred) as Task, d, ops);
        if (start === null || c > start) start = c;
      }
      if (start !== null) {
        const s = ops.toIso(start);
        const e = ops.toIso(start + d - 1);
        if (s !== t.s || e !== t.e) cur.set(id, { ...t, s, e });
      }
    } else {
      const snapped = snapTask(t, cal);
      if (snapped !== t) cur.set(id, snapped);
    }
    for (const sId of succ.get(id) ?? []) {
      const n = (indeg.get(sId) as number) - 1;
      indeg.set(sId, n);
      if (n === 0) queue.push(sId);
    }
  }
  return tasks.map((t) => cur.get(t.id) as Task);
}

/** True if giving `taskId` exactly `links` (replacing its deps) would create a cycle. */
export function wouldCreateCycle(tasks: Task[], taskId: number, links: Link[]): boolean {
  if (links.some((l) => l.pred === taskId)) return true;
  // Descendants of taskId via other tasks' deps.
  const succ = new Map<number, number[]>();
  for (const t of tasks) {
    if (t.id === taskId) continue;
    for (const l of t.deps) {
      const arr = succ.get(l.pred);
      if (arr) arr.push(t.id);
      else succ.set(l.pred, [t.id]);
    }
  }
  const seen = new Set<number>();
  const stack = [taskId];
  while (stack.length) {
    const x = stack.pop() as number;
    for (const s of succ.get(x) ?? []) {
      if (!seen.has(s)) {
        seen.add(s);
        stack.push(s);
      }
    }
  }
  return links.some((l) => seen.has(l.pred));
}
