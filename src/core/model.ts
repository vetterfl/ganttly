// Domain model shared by the scheduler, notation parser, URL codec and UI.
// Everything in src/core is pure TypeScript: no DOM, no React.

import { addDays, iso } from "./dates";

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
}

export interface Project {
  title: string;
  /** Index into ZOOMS */
  zoom: number;
  tasks: Task[];
  /** Next id to hand out; always > every task id. */
  nextId: number;
}

/** Bold palette; index = Task.c and is stored in share links — keep order stable. */
export const PALETTE: readonly string[] = [
  "#1f5fd1", "#00897b", "#b26a00", "#c2185b", "#6a1b9a", "#0277bd", "#d84315", "#455a64",
];

/** Zoom presets: px per day. */
export const ZOOMS: readonly { w: number; label: string }[] = [
  { w: 14, label: "Compact" },
  { w: 24, label: "Cozy" },
  { w: 34, label: "Normal" },
  { w: 52, label: "Large" },
  { w: 76, label: "Huge" },
];
export const DEFAULT_ZOOM = 2;

export const MAX_NAME = 120;
export const MAX_DURATION = 3650;

export function clampZoom(z: unknown): number {
  const n = parseInt(String(z));
  return isNaN(n) ? DEFAULT_ZOOM : Math.min(Math.max(n, 0), ZOOMS.length - 1);
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
    zoom: DEFAULT_ZOOM,
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
  return { title: UNTITLED, zoom: DEFAULT_ZOOM, tasks: [], nextId: 1 };
}

/** Reducer actions. Tasks are addressed by stable id. */
export type Action =
  | { type: "load"; project: Project }
  /** Replaces everything with an empty "Untitled Project" (default zoom, nextId 1). */
  | { type: "newProject" }
  /** `today` is passed in to keep the reducer pure (used when there are no tasks). */
  | { type: "addTask"; today: string }
  | { type: "deleteTask"; id: number }
  | { type: "rename"; id: number; name: string }
  /** Ignored for auto-scheduled tasks. Manual: if finish < start, finish := start. */
  | { type: "setStart"; id: number; date: string }
  /** Manual: if finish < start, start := finish. Auto: sets duration = finish − start + 1 (min 1). */
  | { type: "setFinish"; id: number; date: string }
  /** Whole days 1..MAX_DURATION; keeps start, finish := start + days − 1. Invalid → no-op. */
  | { type: "setDuration"; id: number; days: number }
  | { type: "setColor"; id: number; color: number }
  | { type: "setProgress"; id: number; pct: number }
  | { type: "setTitle"; title: string }
  | { type: "setZoom"; zoom: number }
  /** Replaces the task's links. Rejected (no-op) if it references unknown ids, itself, or creates a cycle. */
  | { type: "setPredecessors"; id: number; links: Link[] };
