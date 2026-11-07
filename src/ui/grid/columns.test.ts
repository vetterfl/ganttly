import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../../settings/settings";
import { gridColumnVars, screenWidth, visibleColumns } from "./columns";

const all = DEFAULT_SETTINGS.columns;

describe("gridColumnVars", () => {
  it("uses the default widths without overrides", () => {
    const v = gridColumnVars(all);
    expect(v["--cols-wide"]).toBe("40px 26px 200px 88px 104px 104px 82px 96px");
    expect(v["--grid-w-wide"]).toBe(`${40 + 26 + 200 + 88 + 104 + 104 + 82 + 96 + 2}px`);
  });

  it("applies overrides to screen widths and the pane width", () => {
    const v = gridColumnVars(all, { name: 280, finish: 128 });
    expect(v["--cols-wide"]).toBe("40px 26px 280px 88px 104px 128px 82px 96px");
    expect(v["--grid-w-wide"]).toBe(`${40 + 26 + 280 + 88 + 104 + 128 + 82 + 96 + 2}px`);
  });

  it("keeps print widths fixed regardless of overrides", () => {
    expect(gridColumnVars(all, { name: 400, pct: 200 })["--cols-print"]).toBe(gridColumnVars(all)["--cols-print"]);
  });

  it("skips hidden columns, including their overrides", () => {
    const cols = { ...all, start: false, preds: false };
    const v = gridColumnVars(cols, { start: 300, name: 150 });
    expect(v["--cols-wide"]).toBe("40px 26px 150px 88px 104px 82px");
    expect(v["--grid-w-wide"]).toBe(`${40 + 26 + 150 + 88 + 104 + 82 + 2}px`);
    expect(visibleColumns(cols)).toEqual(["id", "toggle", "name", "duration", "finish", "pct"]);
  });

  it("screenWidth ignores overrides for the fixed columns", () => {
    expect(screenWidth("name", { name: 300 })).toBe(300);
    expect(screenWidth("id")).toBe(40);
  });
});
