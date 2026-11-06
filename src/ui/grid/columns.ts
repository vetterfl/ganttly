import type { ColumnSettings } from "../../settings/settings";

type Col = { key: keyof ColumnSettings | "id" | "toggle" | "name"; screen: number; print: number };

const ALL: Col[] = [
  { key: "id", screen: 40, print: 34 },
  { key: "toggle", screen: 26, print: 0 },
  { key: "name", screen: 200, print: 200 },
  { key: "duration", screen: 72, print: 64 },
  { key: "start", screen: 104, print: 92 },
  { key: "finish", screen: 104, print: 92 },
  { key: "pct", screen: 82, print: 72 },
  { key: "preds", screen: 96, print: 80 },
];

const PANE_BORDER = 2;

/** CSS custom properties sizing the grid for the visible columns (screen + print). */
export function gridColumnVars(cols: ColumnSettings): Record<string, string> {
  const visible = ALL.filter(c => !(c.key in cols) || cols[c.key as keyof ColumnSettings]);
  const sum = (k: "screen" | "print") => visible.reduce((s, c) => s + c[k], 0) + PANE_BORDER;
  return {
    "--cols-wide": visible.map(c => `${c.screen}px`).join(" "),
    "--grid-w-wide": `${sum("screen")}px`,
    "--cols-print": visible.map(c => `${c.print}px`).join(" "),
    "--grid-w-print": `${sum("print")}px`,
  };
}
