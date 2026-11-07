import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { b64decode } from "../core/urlCodec";
import { DEFAULT_SETTINGS } from "../settings/settings";
import { lk, mkProject, mkTask, renderApp, urlProject } from "./testutil";

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
    expect(JSON.parse(b64decode(new URLSearchParams(location.search).get("d")!)).v).toBe(4);
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
