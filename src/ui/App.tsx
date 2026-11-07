import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { addDays, iso, parseDate } from "../core/dates";
import { emptyProject, sampleProject, type Project, type SampleNames } from "../core/model";
import { useI18n } from "../i18n/I18nContext";
import type { Translate } from "../i18n";
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

/** The project described by the current URL (sample project, named in the app language, when there is none). */
function projectFromUrl(sample: SampleNames): Project {
  const today = startOfToday();
  return decodeProject(location.search, today) ?? sampleProject(today, sample);
}

function initProject(sample: SampleNames): Project {
  const p = projectFromUrl(sample);
  return reducer(p, { type: "load", project: p });
}

const sampleNames = (t: Translate): SampleNames => ({ title: t("sample.title"), tasks: t("sample.tasks").split("|") });

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
  const { t, locale } = useI18n();
  const [project, dispatch] = useReducer(reducer, sampleNames(t), initProject);
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(() => new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [toastMsg, toastShown, toast] = useToast();
  const { settings } = useSettings();
  const [today] = useState(startOfToday);
  // Sample names for the popstate loader (Back to a URL without a project), in the current language.
  const sampleRef = useRef(sampleNames(t));
  useEffect(() => { sampleRef.current = sampleNames(t); }, [t]);

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
      dispatch({ type: "load", project: projectFromUrl(sampleRef.current) });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => { document.title = (title || t("app.untitled")) + " — Ganttly"; }, [title, t]);

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
  const zoomLabel = zoomApi.atFit ? t("ribbon.fit") : `${zoomApi.percent}%`;

  /** Add a task (to `group`, or ungrouped); a collapsed target group is expanded so the task is visible. */
  const addTaskTo = useCallback((group: number | null) => {
    const g = project.groups.find(x => x.id === group);
    if (g?.collapsed) dispatch({ type: "toggleGroup", id: g.id });
    focusTaskId.current = project.nextId;
    dispatch({ type: "addTask", today: iso(startOfToday()), group, name: t("default.task") });
  }, [project.groups, project.nextId, t]);
  // The ribbon's Add task appends to the last group when there are groups.
  const addTask = () => addTaskTo(project.groups.at(-1)?.id ?? null);
  const addGroup = () => {
    focusTaskId.current = project.nextId;
    dispatch({ type: "addGroup", name: t("default.group") });
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
    toast(t(withTasks ? "toast.groupAndTasksDeleted" : "toast.groupDeleted"));
    setDeleteGroupId(null);
  };
  const delGroup = project.groups.find(g => g.id === deleteGroupId);
  const delCount = project.tasks.filter(t => t.g === deleteGroupId).length;
  const newProject = () => {
    setConfirmNew(false);
    history.pushState(null, "", location.pathname + encodeProject(emptyProject(t("app.untitled"))));
    setExpanded(new Set());
    dispatch({ type: "newProject", title: t("app.untitled") });
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
    toast(t("toast.taskDeleted"));
  }, [toast, t]);

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
    toast(t("toast.linkCopied"));
  };

  const subtitle = useMemo(() => {
    if (!tasks.length) return t("app.subtitle.none");
    const s = tasks.reduce((m, x) => (x.s < m ? x.s : m), tasks[0]!.s);
    const e = tasks.reduce((m, x) => (x.e > m ? x.e : m), tasks[0]!.e);
    const f = settings.dateFormat;
    return t("app.subtitle", {
      from: formatDateObj(addDays(parseDate(s), -2), f, locale), to: formatDateObj(addDays(parseDate(e), 3), f, locale), n: tasks.length,
    });
  }, [tasks, settings.dateFormat, locale, t]);

  return (
    <div className={`app density-${settings.density}`}>
      <header className="titlebar">
        <div className="logo"><span className="mark" />Ganttly</div>
        <input className="project-title" type="text" value={title} maxLength={80} aria-label={t("app.projectTitle")}
          onChange={e => dispatch({ type: "setTitle", title: e.target.value })} />
      </header>

      <nav className="ribbon" aria-label={t("app.commands")}>
        <RibbonGroup id="task" caption={t("ribbon.task")}>
          <button type="button" className="btn" onClick={addTask} title={t("ribbon.addTask.title")}><AddTaskIcon />{t("ribbon.addTask")}</button>
          <button type="button" className="btn" onClick={addGroup} title={t("ribbon.addGroup.title")}><AddGroupIcon />{t("ribbon.addGroup")}</button>
        </RibbonGroup>
        <RibbonGroup id="share" caption={t("ribbon.share")}>
          <button type="button" className="btn" onClick={copyLink} title={t("ribbon.copyLink.title")}><LinkIcon />{t("ribbon.copyLink")}</button>
        </RibbonGroup>
        <RibbonGroup id="view" caption={t("ribbon.view")}>
          <span className="zoom-ctl">
            <button type="button" className="btn small" onClick={zoomApi.zoomOut} disabled={!zoomApi.canZoomOut}
              title={t("ribbon.zoomOut.title")} aria-label={t("ribbon.zoomOut")}>−</button>
            <input type="range" className="zoom-slider" min={0} max={SLIDER_MAX} step={1} aria-label={t("ribbon.zoom")}
              aria-valuetext={zoomLabel} disabled={zoomApi.maxZoom <= 1}
              value={factorToSlider(zoomApi.factor, zoomApi.maxZoom)}
              onChange={e => zoomApi.setFactor(sliderToFactor(Number(e.target.value), zoomApi.maxZoom))} />
            <button type="button" className="btn small" onClick={zoomApi.zoomIn} disabled={!zoomApi.canZoomIn}
              title={t("ribbon.zoomIn.title")} aria-label={t("ribbon.zoomIn")}>+</button>
            <span className="zoom-label" aria-live="polite">{zoomLabel}</span>
          </span>
          <button type="button" className="btn" onClick={zoomApi.fit} title={t("ribbon.fit.title")}><FitIcon />{t("ribbon.fit")}</button>
          <button type="button" className="btn" ref={settingsBtn} onClick={() => setSettingsOpen(true)} title={t("ribbon.settings.title")}><SettingsIcon />{t("ribbon.settings")}</button>
        </RibbonGroup>
        <RibbonGroup id="file" caption={t("ribbon.file")}>
          <button type="button" className="btn" ref={newBtn} onClick={requestNew} title={t("ribbon.new.title")}><NewFileIcon />{t("ribbon.new")}</button>
          <button type="button" className="btn" onClick={() => window.print()} title={t("ribbon.print.title")}><PrintIcon />{t("ribbon.print")}</button>
        </RibbonGroup>
        <div className="info">{subtitle}</div>
      </nav>

      <div className="print-only print-head">
        <h1>{title || t("app.untitled")}</h1>
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
        open={confirmNew} title={t("dialog.new.title")} returnFocusRef={newBtn}
        message={t("dialog.new.message", { title: title || t("app.untitled"), n: tasks.length })}
        actions={[{ label: t("dialog.new.confirm"), danger: true, onConfirm: newProject }]}
        onCancel={() => setConfirmNew(false)}
      />
      <ConfirmDialog
        open={deleteGroupId !== null} title={t("dialog.deleteGroup.title")}
        message={t("dialog.deleteGroup.message", { name: delGroup?.n || t("group.unnamed"), n: delCount })}
        actions={[
          { label: t("dialog.deleteGroup.keep"), onConfirm: () => deleteGroup(false) },
          { label: t("dialog.deleteGroup.delete", delCount), danger: true, onConfirm: () => deleteGroup(true) },
        ]}
        onCancel={() => setDeleteGroupId(null)}
      />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} returnFocusRef={settingsBtn}
        calendar={project.calendar} onCalendar={calendar => dispatch({ type: "setCalendar", calendar })} />
    </div>
  );
}

function RibbonGroup({ id: key, caption, children }: { id: string; caption: string; children: React.ReactNode }) {
  const id = `cap-${key}`;
  return (
    <div className="ribbon-group" role="group" aria-labelledby={id}>
      <div className="cmds">{children}</div>
      <div className="caption" id={id}>{caption}</div>
    </div>
  );
}
