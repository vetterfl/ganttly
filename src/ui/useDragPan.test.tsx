import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../settings/settings";
import { lk, mkProject, mkTask, renderApp } from "./testutil";
import { panStartAllowed } from "./useDragPan";

const setup = () => {
  renderApp(mkProject([
    mkTask(1, "Alpha", "2026-11-02", "2026-11-04"),
    mkTask(2, "Beta", "2026-11-05", "2026-11-06", [lk(1)]),
  ]), DEFAULT_SETTINGS);
  const q = <T extends Element = HTMLElement>(sel: string) => {
    const el = document.querySelector<T>(sel);
    if (!el) throw new Error(`missing ${sel}`);
    return el;
  };
  return q;
};

describe("panStartAllowed", () => {
  it("left button pans from timeline lanes, bars and the timescale", () => {
    const q = setup();
    expect(panStartAllowed(q(".tl-body .lane"), 0, "mouse")).toBe(true);
    expect(panStartAllowed(q(".bar"), 0, "mouse")).toBe(true);
    expect(panStartAllowed(q(".bar-label"), 0, "pen")).toBe(true);
    expect(panStartAllowed(q(".timescale .ts-cell"), 0, "mouse")).toBe(true);
  });

  it("left button never pans from the grid or interactive elements", () => {
    const q = setup();
    expect(panStartAllowed(q(".row .name-input"), 0, "mouse")).toBe(false);
    expect(panStartAllowed(q(".row .cell-id"), 0, "mouse")).toBe(false);
    expect(panStartAllowed(q(".col-resizer"), 0, "mouse")).toBe(false);
    expect(panStartAllowed(q(".ribbon button"), 0, "mouse")).toBe(false);
  });

  it("middle button pans anywhere, touch never, other buttons never", () => {
    const q = setup();
    expect(panStartAllowed(q(".row .name-input"), 1, "mouse")).toBe(true);
    expect(panStartAllowed(q(".grid-head"), 1, "mouse")).toBe(true);
    expect(panStartAllowed(q(".tl-body .lane"), 0, "touch")).toBe(false);
    expect(panStartAllowed(q(".tl-body .lane"), 2, "mouse")).toBe(false);
    expect(panStartAllowed(null, 0, "mouse")).toBe(false);
  });
});
