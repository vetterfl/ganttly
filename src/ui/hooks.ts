import { useEffect, useState, type RefObject } from "react";

export interface RowMetrics {
  rowH: number;
  detailH: number;
}

const FALLBACK: RowMetrics = { rowH: 32, detailH: 44 };

function readMetrics(el: Element | null): RowMetrics {
  if (!el || typeof getComputedStyle === "undefined") return FALLBACK;
  const cs = getComputedStyle(el);
  const rowH = parseFloat(cs.getPropertyValue("--row-h"));
  const detailH = parseFloat(cs.getPropertyValue("--detail-h"));
  return {
    rowH: Number.isFinite(rowH) && rowH > 0 ? rowH : FALLBACK.rowH,
    detailH: Number.isFinite(detailH) && detailH > 0 ? detailH : FALLBACK.detailH,
  };
}

/**
 * Row geometry from the CSS custom properties (the single source of truth that
 * also sizes grid rows and lanes). Re-read on resize (breakpoints change
 * --detail-h) and whenever `dep` changes (e.g. density setting).
 */
export function useRowMetrics(ref: RefObject<Element | null>, dep: unknown): RowMetrics {
  const [m, setM] = useState<RowMetrics>(FALLBACK);
  useEffect(() => {
    const read = () => setM(prev => {
      const next = readMetrics(ref.current);
      return next.rowH === prev.rowH && next.detailH === prev.detailH ? prev : next;
    });
    read();
    window.addEventListener("resize", read);
    window.addEventListener("beforeprint", read);
    window.addEventListener("afterprint", read);
    return () => {
      window.removeEventListener("resize", read);
      window.removeEventListener("beforeprint", read);
      window.removeEventListener("afterprint", read);
    };
  }, [ref, dep]);
  return m;
}

/** Content-box width of an element, kept up to date with ResizeObserver. */
export function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setW(el.clientWidth);
    read();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", read);
      return () => window.removeEventListener("resize", read);
    }
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}
