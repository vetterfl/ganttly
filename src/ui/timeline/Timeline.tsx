import { useMemo } from "react";
import { diffDays } from "../../core/dates";
import { PALETTE, type Task } from "../../core/model";
import type { Settings } from "../../settings/settings";
import { formatDate } from "../format";
import type { RowMetrics } from "../hooks";
import { LABEL_GAP } from "./arrows";
import { DependencyArrows } from "./DependencyArrows";
import { barBox, computeRange } from "./geometry";
import { dayLabelWidth, labelWidth } from "./measure";
import { avoidSpan, buildTimescale, weekendRects } from "./timescale";

const NO_EXPANDED: ReadonlySet<number> = new Set();
const isWeekend = (min: Date, dayIndex: number) => [0, 6].includes((min.getDay() + Math.round(dayIndex)) % 7);

/**
 * Timeline at a given day width `w` (px). Header cells, gridlines and weekend
 * shading are generated per timescale unit (see timescale.ts), so the DOM size
 * follows the number of visible units rather than the number of days.
 */
export function Timeline({ tasks, expanded, w, today, availPx, metrics, settings }: {
  tasks: Task[]; expanded: ReadonlySet<number>; w: number; today: Date;
  availPx: number; metrics: RowMetrics; settings: Settings;
}) {
  const { min, totalDays } = useMemo(
    () => computeRange(tasks, w, availPx, today, labelWidth), [tasks, w, availPx, today],
  );
  const fmt = settings.dateFormat;
  const ts = useMemo(
    () => buildTimescale(min, totalDays, w, settings.notation, { today, labelWidth, dayLabelWidth }),
    [min, totalDays, w, settings.notation, today],
  );
  const shadeWeekends = ts.weekends && settings.showWeekends;
  const weekends = useMemo(() => (shadeWeekends ? weekendRects(min, totalDays, w) : []), [shadeWeekends, min, totalDays, w]);
  const gridPath = useMemo(() => ts.lines.map(x => `M${x + 0.5} 0V1`).join(""), [ts.lines]);

  const todayOff = diffDays(today, min);
  const todayX = todayOff * w + w / 2;
  const showToday = settings.showToday && todayOff >= 0 && todayOff < totalDays;
  const width = totalDays * w;
  // The Today flag sits in the top tier, 4px right of the today line.
  const flagW = labelWidth("Today") * (10 / 12) + 8;
  const topCells = useMemo(
    () => (showToday ? avoidSpan(ts.top, todayX + 4, todayX + 4 + flagW, labelWidth) : ts.top),
    [ts.top, showToday, todayX, flagW],
  );
  const arrowProps = { tasks, min, w, rowH: metrics.rowH, detailH: metrics.detailH, width };

  return (
    <section className="timeline-pane" aria-label="Timeline" style={{ width }}>
      <div className="timescale">
        <div className="tier">
          {topCells.map(c => (
            <div key={c.key} className="ts-cell top-cell" style={{ left: c.x, width: c.width, paddingLeft: c.indent ? 6 + c.indent : undefined }}>{c.label}</div>
          ))}
        </div>
        <div className="tier">
          {ts.bottom.map(c => (
            <div key={c.key} style={{ left: c.x, width: c.width }}
              className={`ts-cell bottom-cell${ts.dayNumbers ? " day" : ""}${ts.dayNumbers && shadeWeekends && isWeekend(min, c.x / w) ? " weekend" : ""}${c.today && settings.showToday ? " today" : ""}`}>
              {c.label ? <span>{c.label}</span> : null}
            </div>
          ))}
        </div>
        {showToday && <div className="today-flag" style={{ left: todayX }}>Today</div>}
      </div>
      <div className="tl-body">
        <div className="tl-cols">
          {weekends.map(r => <div key={r.x} className="weekend-col" style={{ left: r.x, width: r.width }} />)}
          <svg className="gridlines" width={width} height="100%" viewBox={`0 0 ${width} 1`} preserveAspectRatio="none" aria-hidden="true">
            <path d={gridPath} />
          </svg>
        </div>
        {showToday && <div className="today-line" style={{ left: todayX }} />}
        {tasks.map(t => {
          const box = barBox(t, min, w);
          const tip = `${t.n} · ${formatDate(t.s, fmt)} → ${formatDate(t.e, fmt)} · ${t.p}% complete`;
          return (
            <Lane key={t.id} spacer={expanded.has(t.id)}>
              <div className="bar" data-task-id={t.id} title={tip}
                style={{ left: box.left, width: box.width, background: PALETTE[t.c] ?? PALETTE[0] }}>
                {settings.showProgress && t.p > 0 && <div className="fill" style={{ width: `${t.p}%` }} />}
              </div>
              <span className="bar-label" style={{ left: box.right + LABEL_GAP }}>{t.n}</span>
            </Lane>
          );
        })}
        {settings.showArrows && (
          <>
            <DependencyArrows {...arrowProps} expanded={expanded} className="screen-only" />
            {/* Print hides detail strips and spacer lanes, so it needs arrows laid out without them */}
            <DependencyArrows {...arrowProps} expanded={NO_EXPANDED} className="print-only" />
          </>
        )}
      </div>
    </section>
  );
}

function Lane({ spacer, children }: { spacer: boolean; children: React.ReactNode }) {
  return (
    <>
      <div className="lane">{children}</div>
      {spacer && <div className="lane spacer" />}
    </>
  );
}
