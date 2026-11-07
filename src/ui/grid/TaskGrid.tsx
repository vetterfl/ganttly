import { forwardRef, useCallback, useLayoutEffect, useRef, type CSSProperties, type Dispatch, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { isAuto, PALETTE, type Action, type Calendar, type Task } from "../../core/model";
import { useSettings } from "../../settings/SettingsContext";
import type { ResizableCol } from "../../settings/settings";
import { ColumnResizer } from "./ColumnResizer";
import { ChevronIcon, TrashIcon } from "../icons";
import { ComputedDate, DateCell, DurationInput } from "./cells";
import { gridColumnVars } from "./columns";
import { PredecessorCell } from "./PredecessorCell";

interface GridProps {
  tasks: Task[];
  expanded: ReadonlySet<number>;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  dispatch: Dispatch<Action>;
  /** Project calendar: durations and lags are in its days. */
  calendar: Calendar;
  /** Row being dragged (dimmed) and the drop line's y, from useRowDrag. */
  dragId?: number | null;
  dropY?: number | null;
  onGripDown?: (e: PointerEvent, id: number) => void;
}

export const TaskGrid = forwardRef<HTMLElement, GridProps>(function TaskGrid(
  { tasks, expanded, onToggle, onDelete, dispatch, calendar, dragId = null, dropY = null, onGripDown }, ref,
) {
  const { settings, update } = useSettings();
  const cols = settings.columns;
  const widths = settings.columnWidths;
  const paneRef = useRef<HTMLElement | null>(null);
  const setRefs = useCallback((el: HTMLElement | null) => {
    paneRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  }, [ref]);

  const commitWidth = useCallback((col: ResizableCol, w: number | null) => {
    const next = { ...settings.columnWidths };
    if (w === null) delete next[col]; else next[col] = w;
    update({ columnWidths: next });
  }, [settings.columnWidths, update]);

  // Moving rows: React reorders row nodes by key, which can drop focus. Remember
  // which control had focus (by its position in the row / detail strip) and
  // restore it in the moved task after the re-render.
  const pendingFocus = useRef<{ id: number; part: "row" | "detail"; idx: number } | null>(null);
  const move: MoveFn = useCallback((id, toIndex, from) => {
    const container = from?.closest<HTMLElement>(".row, .detail");
    if (from && container) {
      const idx = [...container.querySelectorAll(FOCUSABLE)].indexOf(from);
      if (idx >= 0) pendingFocus.current = { id, part: container.classList.contains("detail") ? "detail" : "row", idx };
    }
    dispatch({ type: "moveTask", id, toIndex });
  }, [dispatch]);
  useLayoutEffect(() => {
    const f = pendingFocus.current;
    pendingFocus.current = null;
    if (!f) return;
    const container = paneRef.current?.querySelector(`.${f.part}[data-task-id="${f.id}"]`);
    const el = container?.querySelectorAll<HTMLElement>(FOCUSABLE)[f.idx];
    if (el && document.activeElement !== el) {
      // A move button that just became disabled (task reached an edge) can't take focus: use its sibling.
      const target = el instanceof HTMLButtonElement && el.disabled
        ? container?.querySelector<HTMLElement>(".move-btn:not(:disabled)") ?? el
        : el;
      target.focus();
    }
  }, [tasks]);

  const head = (col: ResizableCol, label: string, className?: string): ReactNode => (
    <div className={className} data-col={col}>
      <span className="head-label">{label}</span>
      <ColumnResizer col={col} label={label} cols={cols} widths={widths} paneRef={paneRef} onCommit={commitWidth} />
    </div>
  );

  return (
    <section className="grid-pane" ref={setRefs} aria-label="Task table" style={gridColumnVars(cols, widths) as CSSProperties}>
      <div className="grid-head" role="row">
        <div data-col="id">ID</div>
        <div data-col="toggle" aria-label="Expand" />
        {head("name", "Task Name")}
        {cols.duration && head("duration", "Duration", "c-dur")}
        {cols.start && head("start", "Start", "c-start")}
        {cols.finish && head("finish", "Finish", "c-fin")}
        {cols.pct && head("pct", "% Complete", "c-pct")}
        {cols.preds && head("preds", "Predecessors", "c-preds")}
      </div>
      <div className="grid-body">
        {tasks.length === 0 ? (
          <div className="grid-empty">No tasks yet — use <b>Add task</b> in the ribbon to start your plan.</div>
        ) : (
          tasks.map((t, i) => (
            <GridRow key={t.id} task={t} index={i} tasks={tasks} open={expanded.has(t.id)}
              onToggle={onToggle} onDelete={onDelete} onMove={move} dispatch={dispatch} calendar={calendar}
              dragging={dragId === t.id} onGripDown={onGripDown} />
          ))
        )}
        {dropY !== null && <div className="drop-line" style={{ top: dropY }} />}
      </div>
    </section>
  );
});

const FOCUSABLE = "input, button, select, textarea";
type MoveFn = (id: number, toIndex: number, from: Element | null) => void;

function GridRow({ task: t, index, tasks, open, onToggle, onDelete, onMove, dispatch, calendar, dragging, onGripDown }: {
  task: Task; index: number; tasks: Task[]; open: boolean;
  onToggle: (id: number) => void; onDelete: (id: number) => void; onMove: MoveFn;
  dispatch: Dispatch<Action>; calendar: Calendar;
  dragging: boolean; onGripDown?: (e: PointerEvent, id: number) => void;
}) {
  const isFirst = index === 0, isLast = index === tasks.length - 1;
  /** Alt+↑ / Alt+↓ anywhere in the row or its detail strip moves the task. */
  const onKeyDown = (e: KeyboardEvent) => {
    if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const to = index + (e.key === "ArrowUp" ? -1 : 1);
    if (to >= 0 && to < tasks.length) onMove(t.id, to, e.target as Element);
  };
  const unit = calendar === "workdays" ? "wdays" : "days";
  const { settings } = useSettings();
  const cols = settings.columns;
  const fmt = settings.dateFormat;
  const auto = isAuto(t);
  const row = index + 1;

  const startCell = auto
    ? <ComputedDate value={t.s} fmt={fmt} />
    : <DateCell value={t.s} label="Start" fmt={fmt} onCommit={date => dispatch({ type: "setStart", id: t.id, date })} />;
  const finishCell = <DateCell value={t.e} label="Finish" fmt={fmt} onCommit={date => dispatch({ type: "setFinish", id: t.id, date })} />;

  return (
    <>
      <div className={`row${dragging ? " dragging" : ""}`} role="row" data-task-id={t.id} data-auto={auto || undefined} onKeyDown={onKeyDown}>
        <div className="cell-id">
          {onGripDown && (
            <span className="grip" aria-hidden="true" title="Drag to reorder" onPointerDown={e => onGripDown(e, t.id)} />
          )}
          {row}
        </div>
        <div className="cell-toggle">
          <button type="button" className="toggle" aria-expanded={open} title="Task options"
            aria-label={`${open ? "Collapse" : "Expand"} options for task ${row}`} onClick={() => onToggle(t.id)}>
            <ChevronIcon />
          </button>
        </div>
        <div data-col="name">
          <input type="text" className="cell-input name-input" value={t.n} maxLength={120} aria-label="Task name" title={t.n}
            onChange={e => dispatch({ type: "rename", id: t.id, name: e.target.value })} />
        </div>
        {cols.duration && <div className="c-dur cell-dur" data-col="duration"><DurationInput task={t} dispatch={dispatch} calendar={calendar} /><span className="unit">{unit}</span></div>}
        {cols.start && <div className="c-start" data-col="start">{startCell}</div>}
        {cols.finish && <div className="c-fin" data-col="finish">{finishCell}</div>}
        {cols.pct && <div className="cell-pct c-pct" data-col="pct" title={`${t.p}%`}>{t.p}%</div>}
        {cols.preds && <div className="c-preds" data-col="preds"><PredecessorCell task={t} tasks={tasks} lang={settings.notation} calendar={calendar} dispatch={dispatch} /></div>}
      </div>
      {open && (
        <div className="detail" data-task-id={t.id} onKeyDown={onKeyDown}>
          <div className="detail-body">
            <span className="swatches" role="radiogroup" aria-label="Bar colour">
              {PALETTE.map((c, ci) => (
                <button key={c} type="button" className={`swatch${ci === t.c ? " active" : ""}`} style={{ background: c }}
                  role="radio" aria-checked={ci === t.c} aria-label={`Colour ${ci + 1}`} title={`Colour ${ci + 1}`}
                  onClick={() => dispatch({ type: "setColor", id: t.id, color: ci })} />
              ))}
            </span>
            <label>Progress
              <input type="range" min={0} max={100} step={5} value={t.p} aria-label="Progress"
                onChange={e => dispatch({ type: "setProgress", id: t.id, pct: Number(e.target.value) })} />
              <span className="progress-val">{t.p}%</span>
            </label>
            <label className="narrow-only">Start {startCell}</label>
            <label className="narrow-only">Finish {finishCell}</label>
            <label className="narrow-only">Duration <DurationInput task={t} dispatch={dispatch} calendar={calendar} /> {unit}</label>
            <label className="narrow-only">Predecessors <PredecessorCell task={t} tasks={tasks} lang={settings.notation} calendar={calendar} dispatch={dispatch} /></label>
            <span className="move-btns">
              <button type="button" className="del move-btn" aria-label="Move task up" title="Move up (Alt+↑)" disabled={isFirst}
                onClick={e => onMove(t.id, index - 1, e.currentTarget)}>↑ Up</button>
              <button type="button" className="del move-btn" aria-label="Move task down" title="Move down (Alt+↓)" disabled={isLast}
                onClick={e => onMove(t.id, index + 1, e.currentTarget)}>↓ Down</button>
            </span>
            <button type="button" className="del" title="Delete task" onClick={() => onDelete(t.id)}><TrashIcon /> Delete</button>
          </div>
        </div>
      )}
    </>
  );
}
