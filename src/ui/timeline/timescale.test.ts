import { describe, expect, it } from "vitest";
import { avoidSpan, buildTimescale, isoWeek, weekendRects, type Cell } from "./timescale";

const D = (y: number, m: number, d: number) => new Date(y, m - 1, d);
const lw = (s: string) => s.length * 7;
const WEEK = { de: (n: number) => [`KW ${n}`, `${n}`], en: (n: number) => [`W${n}`, `${n}`] };
const build = (min: Date, days: number, w: number, lang: "de" | "en" = "de", today?: Date) =>
  buildTimescale(min, days, w, { labelWidth: lw, locale: "en-US", today, weekLabel: WEEK[lang] });
const labels = (cells: Cell[]) => cells.map(c => c.label).filter(Boolean);

/** Cells tile the range exactly, and every label fits inside its own cell. */
function wellFormed(cells: Cell[], totalPx: number) {
  let x = 0;
  for (const c of cells) {
    expect(c.x).toBeCloseTo(x, 6);
    expect(c.width).toBeGreaterThan(0);
    if (c.label) expect(c.key.startsWith("d") ? c.label.length * 6 : lw(c.label) + 6).toBeLessThanOrEqual(c.width + 1e-9);
    x += c.width;
  }
  expect(x).toBeCloseTo(totalPx, 6);
}

describe("isoWeek", () => {
  it.each([
    [D(2026, 12, 31), 53], [D(2027, 1, 3), 53], [D(2027, 1, 4), 1], [D(2026, 11, 2), 45],
    [D(2026, 1, 1), 1], [D(2024, 12, 30), 1], [D(2021, 1, 3), 53],
  ])("%s → %i", (d, n) => expect(isoWeek(d)).toBe(n));
});

describe("buildTimescale bands", () => {
  const min = D(2026, 10, 31);

  it("w ≥ 20: months over every day", () => {
    const ts = build(min, 30, 24, "de", D(2026, 11, 7));
    expect(ts.top.map(c => c.label)).toEqual(["", "November 2026"]); // 2 October days: too narrow for "Oct"
    expect(ts.bottom).toHaveLength(30);
    expect(ts.bottom.slice(0, 3).map(c => c.label)).toEqual(["31", "1", "2"]);
    expect(ts.bottom.filter(c => c.today).map(c => c.label)).toEqual(["7"]);
    expect([ts.weekends, ts.dayNumbers, ts.lines.length]).toEqual([true, true, 30]);
    wellFormed(ts.top, 30 * 24);
    wellFormed(ts.bottom, 30 * 24);
  });

  it("12–20: only Mondays and the 1st are numbered", () => {
    const ts = build(min, 40, 16);
    // 2026-11-01 is a Sunday; Mondays: 2, 9, 16, 23, 30; 1st of Dec
    expect(labels(ts.bottom)).toEqual(["1", "2", "9", "16", "23", "30", "1", "7"]);
    expect(ts.dayNumbers).toBe(true);
    wellFormed(ts.bottom, 40 * 16);
  });

  it("3.5–12: calendar weeks, KW in German and W in English", () => {
    const de = build(D(2026, 11, 2), 28, 6, "de");
    expect(labels(de.bottom)).toEqual(["KW 45", "KW 46", "KW 47", "KW 48"]);
    expect(build(D(2026, 11, 2), 28, 6, "en").bottom.map(c => c.label)).toEqual(["W45", "W46", "W47", "W48"]);
    expect(de.lines).toEqual([0, 42, 84, 126]);
    expect([de.weekends, de.dayNumbers]).toEqual([true, false]);
    wellFormed(de.bottom, 28 * 6);
  });

  it("0.8–3.5: years over months, no weekends, lines at the 1st", () => {
    const ts = build(D(2026, 1, 1), 365 * 2, 2);
    expect(labels(ts.top)).toEqual(["2026", "2027"]);
    expect(ts.bottom).toHaveLength(24);
    expect(ts.bottom[0]!.label).toBe("Jan"); // 62px wide
    expect(ts.weekends).toBe(false);
    expect(ts.lines[1]).toBe(31 * 2);
    wellFormed(ts.bottom, 730 * 2);
  });

  it("< 0.8: years over quarters", () => {
    const ts = build(D(2026, 1, 1), 1096, 0.5);
    expect(labels(ts.top)).toEqual(["2026", "2027", "2028"]);
    expect(labels(ts.bottom).slice(0, 4)).toEqual(["Q1", "Q2", "Q3", "Q4"]);
    expect(ts.bottom).toHaveLength(12);
    wellFormed(ts.bottom, 1096 * 0.5);
  });

  /** Which band a timescale is in, read from its lower tier. */
  const bandOf = (w: number) => {
    const ts = build(D(2026, 1, 5), 800, w); // 2026-01-06 is a Tuesday
    const k = ts.bottom[0]!.key.charAt(0);
    if (k === "d") return ts.bottom[1]!.label ? "days" : "mondays";
    return ({ w: "weeks", m: "months", q: "quarters" } as Record<string, string>)[k];
  };
  it.each([
    [20, "days"], [19.99, "mondays"], [12, "mondays"], [11.99, "weeks"], [3.5, "weeks"], [3.49, "months"], [0.8, "months"], [0.79, "quarters"],
  ])("threshold w=%f → %s", (w, band) => expect(bandOf(w)).toBe(band));

  it("narrow cells drop or shorten labels instead of overlapping", () => {
    for (const w of [0.3, 0.9, 1.4, 3.6, 5, 12.5, 20]) {
      const ts = build(D(2025, 12, 30), 1100, w);
      wellFormed(ts.top, 1100 * w);
      wellFormed(ts.bottom, 1100 * w);
    }
  });
});

describe("weekendRects", () => {
  it("one rect per Saturday–Sunday, clipped at both ends", () => {
    // 2026-11-01 is Sunday: a lone clipped Sunday first; range ends on Saturday 14th
    expect(weekendRects(D(2026, 11, 1), 14, 10)).toEqual([
      { x: 0, width: 10 }, { x: 60, width: 20 }, { x: 130, width: 10 },
    ]);
  });
});

describe("avoidSpan (Today flag)", () => {
  const cells: Cell[] = [
    { key: "a", x: 0, width: 300, label: "November 2026" },  // label 4..95
    { key: "b", x: 300, width: 60, label: "Dec" },          // label 304..325
  ];
  it("leaves labels clear of the span alone", () => {
    expect(avoidSpan(cells, 150, 190, lw)).toEqual(cells);
  });
  it("moves a colliding label past the span when it still fits", () => {
    expect(avoidSpan(cells, 40, 80, lw)[0]).toEqual({ ...cells[0], indent: 80 }); // starts at 84
  });
  it("drops a colliding label that would no longer fit", () => {
    expect(avoidSpan(cells, 300, 340, lw)[1]!.label).toBe("");
  });
});
