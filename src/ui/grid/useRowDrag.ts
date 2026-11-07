import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import type { Row } from "../../core/groups";
import { rowTops } from "../timeline/geometry";

/** Distance (px) from the workspace's top/bottom edge where auto-scroll kicks in. */
export const EDGE = 40;
/** Fastest auto-scroll speed (px per animation frame), reached at the very edge. */
export const MAX_SPEED = 18;

/**
 * Drop slot (0..n) for a pointer at `y` (px from the top of the rows): the
 * first row whose task-row midpoint lies below `y`. Detail strips count as
 * part of the row above them, so their space never splits a slot.
 */
export function slotAt(y: number, tops: readonly number[], rowH: number): number {
  for (let i = 0; i < tops.length; i++) if (y < (tops[i] as number) + rowH / 2) return i;
  return tops.length;
}

/** Index to pass to moveTask when the task at `from` is dropped into `slot`. */
export const dropIndex = (from: number, slot: number): number => (slot > from ? slot - 1 : slot);

/** y (px from the top of the rows) where the drop line for `slot` is drawn. */
export function slotY(slot: number, tops: readonly number[], totalH: number): number {
  return slot < tops.length ? (tops[slot] as number) : totalH;
}

/** What is being dragged: a task row or a group header (with its tasks). */
export interface DragItem { kind: "task" | "group"; id: number }

export interface RowDrag {
  /** The item being dragged and the current drop slot (a gap between display rows), or null when idle. */
  drag: (DragItem & { slot: number }) | null;
  /** onPointerDown handler for a row's grip. */
  onGripDown: (e: ReactPointerEvent, item: DragItem) => void;
}

/**
 * Pointer-based row reordering (mouse, pen and touch; deliberately not HTML5
 * drag-and-drop, which has no touch support and can't scroll our container).
 * The dragged row is only dimmed — nothing reflows until the drop — and a
 * drop line is drawn at the slot in both the grid and the timeline.
 */
export function useRowDrag({ rows, rowH, detailH, workspaceRef, snap, onDrop }: {
  /** Display rows (task rows and group headers) as rendered. */
  rows: readonly Row[];
  rowH: number;
  detailH: number;
  workspaceRef: RefObject<HTMLElement | null>;
  /** Restrict the slot for an item (e.g. groups may only land between groups); default: any slot. */
  snap?: (item: DragItem, slot: number) => number;
  /** Called once on a drop with the final slot; resolves it to an action. */
  onDrop: (item: DragItem, slot: number) => void;
}): RowDrag {
  const [drag, setDrag] = useState<(DragItem & { slot: number }) | null>(null);
  const stop = useRef<(() => void) | null>(null);
  useEffect(() => () => stop.current?.(), []);

  const onGripDown = useCallback((e: ReactPointerEvent, item: DragItem) => {
    if (e.button !== 0) return;
    const ws = workspaceRef.current;
    const body = ws?.querySelector<HTMLElement>(".grid-body");
    const from = rows.findIndex(r => (r.kind === "task" ? item.kind === "task" && r.task.id === item.id : item.kind === "group" && r.group.id === item.id));
    if (!ws || !body || from < 0) return;
    e.preventDefault();
    e.stopPropagation();
    const grip = e.currentTarget as HTMLElement;
    const pointerId = e.pointerId;
    try { grip.setPointerCapture(pointerId); } catch { /* ignore */ }

    // Geometry is read once at pointerdown; it can't change during a drag.
    const tops = rowTops(rows, rowH, detailH);
    let clientY = e.clientY;
    let slot = from;
    const update = () => {
      const raw = slotAt(clientY - body.getBoundingClientRect().top, tops, rowH);
      slot = snap ? snap(item, raw) : raw;
      setDrag(d => (d && d.slot === slot ? d : { ...item, slot }));
    };
    update();
    ws.classList.add("row-dragging");

    let raf = 0;
    const tick = () => {
      const r = ws.getBoundingClientRect();
      const headH = ws.querySelector(".grid-head")?.getBoundingClientRect().height ?? 0;
      const top = r.top + headH;
      let v = 0;
      if (clientY < top + EDGE) v = -Math.min(1, (top + EDGE - clientY) / EDGE) * MAX_SPEED;
      else if (clientY > r.bottom - EDGE) v = Math.min(1, (clientY - (r.bottom - EDGE)) / EDGE) * MAX_SPEED;
      if (v !== 0) {
        const before = ws.scrollTop;
        ws.scrollTop += v;
        if (ws.scrollTop !== before) update();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const move = (ev: PointerEvent) => { if (ev.pointerId === pointerId) { clientY = ev.clientY; update(); } };
    const finish = (commit: boolean) => {
      cancelAnimationFrame(raf);
      grip.removeEventListener("pointermove", move);
      grip.removeEventListener("pointerup", up);
      grip.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", key, true);
      try { grip.releasePointerCapture(pointerId); } catch { /* ignore */ }
      ws.classList.remove("row-dragging");
      stop.current = null;
      setDrag(null);
      if (commit) onDrop(item, slot);
    };
    const up = (ev: PointerEvent) => { if (ev.pointerId === pointerId) finish(true); };
    const cancel = (ev: PointerEvent) => { if (ev.pointerId === pointerId) finish(false); };
    const key = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); finish(false); }
    };
    grip.addEventListener("pointermove", move);
    grip.addEventListener("pointerup", up);
    grip.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", key, true);
    stop.current = () => finish(false);
  }, [rows, rowH, detailH, workspaceRef, snap, onDrop]);

  return { drag, onGripDown };
}
