// English messages — the source of truth for every interface text.
// Values are strings, or functions for parameters and plurals. Other languages
// are typed against this object (see Messages in ./index.ts), so a new key
// here must be added to de.ts as well.

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const en = {
  // App shell
  "app.projectTitle": "Project title",
  "app.untitled": "Untitled Project",
  "app.commands": "Commands",
  "app.subtitle.none": "No tasks",
  "app.subtitle": (p: { from: string; to: string; n: number }) => `${p.from} — ${p.to} · ${p.n} ${plural(p.n, "task", "tasks")}`,

  // Ribbon
  "ribbon.task": "Task",
  "ribbon.share": "Share",
  "ribbon.view": "View",
  "ribbon.file": "File",
  "ribbon.addTask": "Add task",
  "ribbon.addTask.title": "Add a new task (to the last group, if there are groups)",
  "ribbon.addGroup": "Add group",
  "ribbon.addGroup.title": "Add a group (section header)",
  "ribbon.copyLink": "Copy link",
  "ribbon.copyLink.title": "Copy a shareable link with all chart data",
  "ribbon.zoomOut": "Zoom out",
  "ribbon.zoomOut.title": "Zoom out (Ctrl/⌘ + −)",
  "ribbon.zoomIn": "Zoom in",
  "ribbon.zoomIn.title": "Zoom in (Ctrl/⌘ + +, or Ctrl/⌘ + wheel over the chart)",
  "ribbon.zoom": "Zoom",
  "ribbon.fit": "Fit",
  "ribbon.fit.title": "Fit the whole project (Ctrl/⌘ + 0)",
  "ribbon.settings": "Settings",
  "ribbon.settings.title": "Settings",
  "ribbon.new": "New",
  "ribbon.new.title": "Start a new, empty project",
  "ribbon.print": "Print",
  "ribbon.print.title": "Print the chart",

  // Toasts
  "toast.taskDeleted": "Task deleted",
  "toast.linkCopied": "Shareable link copied to clipboard 🔗",
  "toast.groupDeleted": "Group deleted, tasks kept",
  "toast.groupAndTasksDeleted": "Group and its tasks deleted",

  // Dialogs
  "dialog.cancel": "Cancel",
  "dialog.new.title": "Start a new project?",
  "dialog.new.message": (p: { title: string; n: number }) =>
    `This replaces “${p.title}” and its ${p.n} ${plural(p.n, "task", "tasks")} with an empty project. You can get it back with the browser’s Back button.`,
  "dialog.new.confirm": "New project",
  "dialog.deleteGroup.title": "Delete group?",
  "dialog.deleteGroup.message": (p: { name: string; n: number }) =>
    `“${p.name}” contains ${p.n} ${plural(p.n, "task", "tasks")}. Delete them too, or keep them as ungrouped tasks?`,
  "dialog.deleteGroup.keep": "Keep tasks (ungroup)",
  "dialog.deleteGroup.delete": (n: number) => `Delete group and ${n} ${plural(n, "task", "tasks")}`,

  // Grid
  "grid.label": "Task table",
  "grid.id": "ID",
  "grid.expand": "Expand",
  "grid.name": "Task Name",
  "grid.duration": "Duration",
  "grid.start": "Start",
  "grid.finish": "Finish",
  "grid.pct": "% Complete",
  "grid.pct.title": "% Complete",
  "grid.preds": "Predecessors",
  "grid.empty.before": "No tasks yet — use",
  "grid.empty.after": "in the ribbon to start your plan.",
  "grid.taskName": "Task name",
  "grid.taskOptions": "Task options",
  "grid.expandOptions": (row: number) => `Expand options for task ${row}`,
  "grid.collapseOptions": (row: number) => `Collapse options for task ${row}`,
  "grid.dragTask": "Drag to reorder",
  "grid.resize": (col: string) => `Resize ${col} column`,
  "grid.resize.title": "Drag to resize · double-click to fit",
  "grid.editDate": (p: { label: string; date: string }) => `${p.label}: ${p.date}. Edit`,
  "grid.computed": (date: string) => `${date} · calculated from predecessors`,
  "grid.preds.hint.de": "Predecessors, e.g. 3;4EA+2T",
  "grid.preds.hint.en": "Predecessors, e.g. 3,4FS+2d",

  // Duration units
  "unit.days": (n: number) => plural(n, "day", "days"),
  "unit.workdays": (n: number) => plural(n, "wday", "wdays"),
  "unit.days.title": "Duration in days",
  "unit.workdays.title": "Duration in working days (Mon–Fri)",

  // Task options strip
  "detail.colour": "Bar colour",
  "detail.colourN": (n: number) => `Colour ${n}`,
  "detail.progress": "Progress",
  "detail.group": "Group",
  "detail.noGroup": "(No group)",
  "detail.up": "↑ Up",
  "detail.down": "↓ Down",
  "detail.moveUp": "Move task up",
  "detail.moveDown": "Move task down",
  "detail.moveUp.title": "Move up (Alt+↑)",
  "detail.moveDown.title": "Move down (Alt+↓)",
  "detail.delete": "Delete",
  "detail.delete.title": "Delete task",

  // Groups
  "group.name": "Group name",
  "group.unnamed": "Unnamed group",
  "group.expand": (name: string) => `Expand group ${name}`,
  "group.collapse": (name: string) => `Collapse group ${name}`,
  "group.expand.title": "Expand group",
  "group.collapse.title": "Collapse group",
  "group.drag": "Drag to move the group",
  "group.addTask": (name: string) => `Add task to ${name}`,
  "group.addTask.title": "Add a task to this group",
  "group.actions": (name: string) => `Group actions for ${name}`,
  "group.more": "More",
  "group.moveUp": "Move group up",
  "group.moveDown": "Move group down",
  "group.delete": "Delete group…",

  // Timeline
  "timeline.label": "Timeline",
  "timeline.today": "Today",
  "timeline.tip": (p: { name: string; from: string; to: string; pct: number }) => `${p.name} · ${p.from} → ${p.to} · ${p.pct}% complete`,
  "timeline.week": (n: number) => `W${n}`,
  "timeline.weekShort": (n: number) => `${n}`,

  // Predecessor errors (from core/notation ParseError kinds)
  "error.syntax": (entry: string) => `Invalid entry "${entry}"`,
  "error.unknown": (row: string) => `Task ${row} does not exist`,
  "error.self": "A task cannot depend on itself",
  "error.cycle": (p: { rows: string; me: number }) => `Circular dependency: task ${p.rows} already depends on task ${p.me}`,

  // Settings dialog
  "settings.title": "Settings",
  "settings.project": "Project",
  "settings.project.hint": "— saved with this project and its link",
  "settings.scheduleIn": "Schedule in",
  "settings.calendarDays": "Calendar days",
  "settings.workingDays": "Working days (Mon–Fri)",
  "settings.languageSection": "Language & dates",
  "settings.language": "Language",
  "settings.language.auto": "Automatic (browser language)",
  "settings.notation": "Link notation",
  "settings.notation.auto": "Same as app language",
  "settings.notation.de": "Deutsch — EA/AA/EE/AE, T",
  "settings.notation.en": "English — FS/SS/FF/SF, d",
  "settings.dateFormat": "Date format",
  "settings.dateFormat.locale": "Language default",
  "settings.dateFormat.iso": "ISO (YYYY-MM-DD)",
  "settings.dateFormat.dmy": "DD.MM.YYYY",
  "settings.layout": "Layout",
  "settings.density": "Row density",
  "settings.density.compact": "Compact",
  "settings.density.comfortable": "Comfortable",
  "settings.columns": "Grid columns",
  "settings.column": (name: string) => `${name} column`,
  "settings.timeline": "Timeline",
  "settings.arrows": "Dependency arrows",
  "settings.weekends": "Weekend shading",
  "settings.today": "Today marker",
  "settings.progress": "Progress on bars",
  "settings.reset": "Reset to defaults",
  "settings.close": "Close",

  // Content Ganttly creates (stored as ordinary data once created)
  "default.task": "New task",
  "default.group": "New group",
  "sample.title": "Website Relaunch",
  "sample.tasks": "Research & strategy|Wireframes|Visual design|Development|Content & copywriting|Testing & QA|Launch 🚀",
};
