import { forwardRef, type CSSProperties, type Dispatch } from "react";
import { isAuto, PALETTE, type Action, type Task } from "../../core/model";
import { useSettings } from "../../settings/SettingsContext";
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
}

export const TaskGrid = forwardRef<HTMLElement, GridProps>(function TaskGrid(
  { tasks, expanded, onToggle, onDelete, dispatch }, ref,
) {
  const { settings } = useSettings();
  const cols = settings.columns;
  return (
    <section className="grid-pane" ref={ref} aria-label="Task table" style={gridColumnVars(cols) as CSSProperties}>
      <div className="grid-head" role="row">
        <div>ID</div>
        <div aria-label="Expand" />
        <div>Task Name</div>
        {cols.duration && <div className="c-dur">Duration</div>}
        {cols.start && <div className="c-start">Start</div>}
        {cols.finish && <div className="c-fin">Finish</div>}
        {cols.pct && <div className="c-pct">% Complete</div>}
        {cols.preds && <div className="c-preds">Predecessors</div>}
      </div>
      <div className="grid-body">
        {tasks.length === 0 ? (
          <div className="grid-empty">No tasks yet — use <b>Add task</b> in the ribbon to start your plan.</div>
        ) : (
          tasks.map((t, i) => (
            <GridRow key={t.id} task={t} index={i} tasks={tasks} open={expanded.has(t.id)}
              onToggle={onToggle} onDelete={onDelete} dispatch={dispatch} />
          ))
        )}
      </div>
    </section>
  );
});

function GridRow({ task: t, index, tasks, open, onToggle, onDelete, dispatch }: {
  task: Task; index: number; tasks: Task[]; open: boolean;
  onToggle: (id: number) => void; onDelete: (id: number) => void; dispatch: Dispatch<Action>;
}) {
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
      <div className="row" role="row" data-task-id={t.id} data-auto={auto || undefined}>
        <div className="cell-id">{row}</div>
        <div className="cell-toggle">
          <button type="button" className="toggle" aria-expanded={open} title="Task options"
            aria-label={`${open ? "Collapse" : "Expand"} options for task ${row}`} onClick={() => onToggle(t.id)}>
            <ChevronIcon />
          </button>
        </div>
        <div>
          <input type="text" className="cell-input name-input" value={t.n} maxLength={120} aria-label="Task name"
            onChange={e => dispatch({ type: "rename", id: t.id, name: e.target.value })} />
        </div>
        {cols.duration && <div className="c-dur cell-dur"><DurationInput task={t} dispatch={dispatch} /><span>days</span></div>}
        {cols.start && <div className="c-start">{startCell}</div>}
        {cols.finish && <div className="c-fin">{finishCell}</div>}
        {cols.pct && <div className="cell-pct c-pct">{t.p}%</div>}
        {cols.preds && <div className="c-preds"><PredecessorCell task={t} tasks={tasks} lang={settings.notation} dispatch={dispatch} /></div>}
      </div>
      {open && (
        <div className="detail" data-task-id={t.id}>
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
            <label className="narrow-only">Duration <DurationInput task={t} dispatch={dispatch} /> days</label>
            <label className="narrow-only">Predecessors <PredecessorCell task={t} tasks={tasks} lang={settings.notation} dispatch={dispatch} /></label>
            <button type="button" className="del" title="Delete task" onClick={() => onDelete(t.id)}><TrashIcon /> Delete</button>
          </div>
        </div>
      )}
    </>
  );
}
