import { fireEvent, screen, within } from "@testing-library/react";
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
    expect(screen.queryByText("Duration", { selector: ".grid-head div" })).toBeNull();
    expect((screen.getByLabelText("Link notation") as HTMLSelectElement).value).toBe("en");

    await user.click(screen.getByRole("button", { name: "Reset to defaults" }));
    expect((screen.getByLabelText("Link notation") as HTMLSelectElement).value).toBe("de");
    expect((screen.getByLabelText("Duration column") as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText("Duration", { selector: ".grid-head div" })).toBeTruthy();
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
