import { useMemo } from "react";
import { addDays, diffDays } from "../../core/dates";
import { PALETTE, ZOOMS, type Task } from "../../core/model";
import type { Settings } from "../../settings/settings";
import { formatDate } from "../format";
import type { RowMetrics } from "../hooks";
import { LABEL_GAP } from "./arrows";
import { DependencyArrows } from "./DependencyArrows";
import { barBox, computeRange } from "./geometry";

let measureCtx: CanvasRenderingContext2D | null | undefined;
function labelWidth(text: string): number {
  if (measureCtx === undefined) {
    try {
      measureCtx = document.createElement("canvas").getContext("2d");
    } catch {
      measureCtx = null; // jsdom: no canvas
    }
    if (measureCtx) measureCtx.font = "600 12px " + getComputedStyle(document.body).fontFamily;
  }
  return measureCtx ? Math.ceil(measureCtx.measureText(text).width) : text.length * 7;
}

const NO_EXPANDED: ReadonlySet<number> = new Set();

export function Timeline({ tasks, expanded, zoom, today, availPx, metrics, settings }: {
  tasks: Task[]; expanded: ReadonlySet<number>; zoom: number; today: Date;
  availPx: number; metrics: RowMetrics; settings: Settings;
}) {
  const w = ZOOMS[zoom]!.w;
  const { min, totalDays } = useMemo(
    () => computeRange(tasks, w, availPx, today, labelWidth), [tasks, w, availPx, today],
  );
  const max = addDays(min, totalDays - 1);
  const fmt = settings.dateFormat;

  const months = useMemo(() => {
    const out: { key: string; width: number; label: string }[] = [];
    let cursor = new Date(min);
    while (cursor <= max) {
      const mEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      const to = mEnd < max ? mEnd : max;
      const span = diffDays(to, cursor) + 1;
      out.push({
        key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
        width: span * w,
        label: span * w >= 64 ? cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" }) : "",
      });
      cursor = addDays(to, 1);
    }
    return out;
  }, [min, max, w]);

  const days = useMemo(() => Array.from({ length: totalDays }, (_, i) => {
    const d = addDays(min, i);
    return {
      i, date: d.getDate(),
      weekend: d.getDay() === 0 || d.getDay() === 6,
      today: d.getTime() === today.getTime(),
      // At small zoom levels only label Mondays and month starts
      showNum: w >= 20 || d.getDay() === 1 || d.getDate() === 1,
    };
  }), [min, totalDays, today, w]);

  const todayOff = diffDays(today, min);
  const todayX = todayOff * w + w / 2;
  const showToday = settings.showToday && todayOff >= 0 && todayOff < totalDays;
  const width = totalDays * w;
  const arrowProps = { tasks, min, w, rowH: metrics.rowH, detailH: metrics.detailH, width };

  return (
    <section className="timeline-pane" aria-label="Timeline" style={{ width }}>
      <div className="timescale">
        <div className="tier">
          {months.map(m => <div key={m.key} className="month-cell" style={{ width: m.width }}>{m.label}</div>)}
        </div>
        <div className="tier">
          {days.map(d => (
            <div key={d.i} className={`day-cell${d.weekend && settings.showWeekends ? " weekend" : ""}${d.today && settings.showToday ? " today" : ""}`} style={{ width: w }}>
              {d.showNum ? <span>{d.date}</span> : null}
            </div>
          ))}
        </div>
        {showToday && <div className="today-flag" style={{ left: todayX }}>Today</div>}
      </div>
      <div className="tl-body">
        <div className="tl-cols">
          {days.map(d => (
            <div key={d.i} className={`day-col${d.weekend && settings.showWeekends ? " weekend" : ""}`} style={{ left: d.i * w, width: w }} />
          ))}
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
