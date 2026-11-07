import { useId } from "react";
import type { Row } from "../../core/groups";
import type { Task } from "../../core/model";
import { anchorsFor, routeArrow } from "./arrows";
import { barBox, rowsHeight, rowTops } from "./geometry";

/**
 * One SVG overlay holding every link arrow. Geometry is computed from the
 * same row metrics and day→x mapping the lanes and bars use, never measured
 * from the DOM, so arrows cannot drift from their bars.
 */
export function DependencyArrows({ rows, min, w, rowH, detailH, width, className }: {
  /** Display rows; arrows to or from tasks that aren't displayed (collapsed groups) are skipped. */
  rows: readonly Row[]; min: Date; w: number;
  rowH: number; detailH: number; width: number; className: string;
}) {
  const markerId = useId().replace(/:/g, "");
  const tops = rowTops(rows, rowH, detailH);
  const height = rowsHeight(rows, rowH, detailH);
  const index = new Map<number, number>();
  rows.forEach((r, i) => { if (r.kind === "task") index.set(r.task.id, i); });

  const paths: { key: string; d: string }[] = [];
  rows.forEach((row, j) => {
    if (row.kind !== "task") return;
    const succ = row.task;
    for (const link of succ.deps) {
      const i = index.get(link.pred);
      if (i === undefined) continue;
      const pred = (rows[i] as { task: Task }).task;
      const { from, to } = anchorsFor(link.type);
      const pb = barBox(pred, min, w);
      const sb = barBox(succ, min, w);
      const y1 = tops[i]! + rowH / 2;
      const y2 = tops[j]! + rowH / 2;
      const gapY = y2 >= y1 ? tops[i]! + rowH : tops[i]!;
      const d = routeArrow(
        link.type,
        { x: from === "end" ? pb.right : pb.left, y: y1 },
        { x: to === "end" ? sb.right : sb.left, y: y2 },
        gapY,
      );
      paths.push({ key: `${link.pred}-${succ.id}`, d });
    }
  });
  if (!paths.length) return null;

  return (
    <svg className={`arrows ${className}`} width={width} height={height} aria-hidden="true" data-arrow-count={paths.length}>
      <defs>
        <marker id={markerId} viewBox="0 0 8 8" refX="7.5" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8 z" />
        </marker>
      </defs>
      {paths.map(p => <path key={p.key} d={p.d} markerEnd={`url(#${markerId})`} data-link={p.key} />)}
    </svg>
  );
}
