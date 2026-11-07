import {
  MAX_DURATION, MAX_NAME, PALETTE, clampZoomFactor, emptyProject, isAuto,
  type Action, type Project, type Task,
} from "./model";
import { ISO_RE, iso, parseDate } from "./dates";
import { calendarOps, toCalendar } from "./calendar";
import { schedule, wouldCreateCycle } from "./schedule";
import { normalizeOrder } from "./groups";

const validIso = (s: unknown): s is string =>
  typeof s === "string" && ISO_RE.test(s) && iso(parseDate(s)) === s;

function withTasks(p: Project, tasks: Task[], extra: Partial<Project> = {}): Project {
  const next = { ...p, ...extra };
  return { ...next, tasks: schedule(tasks, next.calendar) };
}

function edit(p: Project, id: number, fn: (t: Task) => Task | null): Project {
  const i = p.tasks.findIndex((t) => t.id === id);
  if (i < 0) return p;
  const t = p.tasks[i] as Task;
  const nt = fn(t);
  if (!nt) return p;
  const tasks = p.tasks.slice();
  tasks[i] = nt;
  return withTasks(p, tasks);
}

/** Copy of `t` in group `g` (undefined/null = ungrouped). */
function withGroup(t: Task, g: number | null | undefined): Task {
  if ((g ?? undefined) === t.g) return t;
  if (g === null || g === undefined) {
    const rest = { ...t };
    delete rest.g;
    return rest;
  }
  return { ...t, g };
}

/** Remove tasks and every link pointing at them; successors left without links become manual. */
function deleteTasks(p: Project, ids: ReadonlySet<number>): Project {
  const tasks = p.tasks
    .filter((t) => !ids.has(t.id))
    .map((t) => (t.deps.some((l) => ids.has(l.pred)) ? { ...t, deps: t.deps.filter((l) => !ids.has(l.pred)) } : t));
  return withTasks(p, tasks);
}

const groupExists = (p: Project, g: number | null | undefined) => g === null || g === undefined || p.groups.some((x) => x.id === g);

/** Applies an action, then enforces the task-order invariant (see normalizeOrder). */
export function reducer(project: Project, action: Action): Project {
  const next = apply(project, action);
  return next === project ? project : normalizeOrder(next);
}

function apply(project: Project, action: Action): Project {
  switch (action.type) {
    case "load":
      return { ...action.project, tasks: schedule(action.project.tasks, action.project.calendar) };

    case "newProject":
      return emptyProject(action.title?.slice(0, MAX_NAME) || undefined);

    case "addTask": {
      if (!validIso(action.today) || !groupExists(project, action.group)) return project;
      const ops = calendarOps(project.calendar);
      let last = action.today;
      for (const t of project.tasks) if (t.e > last) last = t.e;
      // The day after the latest finish (or today, when there are no tasks), in project days.
      const si = project.tasks.length ? ops.finishIdx(last) + 1 : ops.startIdx(last);
      const task: Task = withGroup({
        id: project.nextId, n: (action.name || "New task").slice(0, MAX_NAME), s: ops.toIso(si), e: ops.toIso(si + 4),
        c: project.tasks.length % PALETTE.length, p: 0, deps: [],
      }, action.group);
      return withTasks(project, [...project.tasks, task], { nextId: project.nextId + 1 });
    }

    case "deleteTask": {
      if (!project.tasks.some((t) => t.id === action.id)) return project;
      return deleteTasks(project, new Set([action.id]));
    }

    case "rename":
      return edit(project, action.id, (t) => ({ ...t, n: action.name.slice(0, MAX_NAME) }));

    case "setStart":
      return edit(project, action.id, (t) => {
        if (isAuto(t) || !validIso(action.date)) return null;
        return { ...t, s: action.date, e: t.e < action.date ? action.date : t.e };
      });

    case "setFinish":
      return edit(project, action.id, (t) => {
        if (!validIso(action.date)) return null;
        if (isAuto(t)) {
          const ops = calendarOps(project.calendar);
          const si = ops.startIdx(t.s);
          const d = Math.min(MAX_DURATION, Math.max(1, ops.finishIdx(action.date) - si + 1));
          return { ...t, e: ops.toIso(si + d - 1) };
        }
        return { ...t, s: action.date < t.s ? action.date : t.s, e: action.date };
      });

    case "setDuration":
      if (!Number.isInteger(action.days) || action.days < 1 || action.days > MAX_DURATION) return project;
      return edit(project, action.id, (t) => {
        const ops = calendarOps(project.calendar);
        return { ...t, e: ops.toIso(ops.startIdx(t.s) + action.days - 1) };
      });

    case "setColor": {
      const c = Math.min(Math.max(Math.trunc(action.color) || 0, 0), PALETTE.length - 1);
      return edit(project, action.id, (t) => ({ ...t, c }));
    }

    case "setProgress": {
      const p = Math.min(Math.max(Math.round(action.pct) || 0, 0), 100);
      return edit(project, action.id, (t) => ({ ...t, p }));
    }

    case "moveTask": {
      const from = project.tasks.findIndex((t) => t.id === action.id);
      if (from < 0 || !Number.isFinite(action.toIndex) || !groupExists(project, action.group)) return project;
      const to = Math.min(Math.max(Math.trunc(action.toIndex), 0), project.tasks.length - 1);
      const cur = project.tasks[from] as Task;
      const moved = action.group === undefined ? cur : withGroup(cur, action.group);
      if (to === from && moved === cur) return project;
      const tasks = project.tasks.slice();
      tasks.splice(from, 1);
      tasks.splice(to, 0, moved);
      return withTasks(project, tasks);
    }

    case "addGroup": {
      const group = { id: project.nextId, n: (action.name || "New group").slice(0, MAX_NAME), collapsed: false };
      return { ...project, groups: [...project.groups, group], nextId: project.nextId + 1 };
    }

    case "renameGroup": {
      const n = action.name.slice(0, MAX_NAME);
      if (!project.groups.some((g) => g.id === action.id && g.n !== n)) return project;
      return { ...project, groups: project.groups.map((g) => (g.id === action.id ? { ...g, n } : g)) };
    }

    case "toggleGroup":
      if (!project.groups.some((g) => g.id === action.id)) return project;
      return { ...project, groups: project.groups.map((g) => (g.id === action.id ? { ...g, collapsed: !g.collapsed } : g)) };

    case "moveGroup": {
      const from = project.groups.findIndex((g) => g.id === action.id);
      if (from < 0 || !Number.isFinite(action.toIndex)) return project;
      const to = Math.min(Math.max(Math.trunc(action.toIndex), 0), project.groups.length - 1);
      if (to === from) return project;
      const groups = project.groups.slice();
      const [g] = groups.splice(from, 1);
      groups.splice(to, 0, g!);
      return { ...project, groups };
    }

    case "deleteGroup": {
      if (!project.groups.some((g) => g.id === action.id)) return project;
      const groups = project.groups.filter((g) => g.id !== action.id);
      if (action.withTasks) {
        const ids = new Set(project.tasks.filter((t) => t.g === action.id).map((t) => t.id));
        return deleteTasks({ ...project, groups }, ids);
      }
      // Former members keep their relative order and, being later in the array
      // than every ungrouped task, land at the end of the ungrouped section.
      return { ...project, groups, tasks: project.tasks.map((t) => (t.g === action.id ? withGroup(t, null) : t)) };
    }

    case "setTaskGroup": {
      const i = project.tasks.findIndex((t) => t.id === action.id);
      if (i < 0 || !groupExists(project, action.group)) return project;
      const t = project.tasks[i] as Task;
      if ((action.group ?? undefined) === t.g) return project;
      // Re-append so the stable partition puts it last in its new section.
      const tasks = project.tasks.filter((x) => x.id !== action.id);
      tasks.push(withGroup(t, action.group));
      return withTasks(project, tasks);
    }

    case "setTitle":
      return { ...project, title: action.title };

    case "setCalendar": {
      const calendar = toCalendar(action.calendar);
      if (calendar === project.calendar) return project;
      return withTasks(project, project.tasks, { calendar });
    }

    case "setZoom":
      return { ...project, zoom: clampZoomFactor(action.zoom) };

    case "setPredecessors": {
      const ids = new Set(project.tasks.map((t) => t.id));
      if (action.links.some((l) => l.pred === action.id || !ids.has(l.pred))) return project;
      if (wouldCreateCycle(project.tasks, action.id, action.links)) return project;
      return edit(project, action.id, (t) => ({ ...t, deps: action.links.map((l) => ({ ...l })) }));
    }
  }
}
