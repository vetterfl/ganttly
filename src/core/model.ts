// Domain model shared by the scheduler, notation parser, URL codec and UI.
// Everything in src/core is pure TypeScript: no DOM, no React.

import type { Calendar } from "./calendar";
import { addDays, iso } from "./dates";

export type { Calendar };

/** Canonical, language-neutral link types (German EA/AA/EE/AE map onto these). */
export type LinkType = "FS" | "SS" | "FF" | "SF";
/** Index order is part of the v3 URL format (typeIdx) — never reorder. */
export const LINK_TYPES: readonly LinkType[] = ["FS", "SS", "FF", "SF"];

export interface Link {
  /** Stable id of the predecessor task (never the row number). */
  pred: number;
  type: LinkType;
  /** Lag in whole calendar days; negative = lead. */
  lag: number;
}

export interface Task {
  /** Stable, unique within the project. Not shown in the UI. */
  id: number;
  n: string;
  /** Start, YYYY-MM-DD (local date). */
  s: string;
  /** Finish, YYYY-MM-DD, inclusive. */
  e: string;
  /** Palette index 0..PALETTE.length-1 */
  c: number;
  /** Progress 0..100 */
  p: number;
  deps: Link[];
  /** Id of the task's group; absent = ungrouped. */
  g?: number;
}

/** A named, collapsible section of tasks (one level, no nesting). */
export interface Group {
  /** Stable id from the same counter as task ids (Project.nextId). */
  id: number;
  n: string;
  collapsed: boolean;
}

export interface Project {
  title: string;
  /** Zoom factor relative to Fit: 1 = whole project fits the timeline, ≥ 1. */
  zoom: number;
  /**
   * Task order is an invariant (normalizeOrder in groups.ts, run after every
   * action): all ungrouped tasks, then the tasks of groups[0], groups[1], …
   * So array order = display order and row number = index + 1.
   */
  tasks: Task[];
  /** Groups in display order. */
  groups: Group[];
  /**
   * Which days count for durations, lags and link formulas: every calendar day,
   * or Monday–Friday only. In "workdays" projects every task starts and ends
   * on a working day (enforced by schedule()). Part of the project and its link.
   */
  calendar: Calendar;
  /** Next id to hand out; always > every task and group id. */
  nextId: number;
}

/** Bold palette; index = Task.c and is stored in share links — keep order stable. */
export const PALETTE: readonly string[] = [
  "#1f5fd1", "#00897b", "#b26a00", "#c2185b", "#6a1b9a", "#0277bd", "#d84315", "#455a64",
];

/** Widest a single day can get (px); the upper zoom limit. */
export const MAX_DAY_PX = 120;
/** Factor applied per zoom-in / zoom-out step. */
export const ZOOM_STEP = 1.25;
/** Sanity cap for factors read from links; the effective limit is MAX_DAY_PX. */
export const MAX_ZOOM_FACTOR = 10000;
/** Zoom factor of a fitted view. */
export const FIT_ZOOM = 1;

export const MAX_NAME = 120;
export const MAX_DURATION = 3650;

/** Any non-finite or < 1 value means Fit (1); otherwise capped at MAX_ZOOM_FACTOR. */
export function clampZoomFactor(z: unknown): number {
  return typeof z === "number" && Number.isFinite(z) && z >= 1 ? Math.min(z, MAX_ZOOM_FACTOR) : FIT_ZOOM;
}

/** A task is auto-scheduled iff it has at least one predecessor link. */
export const isAuto = (t: Task): boolean => t.deps.length > 0;

/** The 7-task sample shown when there is no (valid) `?d=` payload. Dates relative to `today`. */
export function sampleProject(today: Date): Project {
  const mk = (id: number, n: string, off: number, dur: number, c: number, p: number): Task => ({
    id, n, s: iso(addDays(today, off)), e: iso(addDays(today, off + dur - 1)), c, p, deps: [],
  });
  return {
    title: "Website Relaunch",
    zoom: FIT_ZOOM,
    calendar: "days",
    groups: [],
    nextId: 8,
    tasks: [
      mk(1, "Research & strategy", -4, 5, 0, 100),
      mk(2, "Wireframes", 1, 4, 4, 80),
      mk(3, "Visual design", 5, 6, 3, 45),
      mk(4, "Development", 10, 10, 1, 20),
      mk(5, "Content & copywriting", 8, 7, 2, 60),
      mk(6, "Testing & QA", 19, 4, 5, 0),
      mk(7, "Launch 🚀", 23, 1, 6, 0),
    ],
  };
}

export const UNTITLED = "Untitled Project";

/** The empty project created by the New command. */
export function emptyProject(): Project {
  return { title: UNTITLED, zoom: FIT_ZOOM, calendar: "days", groups: [], tasks: [], nextId: 1 };
}

/** Reducer actions. Tasks are addressed by stable id. */
export type Action =
  | { type: "load"; project: Project }
  /** Replaces everything with an empty "Untitled Project" (Fit zoom, nextId 1). */
  | { type: "newProject" }
  /**
   * `today` is passed in to keep the reducer pure (used when there are no tasks).
   * `group`: the new task's group (null/absent = ungrouped); it becomes that section's last task.
   */
  | { type: "addTask"; today: string; group?: number | null }
  | { type: "deleteTask"; id: number }
  | { type: "rename"; id: number; name: string }
  /** Ignored for auto-scheduled tasks. Manual: if finish < start, finish := start. Snapped onto counted days. */
  | { type: "setStart"; id: number; date: string }
  /** Manual: if finish < start, start := finish. Auto: sets duration = finish − start + 1 (min 1). */
  | { type: "setFinish"; id: number; date: string }
  /** Whole project days 1..MAX_DURATION; keeps start, finish := start + days − 1 (in the project calendar). Invalid → no-op. */
  | { type: "setDuration"; id: number; days: number }
  | { type: "setColor"; id: number; color: number }
  | { type: "setProgress"; id: number; pct: number }
  | { type: "setTitle"; title: string }
  /** Move a task to position `toIndex` (clamped to 0..n−1). Ids, links and dates are unchanged; rows renumber. */
  /**
   * With `group` (null = ungrouped), the task's group is changed first; the index
   * then applies to the flat task order, which is normalised afterwards.
   */
  | { type: "moveTask"; id: number; toIndex: number; group?: number | null }
  /** Append an empty group "New group". */
  | { type: "addGroup" }
  /** Truncated to MAX_NAME. */
  | { type: "renameGroup"; id: number; name: string }
  | { type: "toggleGroup"; id: number }
  /** Move a group (with its tasks) to position `toIndex` among the groups (clamped). */
  | { type: "moveGroup"; id: number; toIndex: number }
  /** withTasks: also delete its tasks (links to them are removed); otherwise its tasks become ungrouped (end of the ungrouped section). */
  | { type: "deleteGroup"; id: number; withTasks: boolean }
  /** Move a task into a group (null = ungrouped), as that section's last task. Unknown group → no-op. */
  | { type: "setTaskGroup"; id: number; group: number | null }
  /** Switch the project calendar: dates are kept (snapped onto working days), durations re-counted, links rescheduled. */
  | { type: "setCalendar"; calendar: Calendar }
  /** Zoom factor; clamped by clampZoomFactor (below 1 / invalid → 1). */
  | { type: "setZoom"; zoom: number }
  /** Replaces the task's links. Rejected (no-op) if it references unknown ids, itself, or creates a cycle. */
  | { type: "setPredecessors"; id: number; links: Link[] };
