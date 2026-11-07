// Per-browser view settings. Stored in localStorage, never in share links.

export type Notation = "de" | "en";
export type DateFormat = "locale" | "iso" | "dmy";
export type Density = "compact" | "comfortable";

export interface ColumnSettings {
  duration: boolean;
  start: boolean;
  finish: boolean;
  pct: boolean;
  preds: boolean;
}

/** Grid columns the user can resize (ID and the expand toggle are fixed). */
export type ResizableCol = "name" | "duration" | "start" | "finish" | "pct" | "preds";

/** Default and minimum screen width (px) of each resizable column. */
export const COLUMN_DEFAULTS: Readonly<Record<ResizableCol, { def: number; min: number }>> = Object.freeze({
  name: { def: 200, min: 80 },
  duration: { def: 88, min: 64 },
  start: { def: 104, min: 80 },
  finish: { def: 104, min: 80 },
  pct: { def: 82, min: 56 },
  preds: { def: 96, min: 56 },
});
export const RESIZABLE_COLS = Object.keys(COLUMN_DEFAULTS) as ResizableCol[];
export const MAX_COLUMN_WIDTH = 800;

/** Clamp a width to the column's [min, MAX_COLUMN_WIDTH] range, in whole px. */
export function clampColumnWidth(col: ResizableCol, w: number): number {
  return Math.min(Math.max(Math.round(w), COLUMN_DEFAULTS[col].min), MAX_COLUMN_WIDTH);
}

/** Only the columns the user resized; the rest use COLUMN_DEFAULTS. */
export type ColumnWidths = Partial<Record<ResizableCol, number>>;

export interface Settings {
  notation: Notation;
  dateFormat: DateFormat;
  density: Density;
  columns: ColumnSettings;
  columnWidths: ColumnWidths;
  showArrows: boolean;
  showWeekends: boolean;
  showToday: boolean;
  showProgress: boolean;
}

export const STORAGE_KEY = "ganttly.settings.v1";

export const DEFAULT_SETTINGS: Settings = Object.freeze({
  notation: "de",
  dateFormat: "locale",
  density: "compact",
  columns: Object.freeze({ duration: true, start: true, finish: true, pct: true, preds: true }),
  columnWidths: Object.freeze({}),
  showArrows: true,
  showWeekends: true,
  showToday: true,
  showProgress: true,
}) as Settings;

const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === "boolean" ? v : fallback);

/** Merge an untrusted object over the defaults, field by field. Unknown keys are dropped. */
export function mergeSettings(raw: unknown): Settings {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const c = (o.columns && typeof o.columns === "object" ? o.columns : {}) as Record<string, unknown>;
  const w = (o.columnWidths && typeof o.columnWidths === "object" ? o.columnWidths : {}) as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  const columnWidths: ColumnWidths = {};
  for (const k of RESIZABLE_COLS) {
    const v = w[k];
    if (typeof v === "number" && Number.isFinite(v)) columnWidths[k] = clampColumnWidth(k, v);
  }
  return {
    notation: oneOf(o.notation, ["de", "en"] as const, d.notation),
    dateFormat: oneOf(o.dateFormat, ["locale", "iso", "dmy"] as const, d.dateFormat),
    density: oneOf(o.density, ["compact", "comfortable"] as const, d.density),
    columns: {
      duration: bool(c.duration, d.columns.duration),
      start: bool(c.start, d.columns.start),
      finish: bool(c.finish, d.columns.finish),
      pct: bool(c.pct, d.columns.pct),
      preds: bool(c.preds, d.columns.preds),
    },
    columnWidths,
    showArrows: bool(o.showArrows, d.showArrows),
    showWeekends: bool(o.showWeekends, d.showWeekends),
    showToday: bool(o.showToday, d.showToday),
    showProgress: bool(o.showProgress, d.showProgress),
  };
}

/** Storage may be missing or throw on access (private mode, blocked site data). */
function getStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadSettings(storage: Storage | null = getStorage()): Settings {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    return mergeSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return mergeSettings(null);
  }
}

export function saveSettings(s: Settings, storage: Storage | null = getStorage()): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable: settings live for this session only */
  }
}
