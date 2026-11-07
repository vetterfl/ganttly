import { useRef, type RefObject } from "react";
import { clampColumnWidth, COLUMN_DEFAULTS, MAX_COLUMN_WIDTH, type ColumnSettings, type ColumnWidths, type ResizableCol } from "../../settings/settings";
import { gridColumnVars, screenWidth } from "./columns";

const KEY_STEP = 8;
/** Slack added to a measured width so the content never touches the cell edge. */
const FIT_SLACK = 4;

/**
 * Drag handle on the right edge of a resizable header cell.
 * - Pointer (mouse, pen, touch): pointer capture; while dragging only the grid
 *   pane's CSS variables are overridden (no React re-render per move), and the
 *   final width is committed to settings on pointerup.
 * - Double-click: auto-fit to the widest content of the column.
 * - Keyboard: ←/→ ±8px, Home resets to the default; each key commits.
 */
export function ColumnResizer({ col, label, cols, widths, paneRef, onCommit }: {
  col: ResizableCol;
  label: string;
  cols: ColumnSettings;
  widths: ColumnWidths;
  paneRef: RefObject<HTMLElement | null>;
  onCommit: (col: ResizableCol, width: number | null) => void;
}) {
  const drag = useRef<{ x: number; w0: number; w: number } | null>(null);
  const width = screenWidth(col, widths);
  const { min } = COLUMN_DEFAULTS[col];

  const applyLive = (w: number) => {
    const pane = paneRef.current;
    if (!pane) return;
    for (const [k, v] of Object.entries(gridColumnVars(cols, { ...widths, [col]: w }))) pane.style.setProperty(k, v);
  };

  return (
    <div
      className="col-resizer" role="separator" aria-orientation="vertical" tabIndex={0}
      aria-label={`Resize ${label} column`} aria-valuenow={width} aria-valuemin={min} aria-valuemax={MAX_COLUMN_WIDTH}
      title="Drag to resize · double-click to fit"
      onPointerDown={e => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        drag.current = { x: e.clientX, w0: width, w: width };
        e.currentTarget.classList.add("active");
      }}
      onPointerMove={e => {
        const d = drag.current;
        if (!d) return;
        d.w = clampColumnWidth(col, d.w0 + e.clientX - d.x);
        applyLive(d.w);
      }}
      onPointerUp={e => {
        const d = drag.current;
        if (!d) return;
        drag.current = null;
        e.currentTarget.classList.remove("active");
        e.currentTarget.releasePointerCapture?.(e.pointerId);
        if (d.w !== d.w0) onCommit(col, d.w);
      }}
      onPointerCancel={e => {
        if (!drag.current) return;
        drag.current = null;
        e.currentTarget.classList.remove("active");
        applyLive(width);
      }}
      onDoubleClick={() => {
        const pane = paneRef.current;
        if (pane) onCommit(col, clampColumnWidth(col, measureColumn(pane, col) + FIT_SLACK));
      }}
      onKeyDown={e => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          onCommit(col, clampColumnWidth(col, width + (e.key === "ArrowRight" ? KEY_STEP : -KEY_STEP)));
        } else if (e.key === "Home") {
          e.preventDefault();
          onCommit(col, null);
        }
      }}
    />
  );
}

/** Natural (unconstrained) width of the widest cell of a column, header included. */
export function measureColumn(pane: HTMLElement, col: ResizableCol): number {
  let max = 0;
  for (const cell of pane.querySelectorAll<HTMLElement>(`.grid-head [data-col="${col}"], .row [data-col="${col}"]`)) {
    const head = cell.querySelector<HTMLElement>(".head-label");
    // header: its label plus the header cell's padding; rows: the whole cell content
    const w = head ? natural(head) + boxX(cell) : natural(cell);
    max = Math.max(max, w + 1); // + the cell's right border
  }
  return max;
}

let canvas: HTMLCanvasElement | null = null;
function textWidth(text: string, el: Element): number {
  if (!text) return 0;
  const cs = getComputedStyle(el);
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    canvas ??= document.createElement("canvas");
    ctx = canvas.getContext("2d");
  } catch { /* no canvas (tests) */ }
  if (!ctx) return text.length * 7;
  ctx.font = cs.font || `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  return ctx.measureText(text).width;
}

const px = (v: string) => parseFloat(v) || 0;
function boxX(el: Element): number {
  const cs = getComputedStyle(el);
  return px(cs.paddingLeft) + px(cs.paddingRight) + px(cs.borderLeftWidth) + px(cs.borderRightWidth);
}

/** Width an element would need to show its content without clipping. */
function natural(el: Element): number {
  const cs = getComputedStyle(el);
  if (el instanceof HTMLInputElement) {
    const spin = el.type === "number" ? 18 : 0;
    return Math.ceil(textWidth(el.value || el.placeholder, el)) + boxX(el) + spin;
  }
  if (el instanceof SVGElement) return el.getBoundingClientRect().width || px(cs.width);
  let sum = 0;
  let parts = 0;
  for (const n of el.childNodes) {
    if (n.nodeType === Node.TEXT_NODE) {
      const t = n.textContent?.trim() ?? "";
      if (t) { sum += textWidth(t, el); parts++; }
    } else if (n instanceof Element) {
      const ccs = getComputedStyle(n);
      if (ccs.display === "none" || ccs.position === "absolute") continue;
      sum += natural(n) + px(ccs.marginLeft) + px(ccs.marginRight);
      parts++;
    }
  }
  const gap = cs.display.includes("flex") ? px(cs.columnGap) * Math.max(0, parts - 1) : 0;
  return Math.ceil(sum + gap + boxX(el));
}
