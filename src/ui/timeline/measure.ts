// Text measurement for timeline layout (bar labels, timescale labels).
// Canvas-based; falls back to a per-character estimate where canvas is
// unavailable (jsdom).

const ctxs = new Map<string, CanvasRenderingContext2D | null>();

function measurer(font: string): (text: string) => number {
  return (text: string) => {
    if (!ctxs.has(font)) {
      let ctx: CanvasRenderingContext2D | null = null;
      try {
        ctx = document.createElement("canvas").getContext("2d");
      } catch { /* no canvas */ }
      if (ctx) ctx.font = `${font} ${getComputedStyle(document.body).fontFamily}`;
      ctxs.set(font, ctx);
    }
    const ctx = ctxs.get(font);
    return ctx ? Math.ceil(ctx.measureText(text).width) : text.length * 7;
  };
}

/** Bar labels and upper/lower tier labels: 12px semibold. */
export const labelWidth = measurer("600 12px");
/** Day numbers in the lower tier: 11px regular. */
export const dayLabelWidth = measurer("400 11px");
