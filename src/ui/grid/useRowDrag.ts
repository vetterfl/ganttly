import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import type { Task } from "../../core/model";
import { laneTops } from "../timeline/geometry";

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

export interface RowDrag {
  /** The task being dragged and the current drop slot, or null when idle. */
  drag: { id: number; slot: number } | null;
  /** onPointerDown handler for a row's grip. */
  onGripDown: (e: ReactPointerEvent, id: number) => void;
}

/**
 * Pointer-based row reordering (mouse, pen and touch; deliberately not HTML5
 * drag-and-drop, which has no touch support and can't scroll our container).
 * The dragged row is only dimmed — nothing reflows until the drop — and a
 * drop line is drawn at the slot in both the grid and the timeline.
 */
export function useRowDrag({ tasks, expanded, rowH, detailH, workspaceRef, onMove }: {
  tasks: Task[];
  expanded: ReadonlySet<number>;
  rowH: number;
  detailH: number;
  workspaceRef: RefObject<HTMLElement | null>;
  onMove: (id: number, toIndex: number) => void;
}): RowDrag {
  const [drag, setDrag] = useState<{ id: number; slot: number } | null>(null);
  const stop = useRef<(() => void) | null>(null);
  useEffect(() => () => stop.current?.(), []);

  const onGripDown = useCallback((e: ReactPointerEvent, id: number) => {
    if (e.button !== 0) return;
    const ws = workspaceRef.current;
    const body = ws?.querySelector<HTMLElement>(".grid-body");
    const from = tasks.findIndex(t => t.id === id);
    if (!ws || !body || from < 0) return;
    e.preventDefault();
    e.stopPropagation();
    const grip = e.currentTarget as HTMLElement;
    const pointerId = e.pointerId;
    try { grip.setPointerCapture(pointerId); } catch { /* ignore */ }

    // Geometry is read once at pointerdown; it can't change during a drag.
    const tops = laneTops(tasks, expanded, rowH, detailH);
    let clientY = e.clientY;
    let slot = from;
    const update = () => {
      slot = slotAt(clientY - body.getBoundingClientRect().top, tops, rowH);
      setDrag(d => (d && d.slot === slot ? d : { id, slot }));
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
      if (commit) {
        const to = dropIndex(from, slot);
        if (to !== from) onMove(id, to);
      }
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
  }, [tasks, expanded, rowH, detailH, workspaceRef, onMove]);

  return { drag, onGripDown };
}
