import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { FIT_ZOOM, MAX_DAY_PX, ZOOM_STEP } from "../../core/model";
import { fitDayWidth, type Span } from "./geometry";
import { labelWidth } from "./measure";

/** Wheel delta (px) → zoom exponent. */
const WHEEL_RATE = 0.0015;

export interface ZoomApi {
  /** Day width in px actually used for rendering. */
  w: number;
  /** Zoom factor in effect (the stored factor clamped to [1, maxZoom]). */
  factor: number;
  /** Largest useful factor for the current project and window (day = MAX_DAY_PX). */
  maxZoom: number;
  /** "Fit" or "156%". */
  label: string;
  canZoomIn: boolean;
  canZoomOut: boolean;
  /** Set the factor, keeping the date at `clientX` (default: viewport centre) in place. */
  setFactor: (z: number, clientX?: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
}

/**
 * Fit-relative zoom. Fit (factor 1) is the day width at which the whole
 * project fits `availPx`; the stored factor multiplies it up to MAX_DAY_PX.
 * The stored factor is clamped only when used, so shrinking the window and
 * growing it back keeps the user's zoom.
 *
 * Every zoom keeps an anchor date fixed on screen: the date under the pointer
 * (wheel) or at the centre of the visible timeline (buttons, keys, slider).
 * Also installs Ctrl/⌘ + wheel/pinch on the workspace and Ctrl/⌘ +/−/0.
 */
export function useZoom({ stored, onChange, tasks, availPx, today, workspaceRef, gridW }: {
  stored: number;
  onChange: (z: number) => void;
  /** Everything drawn with a label: tasks and group summary bars. */
  tasks: readonly Span[];
  availPx: number;
  today: Date;
  workspaceRef: RefObject<HTMLElement | null>;
  gridW: number;
}): ZoomApi {
  const fitW = useMemo(() => fitDayWidth(tasks, availPx, labelWidth, today), [tasks, availPx, today]);
  const maxZoom = Math.max(FIT_ZOOM, MAX_DAY_PX / fitW);
  const factor = Math.min(Math.max(stored, FIT_ZOOM), maxZoom);
  const w = Math.min(fitW * factor, MAX_DAY_PX);

  // Anchor: fractional days from the range start, and its x within the visible timeline.
  const anchor = useRef<{ days: number; px: number } | null>(null);
  const live = useRef({ factor, maxZoom, w, gridW });
  useLayoutEffect(() => { live.current = { factor, maxZoom, w, gridW }; }, [factor, maxZoom, w, gridW]);

  const setFactor = useCallback((z: number, clientX?: number) => {
    const { factor: cur, maxZoom: max, w: curW, gridW: gw } = live.current;
    const next = Math.min(Math.max(z, FIT_ZOOM), max);
    if (Math.abs(next - cur) < 1e-9) return;
    const ws = workspaceRef.current;
    if (ws) {
      const viewW = ws.clientWidth - gw;
      const px = clientX === undefined
        ? viewW / 2
        : Math.min(Math.max(clientX - ws.getBoundingClientRect().left - gw, 0), viewW);
      anchor.current = { days: (ws.scrollLeft + px) / curW, px };
    }
    onChange(next);
  }, [onChange, workspaceRef]);

  // After the new width has rendered, scroll so the anchor date is back under its x.
  useLayoutEffect(() => {
    const a = anchor.current;
    const ws = workspaceRef.current;
    anchor.current = null;
    if (a && ws) ws.scrollLeft = Math.max(0, a.days * w - a.px);
  }, [w, workspaceRef]);

  const zoomIn = useCallback(() => setFactor(live.current.factor * ZOOM_STEP), [setFactor]);
  const zoomOut = useCallback(() => setFactor(live.current.factor / ZOOM_STEP), [setFactor]);
  const fit = useCallback(() => setFactor(FIT_ZOOM), [setFactor]);

  useEffect(() => {
    const ws = workspaceRef.current;
    if (!ws) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
      setFactor(live.current.factor * Math.exp(-dy * WHEEL_RATE), e.clientX);
    };
    ws.addEventListener("wheel", onWheel, { passive: false });
    return () => ws.removeEventListener("wheel", onWheel);
  }, [workspaceRef, setFactor]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "+" || e.key === "=") { e.preventDefault(); zoomIn(); }
      else if (e.key === "-") { e.preventDefault(); zoomOut(); }
      else if (e.key === "0") { e.preventDefault(); fit(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [zoomIn, zoomOut, fit]);

  const atFit = factor <= FIT_ZOOM + 1e-9;
  return {
    w, factor, maxZoom,
    label: atFit ? "Fit" : `${Math.round(factor * 100)}%`,
    canZoomIn: factor < maxZoom - 1e-9,
    canZoomOut: !atFit,
    setFactor, zoomIn, zoomOut, fit,
  };
}

/** Logarithmic slider mapping: factor ↔ 0..SLIDER_MAX. */
export const SLIDER_MAX = 1000;
export const factorToSlider = (f: number, max: number) => (max > 1 ? Math.round((Math.log(f) / Math.log(max)) * SLIDER_MAX) : 0);
export const sliderToFactor = (v: number, max: number) => (max > 1 ? Math.exp((v / SLIDER_MAX) * Math.log(max)) : 1);
