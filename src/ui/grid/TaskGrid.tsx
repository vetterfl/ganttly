import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type Dispatch, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { moveTarget, type MoveTarget, type Row, type Rollup } from "../../core/groups";
import { isAuto, MAX_NAME, PALETTE, type Action, type Calendar, type Group, type Task } from "../../core/model";
import { formatDate } from "../format";
import type { DragItem } from "./useRowDrag";
import { useSettings } from "../../settings/SettingsContext";
import type { ResizableCol } from "../../settings/settings";
import { ColumnResizer } from "./ColumnResizer";
import { ChevronIcon, MoreIcon, TrashIcon } from "../icons";
import { ComputedDate, DateCell, DurationInput } from "./cells";
import { gridColumnVars } from "./columns";
import { PredecessorCell } from "./PredecessorCell";

interface GridProps {
  /** All tasks in order (row numbers, predecessor notation). */
  tasks: Task[];
  /** Display rows: what is shown, top to bottom (see core/groups displayRows). */
  rows: readonly Row[];
  /** Groups in order (Group selector, moves across headers). */
  groups: readonly Group[];
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  dispatch: Dispatch<Action>;
  /** Project calendar: durations and lags are in its days. */
  calendar: Calendar;
  /** Item being dragged (dimmed) and the drop line's y, from useRowDrag. */
  drag?: DragItem | null;
  dropY?: number | null;
  onGripDown?: (e: PointerEvent, item: DragItem) => void;
  /** Group header "+": add a task to that group. */
  onAddTaskToGroup?: (groupId: number) => void;
  /** Group header Delete (the caller asks what to do with the tasks). */
  onDeleteGroup?: (groupId: number) => void;
}

export const TaskGrid = forwardRef<HTMLElement, GridProps>(function TaskGrid(
  { tasks, rows, groups, onToggle, onDelete, dispatch, calendar, drag = null, dropY = null, onGripDown, onAddTaskToGroup, onDeleteGroup }, ref,
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
  // which control had focus (by its position in the row / detail strip / group
  // header) and restore it in the moved row after the re-render.
  const pendingFocus = useRef<{ sel: string; idx: number } | null>(null);
  const rememberFocus = (from: Element | null, sel: (part: string) => string) => {
    const container = from?.closest<HTMLElement>(".row, .detail");
    if (!from || !container) return;
    const idx = [...container.querySelectorAll(FOCUSABLE)].indexOf(from);
    if (idx >= 0) pendingFocus.current = { sel: sel(container.classList.contains("detail") ? "detail" : "row"), idx };
  };
  const move: MoveFn = useCallback((id, target, from) => {
    rememberFocus(from, part => `.${part}[data-task-id="${id}"]`);
    dispatch({ type: "moveTask", id, ...target });
  }, [dispatch]);
  const order = { tasks, groups: groups as Group[] };
  const moveGroup = useCallback((id: number, toIndex: number, from: Element | null) => {
    rememberFocus(from, () => `.group-row[data-group-id="${id}"]`);
    dispatch({ type: "moveGroup", id, toIndex });
  }, [dispatch]);
  useLayoutEffect(() => {
    const f = pendingFocus.current;
    pendingFocus.current = null;
    if (!f) return;
    const container = paneRef.current?.querySelector(f.sel);
    const el = container?.querySelectorAll<HTMLElement>(FOCUSABLE)[f.idx];
    if (el && document.activeElement !== el) {
      // A move button that just became disabled (task reached an edge) can't take focus: use its sibling.
      const target = el instanceof HTMLButtonElement && el.disabled
        ? container?.querySelector<HTMLElement>(".move-btn:not(:disabled)") ?? el
        : el;
      target.focus();
    }
  }, [rows]);
  const groupCount = rows.reduce((n, r) => n + (r.kind === "group" ? 1 : 0), 0);
  let groupIndex = -1;

  const head = (col: ResizableCol, label: string, className?: string): ReactNode => (
    <div className={className} data-col={col}>
      <span className="head-label">{label}</span>
      <ColumnResizer col={col} label={label} cols={cols} widths={widths} paneRef={paneRef} onCommit={commitWidth} />
    </div>
  );

  return (
    <section className={`grid-pane${cols.preds ? "" : " no-preds"}`} ref={setRefs} aria-label="Task table" style={gridColumnVars(cols, widths) as CSSProperties}>
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
          rows.map(r => r.kind === "group" ? (
            <GroupRow key={`g${r.group.id}`} group={r.group} rollup={r.rollup} index={++groupIndex} count={groupCount}
              calendar={calendar} dispatch={dispatch} onMove={moveGroup}
              onAdd={onAddTaskToGroup} onDelete={onDeleteGroup} onGripDown={onGripDown}
              dragging={drag?.kind === "group" && drag.id === r.group.id} />
          ) : (
            <GridRow key={r.task.id} task={r.task} index={r.number - 1} tasks={tasks} open={r.detail}
              inGroup={r.task.g !== undefined} groups={groups}
              up={moveTarget(order, r.task.id, -1)} down={moveTarget(order, r.task.id, 1)}
              onToggle={onToggle} onDelete={onDelete} onMove={move} dispatch={dispatch} calendar={calendar}
              dragging={drag?.kind === "task" && drag.id === r.task.id} onGripDown={onGripDown} />
          ))
        )}
        {dropY !== null && <div className="drop-line" style={{ top: dropY }} />}
      </div>
    </section>
  );
});

const FOCUSABLE = "input, button, select, textarea";

/**
 * A group's header row: drag grip, collapse chevron, editable name, read-only
 * roll-ups (Start, Finish, Duration, % Complete) and its actions (+ add task,
 * and a menu with move up/down and delete) at the row's right edge.
 */
function GroupRow({ group: g, rollup, index, count, calendar, dispatch, onMove, onAdd, onDelete, onGripDown, dragging }: {
  group: Group; rollup: Rollup | null; index: number; count: number; calendar: Calendar;
  dispatch: Dispatch<Action>; onMove: (id: number, toIndex: number, from: Element | null) => void;
  onAdd?: (id: number) => void; onDelete?: (id: number) => void;
  onGripDown?: (e: PointerEvent, item: DragItem) => void; dragging: boolean;
}) {
  const { settings } = useSettings();
  const cols = settings.columns;
  const fmt = settings.dateFormat;
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const close = (e: Event) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false); };
    document.addEventListener("pointerdown", close, true);
    return () => document.removeEventListener("pointerdown", close, true);
  }, [menu]);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && menu) { e.preventDefault(); setMenu(false); return; }
    if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const to = index + (e.key === "ArrowUp" ? -1 : 1);
    if (to >= 0 && to < count) onMove(g.id, to, e.target as Element);
  };
  const unit = calendar === "workdays" ? "wdays" : "days";
  const label = g.n || "Unnamed group";
  const menuItem = (text: string, run: () => void, disabled = false) => (
    <button type="button" role="menuitem" disabled={disabled} onClick={() => { setMenu(false); run(); }}>{text}</button>
  );
  return (
    <div className={`row group-row${g.collapsed ? " collapsed" : ""}${dragging ? " dragging" : ""}`} role="row"
      data-group-id={g.id} onKeyDown={onKeyDown}>
      <div className="cell-id">
        {onGripDown && (
          <span className="grip" aria-hidden="true" title="Drag to move the group" onPointerDown={e => onGripDown(e, { kind: "group", id: g.id })} />
        )}
      </div>
      <div className="cell-toggle">
        <button type="button" className="toggle" aria-expanded={!g.collapsed}
          aria-label={`${g.collapsed ? "Expand" : "Collapse"} group ${label}`} title={g.collapsed ? "Expand group" : "Collapse group"}
          onClick={() => dispatch({ type: "toggleGroup", id: g.id })}>
          <ChevronIcon />
        </button>
      </div>
      <div data-col="name">
        <input type="text" className="cell-input group-name-input" value={g.n} maxLength={MAX_NAME} aria-label="Group name" title={g.n}
          onChange={e => dispatch({ type: "renameGroup", id: g.id, name: e.target.value })} />
      </div>
      {cols.duration && (
        <div className="c-dur cell-dur group-roll group-dur" data-col="duration" title={rollup ? `${rollup.d} ${unit}` : undefined}>
          {rollup && <><span className="num">{rollup.d}</span>{" "}<span className="unit">{unit}</span></>}
        </div>
      )}
      {cols.start && <div className="c-start group-roll" data-col="start">{rollup ? formatDate(rollup.s, fmt) : ""}</div>}
      {cols.finish && <div className="c-fin group-roll" data-col="finish">{rollup ? formatDate(rollup.e, fmt) : ""}</div>}
      {cols.pct && <div className="c-pct group-roll" data-col="pct">{rollup ? `${rollup.p}%` : ""}</div>}
      {cols.preds && <div className="c-preds" data-col="preds" />}
      <div className="group-actions" ref={menuRef}>
        <button type="button" className="icon-btn" aria-label={`Add task to ${label}`} title="Add a task to this group"
          onClick={() => onAdd?.(g.id)}>+</button>
        <button type="button" className="icon-btn" aria-label={`Group actions for ${label}`} title="More"
          aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(m => !m)}><MoreIcon /></button>
        {menu && (
          <div className="group-menu" role="menu" aria-label={`Group actions for ${label}`}>
            {menuItem("Move group up", () => onMove(g.id, index - 1, null), index === 0)}
            {menuItem("Move group down", () => onMove(g.id, index + 1, null), index === count - 1)}
            {menuItem("Delete group…", () => onDelete?.(g.id))}
          </div>
        )}
      </div>
    </div>
  );
}
type MoveFn = (id: number, target: MoveTarget, from: Element | null) => void;

function GridRow({ task: t, index, tasks, open, inGroup, groups, up, down, onToggle, onDelete, onMove, dispatch, calendar, dragging, onGripDown }: {
  task: Task; index: number; tasks: Task[]; open: boolean; inGroup: boolean; groups: readonly Group[];
  /** Where Move up / Move down go (null at the very top / bottom). */
  up: MoveTarget | null; down: MoveTarget | null;
  onToggle: (id: number) => void; onDelete: (id: number) => void; onMove: MoveFn;
  dispatch: Dispatch<Action>; calendar: Calendar;
  dragging: boolean; onGripDown?: (e: PointerEvent, item: DragItem) => void;
}) {
  const isFirst = up === null, isLast = down === null;
  /** Alt+↑ / Alt+↓ anywhere in the row or its detail strip moves the task. */
  const onKeyDown = (e: KeyboardEvent) => {
    if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const target = e.key === "ArrowUp" ? up : down;
    if (target) onMove(t.id, target, e.target as Element);
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
      <div className={`row${inGroup ? " in-group" : ""}${dragging ? " dragging" : ""}`} role="row" data-task-id={t.id} data-auto={auto || undefined} onKeyDown={onKeyDown}>
        <div className="cell-id">
          {onGripDown && (
            <span className="grip" aria-hidden="true" title="Drag to reorder" onPointerDown={e => onGripDown(e, { kind: "task", id: t.id })} />
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
            {groups.length > 0 && (
              <label>Group
                <select className="group-select" value={t.g ?? ""} aria-label="Group"
                  onChange={e => dispatch({ type: "setTaskGroup", id: t.id, group: e.target.value === "" ? null : Number(e.target.value) })}>
                  <option value="">(No group)</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.n || "Unnamed group"}</option>)}
                </select>
              </label>
            )}
            <span className="move-btns">
              <button type="button" className="del move-btn" aria-label="Move task up" title="Move up (Alt+↑)" disabled={isFirst}
                onClick={e => up && onMove(t.id, up, e.currentTarget)}>↑ Up</button>
              <button type="button" className="del move-btn" aria-label="Move task down" title="Move down (Alt+↓)" disabled={isLast}
                onClick={e => down && onMove(t.id, down, e.currentTarget)}>↓ Down</button>
            </span>
            <button type="button" className="del" title="Delete task" onClick={() => onDelete(t.id)}><TrashIcon /> Delete</button>
          </div>
        </div>
      )}
    </>
  );
}
