import type { Link, Task } from "./model";
import { addDaysIso, durationOf } from "./dates";

/** Candidate start (ISO) for a task of duration `d` given one link and its predecessor. */
function candidate(link: Link, pred: Task, d: number): string {
  switch (link.type) {
    case "FS":
      return addDaysIso(pred.e, 1 + link.lag);
    case "SS":
      return addDaysIso(pred.s, link.lag);
    case "FF":
      return addDaysIso(pred.e, link.lag - (d - 1));
    case "SF":
      return addDaysIso(pred.s, -1 + link.lag - (d - 1));
  }
}

/** Recompute dates of all auto-scheduled tasks. Pure; unchanged tasks keep identity. */
export function schedule(tasks: Task[]): Task[] {
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
      const d = durationOf(t);
      let start: string | null = null;
      for (const l of links) {
        const c = candidate(l, cur.get(l.pred) as Task, d);
        if (start === null || c > start) start = c;
      }
      if (start !== null) {
        const e = addDaysIso(start, d - 1);
        if (start !== t.s || e !== t.e) cur.set(id, { ...t, s: start, e });
      }
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
