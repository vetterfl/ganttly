import { useMemo } from "react";
import { diffDays } from "../../core/dates";
import type { Row } from "../../core/groups";
import { PALETTE } from "../../core/model";
import type { Settings } from "../../settings/settings";
import { formatDate } from "../format";
import { useI18n } from "../../i18n/I18nContext";
import type { RowMetrics } from "../hooks";
import { LABEL_GAP } from "./arrows";
import { DependencyArrows } from "./DependencyArrows";
import { barBox, computeRange, type Span } from "./geometry";
import { dayLabelWidth, labelWidth } from "./measure";
import { avoidSpan, buildTimescale, weekendRects } from "./timescale";

const isWeekend = (min: Date, dayIndex: number) => [0, 6].includes((min.getDay() + Math.round(dayIndex)) % 7);

/**
 * Timeline at a given day width `w` (px). Header cells, gridlines and weekend
 * shading are generated per timescale unit (see timescale.ts), so the DOM size
 * follows the number of visible units rather than the number of days.
 */
export function Timeline({ spans, rows, w, today, availPx, metrics, settings, dropY = null }: {
  /** Everything with a bar and label (all tasks, including hidden ones, and group summaries): the date range. */
  spans: readonly Span[];
  /** Display rows: what is drawn, top to bottom (see core/groups displayRows). */
  rows: readonly Row[];
  w: number; today: Date;
  availPx: number; metrics: RowMetrics; settings: Settings;
  /** y of the row-reorder drop line, or null when no row is being dragged. */
  dropY?: number | null;
}) {
  const { min, totalDays } = useMemo(
    () => computeRange(spans, w, availPx, today, labelWidth), [spans, w, availPx, today],
  );
  const fmt = settings.dateFormat;
  const { t, locale } = useI18n();
  const ts = useMemo(
    () => buildTimescale(min, totalDays, w, {
      today, labelWidth, dayLabelWidth, locale,
      weekLabel: n => [t("timeline.week", n), t("timeline.weekShort", n)],
    }),
    [min, totalDays, w, today, locale, t],
  );
  const shadeWeekends = ts.weekends && settings.showWeekends;
  const weekends = useMemo(() => (shadeWeekends ? weekendRects(min, totalDays, w) : []), [shadeWeekends, min, totalDays, w]);
  const gridPath = useMemo(() => ts.lines.map(x => `M${x + 0.5} 0V1`).join(""), [ts.lines]);

  const todayOff = diffDays(today, min);
  const todayX = todayOff * w + w / 2;
  const showToday = settings.showToday && todayOff >= 0 && todayOff < totalDays;
  const width = totalDays * w;
  // The Today flag sits in the top tier, 4px right of the today line.
  const flagW = labelWidth(t("timeline.today")) * (10 / 12) + 8;
  const topCells = useMemo(
    () => (showToday ? avoidSpan(ts.top, todayX + 4, todayX + 4 + flagW, labelWidth) : ts.top),
    [ts.top, showToday, todayX, flagW],
  );
  const arrowProps = { min, w, rowH: metrics.rowH, detailH: metrics.detailH, width };
  // Print hides detail strips (and their spacer lanes), so its arrows are laid out without them.
  const printRows = useMemo(() => rows.map(r => (r.kind === "task" && r.detail ? { ...r, detail: false } : r)), [rows]);

  return (
    <section className="timeline-pane" aria-label={t("timeline.label")} style={{ width }}>
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
        {showToday && <div className="today-flag" style={{ left: todayX }}>{t("timeline.today")}</div>}
      </div>
      <div className="tl-body">
        <div className="tl-cols">
          {weekends.map(r => <div key={r.x} className="weekend-col" style={{ left: r.x, width: r.width }} />)}
          <svg className="gridlines" width={width} height="100%" viewBox={`0 0 ${width} 1`} preserveAspectRatio="none" aria-hidden="true">
            <path d={gridPath} />
          </svg>
        </div>
        {showToday && <div className="today-line" style={{ left: todayX }} />}
        {dropY !== null && <div className="drop-line" style={{ top: dropY }} />}
        {rows.map(r => {
          if (r.kind === "group") {
            const ru = r.rollup;
            const box = ru && barBox(ru, min, w);
            return (
              <div key={`g${r.group.id}`} className="lane group-lane" data-group-id={r.group.id}>
                {ru && box && (
                  <>
                    <div className="summary-bar" data-group-id={r.group.id}
                      title={t("timeline.tip", { name: r.group.n, from: formatDate(ru.s, fmt, locale), to: formatDate(ru.e, fmt, locale), pct: ru.p })}
                      style={{ left: box.left, width: box.width }} />
                    <span className="bar-label group-label" style={{ left: box.right + LABEL_GAP }}>{r.group.n}</span>
                  </>
                )}
              </div>
            );
          }
          const task = r.task;
          const box = barBox(task, min, w);
          const tip = t("timeline.tip", { name: task.n, from: formatDate(task.s, fmt, locale), to: formatDate(task.e, fmt, locale), pct: task.p });
          return (
            <Lane key={task.id} spacer={r.detail}>
              <div className="bar" data-task-id={task.id} title={tip}
                style={{ left: box.left, width: box.width, background: PALETTE[task.c] ?? PALETTE[0] }}>
                {settings.showProgress && task.p > 0 && <div className="fill" style={{ width: `${task.p}%` }} />}
              </div>
              <span className="bar-label" style={{ left: box.right + LABEL_GAP }}>{task.n}</span>
            </Lane>
          );
        })}
        {settings.showArrows && (
          <>
            <DependencyArrows {...arrowProps} rows={rows} className="screen-only" />
            <DependencyArrows {...arrowProps} rows={printRows} className="print-only" />
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
