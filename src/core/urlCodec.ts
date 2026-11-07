import {
  LINK_TYPES, MAX_DURATION, MAX_NAME, PALETTE, FIT_ZOOM, clampZoomFactor,
  type Group, type Link, type Project, type Task,
} from "./model";
import { ISO_RE, iso } from "./dates";
import type { Calendar } from "./calendar";
import { schedule, wouldCreateCycle } from "./schedule";
import { normalizeOrder } from "./groups";


export function b64encode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64decode(str: string): string {
  const s = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = "====".slice(0, (4 - (s.length % 4)) % 4);
  const bin = atob(s + pad);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

type Fields = { n?: unknown; s?: unknown; e?: unknown; c?: unknown; p?: unknown };

/** Trust boundary for URL input (ported from legacy). */
export function sanitizeTask(f: Fields, today: Date): Pick<Task, "n" | "s" | "e" | "c" | "p"> {
  const todayIso = iso(today);
  const isIso = (x: unknown): x is string => typeof x === "string" && ISO_RE.test(x);
  const s = isIso(f.s) ? f.s : todayIso;
  return {
    n: String(f.n == null ? "Task" : f.n).slice(0, 120),
    s,
    e: isIso(f.e) ? f.e : s,
    c: Math.min(Math.max(parseInt(String(f.c)) || 0, 0), PALETTE.length - 1),
    p: Math.min(Math.max(parseInt(String(f.p)) || 0, 0), 100),
  };
}

export function encodeProject(p: Project): string {
  const payload = JSON.stringify({
    v: 6,
    t: p.title,
    zf: p.zoom,
    // Calendar: 1 = working days (Mon–Fri); omitted = calendar days.
    ...(p.calendar === "workdays" ? { cal: 1 } : {}),
    n: p.nextId,
    groups: p.groups.map((g) => (g.collapsed ? { i: g.id, n: g.n, x: 1 } : { i: g.id, n: g.n })),
    tasks: p.tasks.map((t) => {
      const o: Record<string, unknown> = { i: t.id, n: t.n, s: t.s, e: t.e, c: t.c, p: t.p };
      if (t.deps.length) o.d = t.deps.map((l) => [l.pred, LINK_TYPES.indexOf(l.type), l.lag]);
      if (t.g !== undefined) o.g = t.g;
      return o;
    }),
  });
  return "?d=" + b64encode(payload);
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null;

/**
 * v3–v6 share the task/link encoding; they differ in how zoom is stored and
 * whether a calendar (v5+) and groups (v6) are present.
 */
function decodeLinked(
  o: Record<string, unknown>, rawTasks: unknown[], today: Date, zoom: number, calendar: Calendar, rawGroups: unknown[] = [],
): Project {
  const seen = new Set<number>();
  const ids: (number | null)[] = rawTasks.map((r) => {
    const i = isObj(r) ? r.i : undefined;
    if (typeof i === "number" && Number.isSafeInteger(i) && i > 0 && !seen.has(i)) {
      seen.add(i);
      return i;
    }
    return null;
  });
  let maxId = 0;
  for (const i of seen) maxId = Math.max(maxId, i);
  let fresh = maxId;
  const finalIds = ids.map((i) => i ?? ++fresh);
  const idSet = new Set(finalIds);

  const tasks: Task[] = rawTasks.map((r, k) => {
    const rec = isObj(r) ? r : {};
    return { id: finalIds[k] as number, ...sanitizeTask(rec, today), deps: [] };
  });

  // Links: structural sanitising, then greedy cycle removal.
  for (let k = 0; k < tasks.length; k++) {
    const rec = rawTasks[k];
    const d = isObj(rec) ? rec.d : undefined;
    if (!Array.isArray(d)) continue;
    const t = tasks[k] as Task;
    const accepted: Link[] = [];
    for (const raw of d) {
      if (!Array.isArray(raw)) continue;
      const [pred, ti, lg] = raw as unknown[];
      if (typeof pred !== "number" || !idSet.has(pred) || pred === t.id) continue;
      if (accepted.some((l) => l.pred === pred)) continue;
      const type = LINK_TYPES[typeof ti === "number" && Number.isInteger(ti) && ti >= 0 && ti <= 3 ? ti : 0] ?? "FS";
      const lag0 = typeof lg === "number" && Number.isInteger(lg) ? lg : 0;
      const lag = Math.min(Math.max(lag0, -MAX_DURATION), MAX_DURATION);
      const link: Link = { pred, type, lag };
      if (wouldCreateCycle(tasks, t.id, [...accepted, link])) continue;
      accepted.push(link);
    }
    tasks[k] = { ...t, deps: accepted };
  }

  // Groups (v6): ids must be unique positive integers that don't collide with
  // task ids; others get a fresh id. Tasks refer to a group by its link id.
  const used = new Set<number>();
  const rawIds = rawGroups.map((r) => (isObj(r) ? r.i : undefined));
  for (const i of rawIds) {
    if (typeof i === "number" && Number.isSafeInteger(i) && i > 0 && !idSet.has(i)) used.add(i);
  }
  let freshAll = Math.max(fresh, ...used);
  const taken = new Set<number>();
  const linkToGroup = new Map<unknown, number>();
  const groups: Group[] = rawGroups.map((r, k) => {
    const rec = isObj(r) ? r : {};
    const raw = rawIds[k];
    const id = typeof raw === "number" && used.has(raw) && !taken.has(raw) ? raw : ++freshAll;
    taken.add(id);
    if (raw !== undefined && !linkToGroup.has(raw)) linkToGroup.set(raw, id);
    return { id, n: typeof rec.n === "string" ? rec.n.slice(0, MAX_NAME) : "Group", collapsed: rec.x === 1 };
  });
  rawTasks.forEach((r, k) => {
    const gid = isObj(r) ? linkToGroup.get(r.g) : undefined;
    if (gid !== undefined) tasks[k] = { ...(tasks[k] as Task), g: gid };
  });

  const nRaw = o.n;
  const nextId = Math.max(typeof nRaw === "number" && Number.isSafeInteger(nRaw) ? nRaw : 0, Math.max(maxId, freshAll) + 1);
  // Order invariant first (ungrouped, then groups), then schedule — which also
  // moves untrusted weekend dates onto working days.
  const p = normalizeOrder({ title: String(o.t || "My Project"), zoom, calendar, groups, nextId, tasks });
  return { ...p, tasks: schedule(p.tasks, calendar) };
}

export function decodeProject(search: string, today: Date): Project | null {
  const params = new URLSearchParams(search);
  const raw = params.get("d");
  if (!raw) return null;

  try {
    const o: unknown = JSON.parse(b64decode(raw));
    if (isObj(o)) {
      if (o.v === 6 && Array.isArray(o.tasks)) {
        return decodeLinked(o, o.tasks, today, clampZoomFactor(o.zf), o.cal === 1 ? "workdays" : "days",
          Array.isArray(o.groups) ? o.groups : []);
      }
      if (o.v === 5 && Array.isArray(o.tasks)) {
        return decodeLinked(o, o.tasks, today, clampZoomFactor(o.zf), o.cal === 1 ? "workdays" : "days");
      }
      if (o.v === 4 && Array.isArray(o.tasks)) return decodeLinked(o, o.tasks, today, clampZoomFactor(o.zf), "days");
      // v1–v3 stored a zoom preset index, which has no meaning any more: open at Fit.
      if (o.v === 3 && Array.isArray(o.tasks)) return decodeLinked(o, o.tasks, today, FIT_ZOOM, "days");
      if (Array.isArray(o.tasks)) {
        const tasks: Task[] = o.tasks.map((r: unknown, i: number) => ({
          id: i + 1, ...sanitizeTask(isObj(r) ? r : {}, today), deps: [],
        }));
        return { title: String(o.t || "My Project"), zoom: FIT_ZOOM, calendar: "days", groups: [], nextId: tasks.length + 1, tasks };
      }
    }
  } catch {
    /* not JSON payload — try legacy v1 */
  }

  try {
    const rows = raw.split("~").filter(Boolean).map((row) => row.split("|").map(decodeURIComponent));
    if (rows.length === 0) return null;
    if (!rows.every((f) => f.length >= 3 && ISO_RE.test(f[1] ?? ""))) return null;
    const tasks: Task[] = rows.map((f, i) => ({
      id: i + 1,
      ...sanitizeTask({ n: f[0], s: f[1], e: f[2], c: f[3], p: f[4] }, today),
      deps: [],
    }));
    return { title: params.get("t") || "My Project", zoom: FIT_ZOOM, calendar: "days", groups: [], nextId: tasks.length + 1, tasks };
  } catch {
    return null;
  }
}
