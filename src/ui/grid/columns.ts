import { COLUMN_DEFAULTS, type ColumnSettings, type ColumnWidths, type ResizableCol } from "../../settings/settings";

export type ColKey = "id" | "toggle" | ResizableCol;
type Col = { key: ColKey; screen: number; print: number };

/** Every grid column in display order. Screen widths of resizable columns come from COLUMN_DEFAULTS. */
const ALL: Col[] = [
  { key: "id", screen: 40, print: 34 },
  { key: "toggle", screen: 26, print: 0 },
  { key: "name", screen: COLUMN_DEFAULTS.name.def, print: 200 },
  { key: "duration", screen: COLUMN_DEFAULTS.duration.def, print: 64 },
  { key: "start", screen: COLUMN_DEFAULTS.start.def, print: 92 },
  { key: "finish", screen: COLUMN_DEFAULTS.finish.def, print: 92 },
  { key: "pct", screen: COLUMN_DEFAULTS.pct.def, print: 72 },
  { key: "preds", screen: COLUMN_DEFAULTS.preds.def, print: 80 },
];

const PANE_BORDER = 2;

const isVisible = (cols: ColumnSettings) => (c: Col) => !(c.key in cols) || cols[c.key as keyof ColumnSettings];

/** Keys of the visible columns, in display order. */
export function visibleColumns(cols: ColumnSettings): ColKey[] {
  return ALL.filter(isVisible(cols)).map(c => c.key);
}

/** Current screen width of a column: the user's override or the default. */
export function screenWidth(key: ColKey, widths: ColumnWidths = {}): number {
  const c = ALL.find(x => x.key === key)!;
  return key === "id" || key === "toggle" ? c.screen : widths[key] ?? c.screen;
}

/**
 * CSS custom properties sizing the grid for the visible columns. Screen widths
 * honour the user's overrides; print widths are fixed so printouts stay compact.
 */
export function gridColumnVars(cols: ColumnSettings, widths: ColumnWidths = {}): Record<string, string> {
  const visible = ALL.filter(isVisible(cols));
  const screen = visible.map(c => screenWidth(c.key, widths));
  const print = visible.map(c => c.print);
  const sum = (a: number[]) => a.reduce((s, w) => s + w, 0) + PANE_BORDER;
  return {
    "--cols-wide": screen.map(w => `${w}px`).join(" "),
    "--grid-w-wide": `${sum(screen)}px`,
    "--cols-print": print.map(w => `${w}px`).join(" "),
    "--grid-w-print": `${sum(print)}px`,
  };
}
