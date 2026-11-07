import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { addDays, iso, parseDate } from "../core/dates";
import { emptyProject, sampleProject, type Project } from "../core/model";
import { reducer } from "../core/reducer";
import { decodeProject, encodeProject } from "../core/urlCodec";
import { useSettings } from "../settings/SettingsContext";
import { formatDateObj } from "./format";
import { TaskGrid } from "./grid/TaskGrid";
import { useElementWidth, useRowMetrics } from "./hooks";
import { useDragPan } from "./useDragPan";
import { slotY, useRowDrag, type DragItem } from "./grid/useRowDrag";
import { rowsHeight, rowTops } from "./timeline/geometry";
import { displayRows, groupDropIndex, snapGroupSlot, taskDropTarget } from "../core/groups";
import { ConfirmDialog } from "./ConfirmDialog";
import { AddGroupIcon, AddTaskIcon, FitIcon, LinkIcon, NewFileIcon, PrintIcon, SettingsIcon } from "./icons";
import { SettingsDialog } from "./SettingsDialog";
import { Timeline } from "./timeline/Timeline";
import { factorToSlider, SLIDER_MAX, sliderToFactor, useZoom } from "./timeline/useZoom";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** The project described by the current URL (sample project when there is none). */
function projectFromUrl(): Project {
  const today = startOfToday();
  return decodeProject(location.search, today) ?? sampleProject(today);
}

function initProject(): Project {
  const p = projectFromUrl();
  return reducer(p, { type: "load", project: p });
}

function useToast(): [string, boolean, (msg: string) => void] {
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const toast = useCallback((m: string) => {
    setMsg(m);
    setShow(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShow(false), 2200);
  }, []);
  return [msg, show, toast];
}

export function App() {
  const [project, dispatch] = useReducer(reducer, undefined, initProject);
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(() => new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [toastMsg, toastShown, toast] = useToast();
  const { settings } = useSettings();
  const [today] = useState(startOfToday);

  const workspaceRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLElement>(null);
  const settingsBtn = useRef<HTMLButtonElement>(null);
  const newBtn = useRef<HTMLButtonElement>(null);
  const focusTaskId = useRef<number | null>(null);

  const workspaceW = useElementWidth(workspaceRef);
  const gridW = useElementWidth(gridRef);
  const metrics = useRowMetrics(workspaceRef, settings.density);
  const { tasks, zoom, title } = project;

  // URL is the only persistence: rewrite it (v3) on every change. Edits replace
  // the history entry; only New pushes one (see newProject below).
  useEffect(() => {
    history.replaceState(null, "", location.pathname + encodeProject(project));
  }, [project]);
  // Back/Forward (e.g. after New): load whatever project the URL now holds.
  useEffect(() => {
    const onPop = () => {
      setExpanded(new Set());
      dispatch({ type: "load", project: projectFromUrl() });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => { document.title = (title || "Untitled") + " — Ganttly"; }, [title]);

  // Focus + select the name of a just-added task or group.
  useEffect(() => {
    if (focusTaskId.current === null) return;
    const id = focusTaskId.current;
    const el = document.querySelector<HTMLInputElement>(
      `.row[data-task-id="${id}"] .name-input, .group-row[data-group-id="${id}"] .group-name-input`,
    );
    focusTaskId.current = null;
    if (el) { el.focus(); el.select(); }
  }, [project]);

  const availPx = Math.max(0, workspaceW - gridW - 2);
  const onZoom = useCallback((z: number) => dispatch({ type: "setZoom", zoom: z }), []);
  useDragPan(workspaceRef);
  // One list of display rows (tasks and group headers) drives grid, timeline, arrows and dragging.
  const rows = useMemo(() => displayRows(project, expanded), [project, expanded]);
  // Drops: a task joins the section of the gap it's dropped in (see taskDropTarget);
  // a group may only land between groups and moves with all its tasks.
  const onDrop = useCallback((item: DragItem, slot: number) => {
    if (item.kind === "task") {
      const target = taskDropTarget(project, rows, item.id, slot);
      if (target) dispatch({ type: "moveTask", id: item.id, ...target });
    } else {
      const to = groupDropIndex(project, rows, item.id, slot);
      if (to !== null) dispatch({ type: "moveGroup", id: item.id, toIndex: to });
    }
  }, [project, rows]);
  const snap = useCallback((item: DragItem, slot: number) => (item.kind === "group" ? snapGroupSlot(rows, slot) : slot), [rows]);
  const rowDrag = useRowDrag({ rows, rowH: metrics.rowH, detailH: metrics.detailH, workspaceRef, snap, onDrop });
  const dropY = useMemo(() => {
    if (!rowDrag.drag) return null;
    return slotY(rowDrag.drag.slot, rowTops(rows, metrics.rowH, metrics.detailH), rowsHeight(rows, metrics.rowH, metrics.detailH));
  }, [rowDrag.drag, rows, metrics]);
  // Fit and the timeline range must make room for every bar label: tasks (even
  // in collapsed groups) and the group summary bars.
  const spans = useMemo(() => [
    ...tasks,
    ...rows.flatMap(r => (r.kind === "group" && r.rollup ? [{ s: r.rollup.s, e: r.rollup.e, n: r.group.n }] : [])),
  ], [tasks, rows]);
  const zoomApi = useZoom({ stored: zoom, onChange: onZoom, tasks: spans, availPx, today, workspaceRef, gridW });

  /** Add a task (to `group`, or ungrouped); a collapsed target group is expanded so the task is visible. */
  const addTaskTo = useCallback((group: number | null) => {
    const g = project.groups.find(x => x.id === group);
    if (g?.collapsed) dispatch({ type: "toggleGroup", id: g.id });
    focusTaskId.current = project.nextId;
    dispatch({ type: "addTask", today: iso(startOfToday()), group });
  }, [project.groups, project.nextId]);
  // The ribbon's Add task appends to the last group when there are groups.
  const addTask = () => addTaskTo(project.groups.at(-1)?.id ?? null);
  const addGroup = () => {
    focusTaskId.current = project.nextId;
    dispatch({ type: "addGroup" });
  };

  // Deleting a group with tasks asks whether to delete them too or keep them ungrouped.
  const [deleteGroupId, setDeleteGroupId] = useState<number | null>(null);
  const requestDeleteGroup = useCallback((id: number) => {
    if (project.tasks.some(t => t.g === id)) setDeleteGroupId(id);
    else dispatch({ type: "deleteGroup", id, withTasks: false });
  }, [project.tasks]);
  const deleteGroup = (withTasks: boolean) => {
    if (deleteGroupId === null) return;
    dispatch({ type: "deleteGroup", id: deleteGroupId, withTasks });
    toast(withTasks ? "Group and its tasks deleted" : "Group deleted, tasks kept");
    setDeleteGroupId(null);
  };
  const delGroup = project.groups.find(g => g.id === deleteGroupId);
  const delCount = project.tasks.filter(t => t.g === deleteGroupId).length;
  const newProject = () => {
    setConfirmNew(false);
    history.pushState(null, "", location.pathname + encodeProject(emptyProject()));
    setExpanded(new Set());
    dispatch({ type: "newProject" });
  };
  const requestNew = () => {
    if (tasks.length) setConfirmNew(true);
    else newProject();
  };

  const toggle = useCallback((id: number) => setExpanded(prev => {
    const next = new Set(prev);
    if (!next.delete(id)) next.add(id);
    return next;
  }), []);
  const remove = useCallback((id: number) => {
    setExpanded(prev => { const next = new Set(prev); next.delete(id); return next; });
    dispatch({ type: "deleteTask", id });
    toast("Task deleted");
  }, [toast]);

  const copyLink = async () => {
    const url = location.origin + location.pathname + encodeProject(project);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    toast("Shareable link copied to clipboard 🔗");
  };

  const subtitle = useMemo(() => {
    if (!tasks.length) return "No tasks";
    const s = tasks.reduce((m, t) => (t.s < m ? t.s : m), tasks[0]!.s);
    const e = tasks.reduce((m, t) => (t.e > m ? t.e : m), tasks[0]!.e);
    const f = settings.dateFormat;
    return `${formatDateObj(addDays(parseDate(s), -2), f)} — ${formatDateObj(addDays(parseDate(e), 3), f)} · ${tasks.length} task${tasks.length > 1 ? "s" : ""}`;
  }, [tasks, settings.dateFormat]);

  return (
    <div className={`app density-${settings.density}`}>
      <header className="titlebar">
        <div className="logo"><span className="mark" />Ganttly</div>
        <input className="project-title" type="text" value={title} maxLength={80} aria-label="Project title"
          onChange={e => dispatch({ type: "setTitle", title: e.target.value })} />
      </header>

      <nav className="ribbon" aria-label="Commands">
        <RibbonGroup caption="Task">
          <button type="button" className="btn" onClick={addTask} title="Add a new task (to the last group, if there are groups)"><AddTaskIcon />Add task</button>
          <button type="button" className="btn" onClick={addGroup} title="Add a group (section header)"><AddGroupIcon />Add group</button>
        </RibbonGroup>
        <RibbonGroup caption="Share">
          <button type="button" className="btn" onClick={copyLink} title="Copy a shareable link with all chart data"><LinkIcon />Copy link</button>
        </RibbonGroup>
        <RibbonGroup caption="View">
          <span className="zoom-ctl">
            <button type="button" className="btn small" onClick={zoomApi.zoomOut} disabled={!zoomApi.canZoomOut}
              title="Zoom out (Ctrl/⌘ + −)" aria-label="Zoom out">−</button>
            <input type="range" className="zoom-slider" min={0} max={SLIDER_MAX} step={1} aria-label="Zoom"
              aria-valuetext={zoomApi.label} disabled={zoomApi.maxZoom <= 1}
              value={factorToSlider(zoomApi.factor, zoomApi.maxZoom)}
              onChange={e => zoomApi.setFactor(sliderToFactor(Number(e.target.value), zoomApi.maxZoom))} />
            <button type="button" className="btn small" onClick={zoomApi.zoomIn} disabled={!zoomApi.canZoomIn}
              title="Zoom in (Ctrl/⌘ + +, or Ctrl/⌘ + wheel over the chart)" aria-label="Zoom in">+</button>
            <span className="zoom-label" aria-live="polite">{zoomApi.label}</span>
          </span>
          <button type="button" className="btn" onClick={zoomApi.fit} title="Fit the whole project (Ctrl/⌘ + 0)"><FitIcon />Fit</button>
          <button type="button" className="btn" ref={settingsBtn} onClick={() => setSettingsOpen(true)} title="View settings"><SettingsIcon />Settings</button>
        </RibbonGroup>
        <RibbonGroup caption="File">
          <button type="button" className="btn" ref={newBtn} onClick={requestNew} title="Start a new, empty project"><NewFileIcon />New</button>
          <button type="button" className="btn" onClick={() => window.print()} title="Print the chart"><PrintIcon />Print</button>
        </RibbonGroup>
        <div className="info">{subtitle}</div>
      </nav>

      <div className="print-only print-head">
        <h1>{title || "Untitled Project"}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="workspace" ref={workspaceRef}>
        <div className="split">
          <TaskGrid ref={gridRef} tasks={tasks} rows={rows} groups={project.groups} onToggle={toggle} onDelete={remove} dispatch={dispatch} calendar={project.calendar}
            drag={rowDrag.drag} dropY={dropY} onAddTaskToGroup={addTaskTo} onDeleteGroup={requestDeleteGroup} onGripDown={rowDrag.onGripDown} />
          <Timeline spans={spans} rows={rows} w={zoomApi.w} today={today}
            availPx={availPx} metrics={metrics} settings={settings} dropY={dropY} />
        </div>
      </div>

      <div className={`toast${toastShown ? " show" : ""}`} role="status">{toastMsg}</div>
      <ConfirmDialog
        open={confirmNew} title="Start a new project?" returnFocusRef={newBtn}
        message={<>This replaces “{title || "Untitled Project"}” and its {tasks.length} task{tasks.length === 1 ? "" : "s"} with an empty project. You can get it back with the browser’s Back button.</>}
        actions={[{ label: "New project", danger: true, onConfirm: newProject }]}
        onCancel={() => setConfirmNew(false)}
      />
      <ConfirmDialog
        open={deleteGroupId !== null} title="Delete group?"
        message={<>“{delGroup?.n || "Unnamed group"}” contains {delCount} task{delCount === 1 ? "" : "s"}. Delete them too, or keep them as ungrouped tasks?</>}
        actions={[
          { label: "Keep tasks (ungroup)", onConfirm: () => deleteGroup(false) },
          { label: `Delete group and ${delCount} task${delCount === 1 ? "" : "s"}`, danger: true, onConfirm: () => deleteGroup(true) },
        ]}
        onCancel={() => setDeleteGroupId(null)}
      />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} returnFocusRef={settingsBtn}
        calendar={project.calendar} onCalendar={calendar => dispatch({ type: "setCalendar", calendar })} />
    </div>
  );
}

function RibbonGroup({ caption, children }: { caption: string; children: React.ReactNode }) {
  const id = `cap-${caption.toLowerCase()}`;
  return (
    <div className="ribbon-group" role="group" aria-labelledby={id}>
      <div className="cmds">{children}</div>
      <div className="caption" id={id}>{caption}</div>
    </div>
  );
}
