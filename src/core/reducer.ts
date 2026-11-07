import {
  MAX_DURATION, MAX_NAME, PALETTE, clampZoomFactor, emptyProject, isAuto,
  type Action, type Project, type Task,
} from "./model";
import { ISO_RE, iso, parseDate } from "./dates";
import { calendarOps, toCalendar } from "./calendar";
import { schedule, wouldCreateCycle } from "./schedule";

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

export function reducer(project: Project, action: Action): Project {
  switch (action.type) {
    case "load":
      return { ...action.project, tasks: schedule(action.project.tasks, action.project.calendar) };

    case "newProject":
      return emptyProject();

    case "addTask": {
      if (!validIso(action.today)) return project;
      const ops = calendarOps(project.calendar);
      let last = action.today;
      for (const t of project.tasks) if (t.e > last) last = t.e;
      // The day after the latest finish (or today, when there are no tasks), in project days.
      const si = project.tasks.length ? ops.finishIdx(last) + 1 : ops.startIdx(last);
      const task: Task = {
        id: project.nextId, n: "New task", s: ops.toIso(si), e: ops.toIso(si + 4),
        c: project.tasks.length % PALETTE.length, p: 0, deps: [],
      };
      return withTasks(project, [...project.tasks, task], { nextId: project.nextId + 1 });
    }

    case "deleteTask": {
      if (!project.tasks.some((t) => t.id === action.id)) return project;
      const tasks = project.tasks
        .filter((t) => t.id !== action.id)
        .map((t) =>
          t.deps.some((l) => l.pred === action.id)
            ? { ...t, deps: t.deps.filter((l) => l.pred !== action.id) }
            : t,
        );
      return withTasks(project, tasks);
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
