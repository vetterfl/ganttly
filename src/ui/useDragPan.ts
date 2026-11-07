import { useEffect, type RefObject } from "react";

/** Movement (px) before a press turns into a pan; below it, a press is a click. */
export const PAN_THRESHOLD = 4;

const INTERACTIVE = "input, button, select, textarea, a, [role=separator], [contenteditable], [contenteditable='true']";

/**
 * Whether a press may start panning:
 * - middle button: anywhere in the workspace;
 * - left button: only inside the timeline and not on an interactive element;
 * - touch: never (native touch scrolling already pans).
 */
export function panStartAllowed(target: EventTarget | null, button: number, pointerType: string): boolean {
  if (pointerType === "touch") return false;
  if (button === 1) return true;
  if (button !== 0 || !(target instanceof Element)) return false;
  return target.closest(".timeline-pane") !== null && target.closest(INTERACTIVE) === null;
}

/**
 * Grab-and-drag panning of the workspace (the single scroll container):
 * left-drag in the timeline, middle-drag anywhere. Scrolls both axes; the
 * browser clamps to the scroll limits. A click after an actual pan is
 * swallowed so releasing over a control doesn't activate it.
 */
export function useDragPan(workspaceRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const ws = workspaceRef.current;
    if (!ws) return;
    let pan: { id: number; x: number; y: number; left: number; top: number; active: boolean } | null = null;

    const end = () => {
      if (!pan) return;
      if (pan.active) {
        ws.classList.remove("panning");
        if (ws.hasPointerCapture?.(pan.id)) ws.releasePointerCapture(pan.id);
        // Swallow the click that follows this release (if any) — but only that one.
        const swallow = (e: Event) => { e.stopPropagation(); e.preventDefault(); };
        window.addEventListener("click", swallow, { capture: true, once: true });
        setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
      }
      pan = null;
    };

    const onDown = (e: PointerEvent) => {
      if (pan || !panStartAllowed(e.target, e.button, e.pointerType)) return;
      if (e.button === 1) e.preventDefault(); // no autoscroll
      pan = { id: e.pointerId, x: e.clientX, y: e.clientY, left: ws.scrollLeft, top: ws.scrollTop, active: false };
    };
    const onMove = (e: PointerEvent) => {
      if (!pan || e.pointerId !== pan.id) return;
      const dx = e.clientX - pan.x, dy = e.clientY - pan.y;
      if (!pan.active) {
        if (Math.hypot(dx, dy) < PAN_THRESHOLD) return;
        pan.active = true;
        ws.classList.add("panning");
        try { ws.setPointerCapture(pan.id); } catch { /* pointer already gone */ }
        window.getSelection()?.removeAllRanges();
      }
      e.preventDefault();
      ws.scrollLeft = pan.left - dx;
      ws.scrollTop = pan.top - dy;
    };
    const onUp = (e: PointerEvent) => { if (pan && e.pointerId === pan.id) end(); };
    // Middle button: stop autoscroll (mousedown default) and middle-click navigation.
    const onMouseDown = (e: MouseEvent) => { if (e.button === 1) e.preventDefault(); };
    const onAux = (e: MouseEvent) => { if (e.button === 1) e.preventDefault(); };

    ws.addEventListener("pointerdown", onDown);
    ws.addEventListener("pointermove", onMove);
    ws.addEventListener("pointerup", onUp);
    ws.addEventListener("pointercancel", onUp);
    ws.addEventListener("lostpointercapture", onUp);
    ws.addEventListener("mousedown", onMouseDown);
    ws.addEventListener("auxclick", onAux);
    return () => {
      end();
      ws.removeEventListener("pointerdown", onDown);
      ws.removeEventListener("pointermove", onMove);
      ws.removeEventListener("pointerup", onUp);
      ws.removeEventListener("pointercancel", onUp);
      ws.removeEventListener("lostpointercapture", onUp);
      ws.removeEventListener("mousedown", onMouseDown);
      ws.removeEventListener("auxclick", onAux);
    };
  }, [workspaceRef]);
}
