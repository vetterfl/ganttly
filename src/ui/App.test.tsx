import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { b64decode } from "../core/urlCodec";
import { DEFAULT_SETTINGS } from "../settings/settings";
import { lk, mkProject, mkTask, renderApp, urlProject } from "./testutil";
import type { Project } from "../core/model";

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});

const rows = () => Array.from(document.querySelectorAll<HTMLElement>(".row[data-task-id]"));
const row = (n: number) => {
  const r = rows()[n - 1];
  if (!r) throw new Error(`no row ${n}`);
  return r;
};
const nameOf = (r: HTMLElement) => r.querySelector<HTMLInputElement>(".name-input")!.value;
const duration = (r: HTMLElement) => within(r).getByLabelText("Duration in days") as HTMLInputElement;
const preds = (r: HTMLElement) => within(r).getByLabelText("Predecessors") as HTMLInputElement;
const dateBtn = (r: HTMLElement, label: "Start" | "Finish") =>
  within(r).getByRole("button", { name: new RegExp(`^${label}:`) });
const toggle = (r: HTMLElement) => r.querySelector<HTMLButtonElement>("button.toggle")!;

const four = () => mkProject([
  mkTask(1, "Alpha", "2026-11-02", "2026-11-04"),
  mkTask(2, "Beta", "2026-11-05", "2026-11-06"),
  mkTask(3, "Gamma", "2026-11-09", "2026-11-13"),
  mkTask(4, "Delta", "2026-11-16", "2026-11-18"),
]);

describe("grid", () => {
  it("keeps focus while typing a name", async () => {
    const user = userEvent.setup();
    renderApp(four());
    const input = row(1).querySelector<HTMLInputElement>(".name-input")!;
    await user.clear(input);
    await user.type(input, "Kickoff");
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe("Kickoff");
    expect(document.querySelector(".bar-label")!.textContent).toBe("Kickoff");
  });

  it("clamps Start to Finish when Finish is set before Start (manual task)", async () => {
    const user = userEvent.setup();
    renderApp(four());
    await user.click(dateBtn(row(3), "Finish"));
    const input = within(row(3)).getByLabelText("Finish") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "2026-11-06" } });
    const t = urlProject().tasks[2]!;
    expect(t.e).toBe("2026-11-06");
    expect(t.s).toBe("2026-11-06");
    fireEvent.blur(input);
    expect(dateBtn(row(3), "Start").textContent).toBe(dateBtn(row(3), "Finish").textContent);
  });

  it("reverts an invalid duration on blur and applies a valid one", async () => {
    const user = userEvent.setup();
    renderApp(four());
    const dur = duration(row(1));
    expect(dur.value).toBe("3");
    await user.clear(dur);
    await user.type(dur, "0");
    await user.tab();
    expect(duration(row(1)).value).toBe("3");
    expect(urlProject().tasks[0]!.e).toBe("2026-11-04");

    const dur2 = duration(row(1));
    await user.clear(dur2);
    await user.type(dur2, "10");
    await user.tab();
    expect(duration(row(1)).value).toBe("10");
    expect(urlProject().tasks[0]!.e).toBe("2026-11-11"); // start + 9 days
  });

  it("keeps the right row expanded after deleting another", async () => {
    const user = userEvent.setup();
    renderApp(four());
    await user.click(toggle(row(3)));
    await user.click(toggle(row(2)));
    const betaId = row(2).dataset.taskId!;
    const del = within(document.querySelector<HTMLElement>(`.detail[data-task-id="${betaId}"]`)!)
      .getByRole("button", { name: /Delete/ });
    await user.click(del);

    expect(rows().map(nameOf)).toEqual(["Alpha", "Gamma", "Delta"]);
    expect(rows().map(r => r.querySelector(".cell-id")!.textContent)).toEqual(["1", "2", "3"]);
    const gamma = row(2);
    expect(nameOf(gamma)).toBe("Gamma");
    expect(toggle(gamma).getAttribute("aria-expanded")).toBe("true");
    expect(document.querySelectorAll(".detail")).toHaveLength(1);
    expect(document.querySelector(`.detail[data-task-id="${gamma.dataset.taskId}"]`)).not.toBeNull();
    expect(screen.getByRole("status").textContent).toBe("Task deleted");
  });
});

describe("predecessors", () => {
  it("reschedules task 4 when entering 2EE-2T", async () => {
    const user = userEvent.setup();
    renderApp(four());
    // Task 2 finishes 2026-11-06; task 4 has duration 3.
    // finish = 11-06 - 2 = 11-04; start = 11-04 - 2 = 11-02
    const input = preds(row(4));
    await user.click(input);
    await user.type(input, "2EE-2T{Enter}");
    const t = urlProject().tasks[3]!;
    expect(t.s).toBe("2026-11-02");
    expect(t.e).toBe("2026-11-04");
    expect(t.deps).toEqual([lk(2, "FF", -2)]);
    expect(preds(row(4)).value).toBe("2EE-2T");
  });

  it("reverts on Escape", async () => {
    const user = userEvent.setup();
    const p = four();
    p.tasks[3] = mkTask(4, "Delta", "2026-11-16", "2026-11-18", [lk(3)]);
    renderApp(p);
    const before = location.search;
    const input = preds(row(4));
    expect(input.value).toBe("3");
    await user.click(input);
    await user.type(input, "garbage");
    expect(input.value).toBe("3garbage");
    await user.keyboard("{Escape}");
    expect(input.value).toBe("3");
    expect(location.search).toBe(before);
  });

  it("shows a cycle error and leaves links unchanged", async () => {
    const user = userEvent.setup();
    const p = four();
    p.tasks[3] = mkTask(4, "Delta", "2026-11-16", "2026-11-18", [lk(3)]);
    renderApp(p);
    const before = location.search;
    const input = preds(row(3));
    await user.click(input);
    await user.clear(input);
    await user.type(input, "4{Enter}");
    const alert = within(row(3).parentElement!).getByRole("alert");
    expect(alert.textContent).toMatch(/circular/i);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(urlProject().tasks[2]!.deps).toEqual([]);
    expect(location.search).toBe(before);
    await user.keyboard("{Escape}");
    expect(preds(row(3)).value).toBe("");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("makes Start non-editable when the task has predecessors", () => {
    const p = four();
    p.tasks[2] = mkTask(3, "Gamma", "2026-11-09", "2026-11-13", [lk(2)]);
    renderApp(p);
    const r3 = row(3);
    expect(within(r3).queryByRole("button", { name: /^Start:/ })).toBeNull();
    expect(r3.querySelector('input[type="date"]')).toBeNull();
    const span = r3.querySelector("span.date-text.computed");
    expect(span).not.toBeNull();
    expect(span!.getAttribute("aria-readonly")).toBe("true");
    expect(within(row(1)).getByRole("button", { name: /^Start:/ })).toBeTruthy();
  });
});

describe("settings", () => {
  const openSettings = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole("button", { name: /Settings/ }));
    return document.querySelector<HTMLDialogElement>("dialog.settings-dialog")!;
  };
  const isOpen = (d: HTMLDialogElement) => d.open || d.hasAttribute("open");

  const linked = () => mkProject([
    mkTask(1, "A", "2026-11-02", "2026-11-03"),
    mkTask(2, "B", "2026-11-04", "2026-11-05"),
    mkTask(3, "C", "2026-11-06", "2026-11-09"),
    mkTask(4, "D", "2026-11-10", "2026-11-12"),
    mkTask(5, "E", "2026-11-13", "2026-11-14", [lk(3), lk(4, "FF", -2)]),
  ]);

  it("closes on Escape and returns focus to the Settings button", async () => {
    const user = userEvent.setup();
    renderApp(four());
    const dlg = await openSettings(user);
    expect(isOpen(dlg)).toBe(true);
    fireEvent.keyDown(dlg, { key: "Escape" });
    expect(isOpen(dlg)).toBe(false);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /Settings/ }));
  });

  it("re-renders predecessor notation when switching language", async () => {
    const user = userEvent.setup();
    renderApp(linked(), { ...DEFAULT_SETTINGS, notation: "de" });
    expect(preds(row(5)).value).toBe("3;4EE-2T");
    await openSettings(user);
    await user.selectOptions(screen.getByLabelText("Link notation"), "en");
    expect(preds(row(5)).value).toBe("3,4FF-2d");
  });

  it("restores defaults with Reset", async () => {
    const user = userEvent.setup();
    renderApp(four(), { ...DEFAULT_SETTINGS, notation: "de" });
    await openSettings(user);
    await user.selectOptions(screen.getByLabelText("Link notation"), "en");
    await user.click(screen.getByLabelText("Duration column"));
    expect(screen.queryByText("Duration", { selector: ".grid-head .head-label" })).toBeNull();
    expect((screen.getByLabelText("Link notation") as HTMLSelectElement).value).toBe("en");

    await user.click(screen.getByRole("button", { name: "Reset to defaults" }));
    expect((screen.getByLabelText("Link notation") as HTMLSelectElement).value).toBe("de");
    expect((screen.getByLabelText("Duration column") as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText("Duration", { selector: ".grid-head .head-label" })).toBeTruthy();
  });

  it("keeps settings out of the share link", async () => {
    const user = userEvent.setup();
    renderApp(four());
    await openSettings(user);
    await user.selectOptions(screen.getByLabelText("Link notation"), "en");
    const d = new URLSearchParams(location.search).get("d")!;
    const json = b64decode(d);
    const obj = JSON.parse(json) as Record<string, unknown>;
    for (const k of ["notation", "dateFormat", "density", "columns"]) {
      expect(Object.keys(obj)).not.toContain(k);
      expect(json).not.toContain(`"${k}"`);
    }
  });
});

describe("New project", () => {
  const newBtn = () => screen.getByRole("button", { name: /^New$/ });
  const confirmDlg = () => document.querySelector<HTMLDialogElement>("dialog.confirm-dialog")!;

  it("asks first, then clears the chart and pushes a history entry", async () => {
    const user = userEvent.setup();
    renderApp(four());
    const before = history.length;
    await user.click(newBtn());
    expect(confirmDlg().open).toBe(true);
    expect(confirmDlg().textContent).toContain("4 tasks");
    await user.click(screen.getByRole("button", { name: "New project" }));
    expect(confirmDlg().open).toBe(false);
    expect(rows()).toHaveLength(0);
    expect(document.querySelector(".grid-empty")).not.toBeNull();
    expect((screen.getByLabelText("Project title") as HTMLInputElement).value).toBe("Untitled Project");
    const p = urlProject();
    expect([p.title, p.tasks.length, p.nextId]).toEqual(["Untitled Project", 0, 1]);
    expect(history.length).toBe(before + 1);
  });

  it("Cancel keeps the project, its URL and the history", async () => {
    const user = userEvent.setup();
    renderApp(four());
    const url = location.href;
    const before = history.length;
    await user.click(newBtn());
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(confirmDlg().open).toBe(false);
    expect(rows()).toHaveLength(4);
    expect(location.href).toBe(url);
    expect(history.length).toBe(before);
    expect(document.activeElement).toBe(newBtn());
  });

  it("resets an empty project without asking", async () => {
    const user = userEvent.setup();
    renderApp({ ...mkProject([]), title: "Scratch" });
    await user.click(newBtn());
    expect(confirmDlg().open).toBe(false);
    expect(urlProject().title).toBe("Untitled Project");
  });

  it("closes open detail strips", async () => {
    const user = userEvent.setup();
    renderApp(four());
    await user.click(toggle(row(1)));
    expect(document.querySelector(".detail")).not.toBeNull();
    await user.click(newBtn());
    await user.click(screen.getByRole("button", { name: "New project" }));
    await user.click(screen.getByRole("button", { name: /Add task/ }));
    expect(document.querySelector(".detail")).toBeNull();
  });

  it("Back restores the previous project with its links", async () => {
    const user = userEvent.setup();
    const p = four();
    p.tasks[1] = mkTask(2, "Beta", "2026-11-05", "2026-11-06", [lk(1, "SS", 1)]);
    renderApp(p);
    await user.click(newBtn());
    await user.click(screen.getByRole("button", { name: "New project" }));
    expect(rows()).toHaveLength(0);
    history.back();
    await waitFor(() => expect(rows()).toHaveLength(4));
    expect(nameOf(row(2))).toBe("Beta");
    expect(urlProject().tasks[1]!.deps).toEqual([lk(1, "SS", 1)]);
    expect((screen.getByLabelText("Project title") as HTMLInputElement).value).toBe("Test project");
  });
});

describe("resizable columns", () => {
  const handle = (label: string) => screen.getByRole("separator", { name: `Resize ${label} column` });
  const paneVar = (k: string) => document.querySelector<HTMLElement>(".grid-pane")!.style.getPropertyValue(k);
  const stored = () => JSON.parse(localStorage.getItem("ganttly.settings.v1") ?? "{}") as { columnWidths?: Record<string, number> };

  it("has a handle on every column except ID and the toggle", () => {
    renderApp(four());
    const names = screen.getAllByRole("separator").map(h => h.getAttribute("aria-label"));
    expect(names).toEqual(["Task Name", "Duration", "Start", "Finish", "% Complete", "Predecessors"].map(l => `Resize ${l} column`));
  });

  it("→ three times widens Finish by 24px and remembers it", async () => {
    const user = userEvent.setup();
    renderApp(four());
    const h = handle("Finish");
    expect(h.getAttribute("aria-valuenow")).toBe("104");
    h.focus();
    await user.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}");
    expect(handle("Finish").getAttribute("aria-valuenow")).toBe("128");
    expect(paneVar("--cols-wide")).toBe("40px 26px 200px 88px 104px 128px 82px 96px");
    expect(stored().columnWidths).toEqual({ finish: 128 });
    expect(document.activeElement).toBe(handle("Finish"));
  });

  it("stops at the column minimum", async () => {
    const user = userEvent.setup();
    renderApp(four());
    handle("Duration").focus();
    for (let i = 0; i < 10; i++) await user.keyboard("{ArrowLeft}");
    expect(handle("Duration").getAttribute("aria-valuenow")).toBe("64");
  });

  it("Home resets a column; Reset to defaults resets all", async () => {
    const user = userEvent.setup();
    renderApp(four());
    handle("Task Name").focus();
    await user.keyboard("{ArrowRight}{ArrowRight}");
    handle("% Complete").focus();
    await user.keyboard("{ArrowRight}");
    handle("Task Name").focus();
    await user.keyboard("{Home}");
    expect(handle("Task Name").getAttribute("aria-valuenow")).toBe("200");
    expect(stored().columnWidths).toEqual({ pct: 90 });
    await user.click(screen.getByRole("button", { name: /Settings/ }));
    await user.click(screen.getByRole("button", { name: "Reset to defaults" }));
    expect(handle("% Complete").getAttribute("aria-valuenow")).toBe("82");
    expect(stored().columnWidths).toEqual({});
  });

  it("keeps column widths out of the share link", async () => {
    const user = userEvent.setup();
    renderApp(four());
    handle("Task Name").focus();
    await user.keyboard("{ArrowRight}");
    expect(b64decode(new URLSearchParams(location.search).get("d")!)).not.toContain("columnWidths");
  });

  it("shows long names and predecessors in full as a tooltip", () => {
    const p = four();
    p.tasks[0] = { ...p.tasks[0]!, n: "A very long task name that will never fit into the default column" };
    p.tasks[1] = mkTask(2, "Beta", "2026-11-05", "2026-11-06", [lk(1)]);
    renderApp(p);
    expect(row(1).querySelector<HTMLInputElement>(".name-input")!.title).toBe(p.tasks[0].n);
    expect(preds(row(2)).title).toBe("1");
  });
});

describe("zoom controls", () => {
  // jsdom has no layout: Fit falls back to 34px/day, so max zoom = 120/34 ≈ 353%.
  const label = () => document.querySelector(".zoom-label")!.textContent;
  const btn = (name: string) => screen.getByRole("button", { name }) as HTMLButtonElement;
  const slider = () => screen.getByRole("slider", { name: "Zoom" }) as HTMLInputElement;

  it("opens at Fit with zoom out disabled", () => {
    renderApp(four());
    expect(label()).toBe("Fit");
    expect(btn("Zoom out").disabled).toBe(true);
    expect(slider().value).toBe("0");
  });

  it("two zoom-ins give about 156%, stored in the link", async () => {
    const user = userEvent.setup();
    renderApp(four());
    await user.click(btn("Zoom in"));
    await user.click(btn("Zoom in"));
    expect(label()).toBe("156%");
    expect(urlProject().zoom).toBeCloseTo(1.5625, 6);
    expect(JSON.parse(b64decode(new URLSearchParams(location.search).get("d")!)).v).toBe(6);
  });

  it("Fit and Ctrl/⌘ 0 return to Fit", async () => {
    const user = userEvent.setup();
    renderApp(four());
    await user.click(btn("Zoom in"));
    await user.click(screen.getByRole("button", { name: /^Fit$/ }));
    expect(label()).toBe("Fit");
    await user.keyboard("{Control>}={/Control}");
    expect(label()).toBe("125%");
    await user.keyboard("{Control>}0{/Control}");
    expect(label()).toBe("Fit");
    expect(urlProject().zoom).toBe(1);
  });

  it("zoom in is disabled at the maximum (one day = 120px)", async () => {
    const user = userEvent.setup();
    renderApp(four());
    for (let i = 0; i < 8 && !btn("Zoom in").disabled; i++) await user.click(btn("Zoom in"));
    expect(btn("Zoom in").disabled).toBe(true);
    expect(label()).toBe(`${Math.round((120 / 34) * 100)}%`);
    expect(slider().value).toBe("1000");
  });

  it("slider to the right end zooms to the maximum and keeps the label in sync", () => {
    renderApp(four());
    fireEvent.change(slider(), { target: { value: "1000" } });
    expect(label()).toBe("353%");
    expect(btn("Zoom in").disabled).toBe(true);
    expect(btn("Zoom out").disabled).toBe(false);
  });

  it("keeps a stored factor above the current maximum (clamped only for display)", () => {
    renderApp({ ...four(), zoom: 9 });
    expect(label()).toBe("353%");
    expect(urlProject().zoom).toBe(9);
  });
});

describe("project calendar", () => {
  const linkedWeek = () => mkProject([
    mkTask(1, "Build", "2026-11-09", "2026-11-13"),
    mkTask(2, "Test", "2026-11-16", "2026-11-18", [lk(1, "FS", 2)]),
  ]);
  const openSettings = async (user: ReturnType<typeof userEvent.setup>) =>
    user.click(screen.getByRole("button", { name: /Settings/ }));
  const unit = (r: HTMLElement) => r.querySelector(".c-dur .unit")!.textContent;

  it("switching to working days relabels durations and reschedules links", async () => {
    const user = userEvent.setup();
    renderApp(linkedWeek());
    expect(unit(row(2))).toBe("days");
    await openSettings(user);
    expect(document.querySelector("dialog.settings-dialog header")!.textContent).toBe("Settings");
    await user.click(screen.getByRole("radio", { name: "Working days (Mon–Fri)" }));
    expect(unit(row(2))).toBe("wdays");
    expect(within(row(2)).getByLabelText("Duration in working days (Mon–Fri)")).toBeTruthy();
    const t = urlProject().tasks[1]!;
    expect([t.s, t.e]).toEqual(["2026-11-18", "2026-11-20"]);
    expect(urlProject().calendar).toBe("workdays");
    const json = JSON.parse(b64decode(new URLSearchParams(location.search).get("d")!)) as Record<string, unknown>;
    expect(json.cal).toBe(1);
    const stored = JSON.parse(localStorage.getItem("ganttly.settings.v1") ?? "{}") as Record<string, unknown>;
    expect(Object.keys(stored)).not.toContain("calendar");
    expect(JSON.stringify(stored)).not.toContain("workdays");
  });

  it("Reset to defaults keeps the project's calendar", async () => {
    const user = userEvent.setup();
    renderApp({ ...linkedWeek(), calendar: "workdays" });
    await openSettings(user);
    await user.selectOptions(screen.getByLabelText("Link notation"), "en");
    await user.click(screen.getByRole("button", { name: "Reset to defaults" }));
    expect((screen.getByLabelText("Link notation") as HTMLSelectElement).value).toBe("de");
    expect((screen.getByRole("radio", { name: "Working days (Mon–Fri)" }) as HTMLInputElement).checked).toBe(true);
    expect(urlProject().calendar).toBe("workdays");
  });

  it("another project's link opens in its own calendar", async () => {
    const user = userEvent.setup();
    const first = renderApp(linkedWeek());
    await openSettings(user);
    await user.click(screen.getByRole("radio", { name: "Working days (Mon–Fri)" }));
    first.unmount();
    renderApp(linkedWeek());
    expect(urlProject().calendar).toBe("days");
    expect(unit(row(1))).toBe("days");
  });

  it("predecessor weeks are 5 days in a working-day project", async () => {
    const user = userEvent.setup();
    renderApp({ ...linkedWeek(), calendar: "workdays" });
    const input = preds(row(2));
    await user.clear(input);
    await user.type(input, "1+1W{Enter}");
    expect(urlProject().tasks[1]!.deps).toEqual([lk(1, "FS", 5)]);
    expect(urlProject().tasks[1]!.s).toBe("2026-11-23");
  });
});

describe("move tasks up and down", () => {
  const names = () => rows().map(nameOf);
  it("Alt+↓ in row 2's name moves it to row 3 and keeps focus", async () => {
    const user = userEvent.setup();
    renderApp(four());
    const input = row(2).querySelector<HTMLInputElement>(".name-input")!;
    input.focus();
    await user.keyboard("{Alt>}{ArrowDown}{/Alt}");
    expect(names()).toEqual(["Alpha", "Gamma", "Beta", "Delta"]);
    expect(rows().map(r => r.querySelector(".cell-id")!.textContent)).toEqual(["1", "2", "3", "4"]);
    expect(document.activeElement).toBe(row(3).querySelector(".name-input"));
    await user.keyboard("{Alt>}{ArrowUp}{/Alt}{Alt>}{ArrowUp}{/Alt}");
    expect(names()).toEqual(["Beta", "Alpha", "Gamma", "Delta"]);
    expect(document.activeElement).toBe(row(1).querySelector(".name-input"));
    expect(urlProject().tasks.map(t => t.n)).toEqual(["Beta", "Alpha", "Gamma", "Delta"]);
  });

  it("buttons are disabled at the edges; the detail strip stays with its task", async () => {
    const user = userEvent.setup();
    renderApp(four());
    await user.click(toggle(row(1)));
    const up = () => screen.getByRole("button", { name: "Move task up" }) as HTMLButtonElement;
    const down = () => screen.getByRole("button", { name: "Move task down" }) as HTMLButtonElement;
    expect(up().disabled).toBe(true);
    expect(down().disabled).toBe(false);
    await user.click(down());
    await user.click(down());
    await user.click(down());
    expect(names()).toEqual(["Beta", "Gamma", "Delta", "Alpha"]);
    expect(down().disabled).toBe(true);
    const detail = document.querySelector<HTMLElement>(".detail")!;
    expect(detail.dataset.taskId).toBe("1");
    expect(detail.previousElementSibling).toBe(row(4));
    expect(document.activeElement).toBe(up());
  });

  it("links follow the task, dates unchanged", async () => {
    const user = userEvent.setup();
    const p = four();
    p.tasks[3] = mkTask(4, "Delta", "2026-11-16", "2026-11-18", [lk(2)]);
    renderApp(p);
    const before = urlProject().tasks.map(t => [t.id, t.s, t.e]).sort();
    row(2).querySelector<HTMLInputElement>(".name-input")!.focus();
    await user.keyboard("{Alt>}{ArrowDown}{/Alt}");
    expect(preds(row(4)).value).toBe("3");
    expect(urlProject().tasks.map(t => [t.id, t.s, t.e]).sort()).toEqual(before);
  });
});

describe("groups: header rows", () => {
  // U | Acme: A (2026-11-02..06, 50%), B (2026-11-10..12, 100%) | Globex: G1
  const grouped = (): Project => ({
    ...mkProject([]),
    nextId: 30,
    groups: [{ id: 10, n: "Acme", collapsed: false }, { id: 20, n: "Globex", collapsed: false }],
    tasks: [
      mkTask(1, "U", "2026-11-02", "2026-11-03"),
      { ...mkTask(2, "A", "2026-11-02", "2026-11-06"), p: 50, g: 10 },
      { ...mkTask(3, "B", "2026-11-10", "2026-11-12"), p: 100, g: 10 },
      { ...mkTask(4, "G1", "2026-11-13", "2026-11-16", [lk(3)]), g: 20 },
    ],
  });
  const header = (n: string) => {
    const h = [...document.querySelectorAll<HTMLElement>(".group-row")].find(r => r.querySelector<HTMLInputElement>(".group-name-input")!.value === n);
    if (!h) throw new Error(`no header ${n}`);
    return h;
  };
  const gridOrder = () => [...document.querySelectorAll<HTMLElement>(".grid-body > .row")].map(r =>
    r.classList.contains("group-row") ? `[${r.querySelector<HTMLInputElement>(".group-name-input")!.value}]` : `${r.querySelector(".cell-id")!.textContent}:${nameOf(r)}`);

  it("shows headers in order; numbers skip headers", () => {
    renderApp(grouped());
    expect(gridOrder()).toEqual(["1:U", "[Acme]", "2:A", "3:B", "[Globex]", "4:G1"]);
    expect(header("Acme").querySelector(".cell-id")!.textContent).toBe("");
  });

  it("roll-ups show the spec example", () => {
    renderApp(grouped(), { ...DEFAULT_SETTINGS, dateFormat: "iso" });
    const h = header("Acme");
    expect([".c-start", ".c-fin", ".c-dur", ".c-pct"].map(c => h.querySelector(c)!.textContent)).toEqual(["2026-11-02", "2026-11-12", "11 days", "69%"]);
  });

  it("Add group appends 'New group' and focuses its name with the text selected", async () => {
    const user = userEvent.setup();
    renderApp(grouped());
    await user.click(screen.getByRole("button", { name: /Add group/ }));
    const input = header("New group").querySelector<HTMLInputElement>(".group-name-input")!;
    expect(document.activeElement).toBe(input);
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, "New group".length]);
    expect(gridOrder().at(-1)).toBe("[New group]");
    await user.keyboard("Initech");
    expect(urlProject().groups.at(-1)!.n).toBe("Initech");
  });

  it("renaming a group updates the link", async () => {
    const user = userEvent.setup();
    renderApp(grouped());
    const input = header("Acme").querySelector<HTMLInputElement>(".group-name-input")!;
    await user.clear(input);
    await user.type(input, "Acme Corp");
    expect(urlProject().groups[0]!.n).toBe("Acme Corp");
  });

  it("collapsing hides the group's tasks and is stored in the link", async () => {
    const user = userEvent.setup();
    renderApp(grouped());
    await user.click(within(header("Acme")).getByRole("button", { name: "Collapse group Acme" }));
    expect(gridOrder()).toEqual(["1:U", "[Acme]", "[Globex]", "4:G1"]);
    expect(document.querySelectorAll(".tl-body .lane").length).toBe(4);
    expect(urlProject().groups[0]!.collapsed).toBe(true);
    expect(JSON.parse(b64decode(new URLSearchParams(location.search).get("d")!)).groups[0]).toEqual({ i: 10, n: "Acme", x: 1 });
    await user.click(within(header("Acme")).getByRole("button", { name: "Expand group Acme" }));
    expect(gridOrder()).toEqual(["1:U", "[Acme]", "2:A", "3:B", "[Globex]", "4:G1"]);
  });

  it("header '+' adds a task as the group's last row and focuses it; ribbon Add task uses the last group", async () => {
    const user = userEvent.setup();
    renderApp(grouped());
    await user.click(within(header("Acme")).getByRole("button", { name: "Add task to Acme" }));
    expect(gridOrder()).toEqual(["1:U", "[Acme]", "2:A", "3:B", "4:New task", "[Globex]", "5:G1"]);
    expect(document.activeElement).toBe(row(4).querySelector(".name-input"));
    await user.click(screen.getByRole("button", { name: "Add task" }));
    expect(gridOrder().at(-1)).toBe("6:New task");
    expect(urlProject().tasks.at(-1)!.g).toBe(20);
  });

  it("header actions are still there with the Predecessors column hidden", async () => {
    const user = userEvent.setup();
    renderApp(grouped(), { ...DEFAULT_SETTINGS, columns: { ...DEFAULT_SETTINGS.columns, preds: false } });
    const h = header("Globex");
    expect(within(h).getByRole("button", { name: "Add task to Globex" })).toBeTruthy();
    await user.click(within(h).getByRole("button", { name: "Group actions for Globex" }));
    await user.click(screen.getByRole("menuitem", { name: "Move group up" }));
    expect(gridOrder()).toEqual(["1:U", "[Globex]", "2:G1", "[Acme]", "3:A", "4:B"]);
    expect(urlProject().tasks.find(t => t.id === 4)!.deps).toEqual([lk(3)]); // G1 still depends on B
  });
});

describe("groups: moving tasks and deleting groups", () => {
  // U | Acme: A1, A2 | Globex: G1 (G1 depends on A2)
  const grouped = (): Project => ({
    ...mkProject([]),
    nextId: 30,
    groups: [{ id: 10, n: "Acme", collapsed: false }, { id: 20, n: "Globex", collapsed: false }],
    tasks: [
      mkTask(1, "U", "2026-11-02", "2026-11-03"),
      { ...mkTask(2, "A1", "2026-11-04", "2026-11-05"), g: 10 },
      { ...mkTask(3, "A2", "2026-11-06", "2026-11-09"), g: 10 },
      { ...mkTask(4, "G1", "2026-11-10", "2026-11-12", [lk(3)]), g: 20 },
    ],
  });
  const gridOrder = () => [...document.querySelectorAll<HTMLElement>(".grid-body > .row")].map(r =>
    r.classList.contains("group-row") ? `[${r.querySelector<HTMLInputElement>(".group-name-input")!.value}]` : `${r.querySelector(".cell-id")!.textContent}:${nameOf(r)}`);
  const headerOf = (n: string) => [...document.querySelectorAll<HTMLElement>(".group-row")].find(r => r.querySelector<HTMLInputElement>(".group-name-input")!.value === n)!;
  const deleteDlg = () => [...document.querySelectorAll<HTMLDialogElement>("dialog.confirm-dialog")].find(d => d.textContent!.includes("Delete group?"))!;
  const deleteGroupVia = async (user: ReturnType<typeof userEvent.setup>, n: string) => {
    await user.click(within(headerOf(n)).getByRole("button", { name: `Group actions for ${n}` }));
    await user.click(screen.getByRole("menuitem", { name: "Delete group…" }));
  };

  it("Group selector moves a task to the end of the chosen group", async () => {
    const user = userEvent.setup();
    renderApp(grouped());
    await user.click(toggle(row(1)));
    await user.selectOptions(screen.getByRole("combobox", { name: "Group" }), "Globex");
    expect(gridOrder()).toEqual(["[Acme]", "1:A1", "2:A2", "[Globex]", "3:G1", "4:U"]);
    expect(urlProject().tasks.at(-1)!.g).toBe(20);
    expect(preds(row(3)).value).toBe("2"); // G1 → A2, renumbered
  });

  it("Alt+↑ on the first task of a group makes it the last ungrouped task, focus kept", async () => {
    const user = userEvent.setup();
    renderApp(grouped());
    row(2).querySelector<HTMLInputElement>(".name-input")!.focus();
    await user.keyboard("{Alt>}{ArrowUp}{/Alt}");
    expect(gridOrder()).toEqual(["1:U", "2:A1", "[Acme]", "3:A2", "[Globex]", "4:G1"]);
    expect(document.activeElement).toBe(row(2).querySelector(".name-input"));
    await user.keyboard("{Alt>}{ArrowDown}{/Alt}");
    expect(gridOrder()).toEqual(["1:U", "[Acme]", "2:A1", "3:A2", "[Globex]", "4:G1"]);
  });

  it("Move up is disabled only for the very first task", async () => {
    const user = userEvent.setup();
    renderApp(grouped());
    await user.click(toggle(row(2)));
    expect((screen.getByRole("button", { name: "Move task up" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("deleting a group and keeping its tasks ungroups them at the end of the ungrouped section", async () => {
    const user = userEvent.setup();
    renderApp(grouped());
    await deleteGroupVia(user, "Acme");
    const dlg = deleteDlg();
    expect(dlg.open).toBe(true);
    expect(dlg.textContent).toContain("2 tasks");
    await user.click(screen.getByRole("button", { name: "Keep tasks (ungroup)" }));
    expect(gridOrder()).toEqual(["1:U", "2:A1", "3:A2", "[Globex]", "4:G1"]);
    expect(urlProject().tasks.find(t => t.id === 4)!.deps).toEqual([lk(3)]);
  });

  it("deleting a group with its tasks removes them and their links; successors keep their dates", async () => {
    const user = userEvent.setup();
    renderApp(grouped());
    await deleteGroupVia(user, "Acme");
    await user.click(screen.getByRole("button", { name: "Delete group and 2 tasks" }));
    expect(gridOrder()).toEqual(["1:U", "[Globex]", "2:G1"]);
    const g1 = urlProject().tasks.find(t => t.id === 4)!;
    expect([g1.deps, g1.s, g1.e]).toEqual([[], "2026-11-10", "2026-11-12"]);
  });

  it("an empty group is deleted without asking", async () => {
    const user = userEvent.setup();
    renderApp({ ...grouped(), groups: [...grouped().groups, { id: 25, n: "Empty", collapsed: false }] });
    await deleteGroupVia(user, "Empty");
    expect(deleteDlg().open).toBe(false);
    expect(urlProject().groups.map(g => g.n)).toEqual(["Acme", "Globex"]);
  });
});
