import { anchorsFor, routeArrow, STUB } from "./arrows";

// Parse "M x,y H x V y ..." into the list of visited points.
function points(d: string): [number, number][] {
  const pts: [number, number][] = [];
  let x = 0, y = 0;
  for (const [, cmd, a, b] of d.matchAll(/([MHV])\s*(-?[\d.]+)(?:,(-?[\d.]+))?/g)) {
    if (cmd === "M") { x = +a!; y = +b!; }
    else if (cmd === "H") x = +a!;
    else y = +a!;
    pts.push([x, y]);
  }
  return pts;
}

describe("anchorsFor", () => {
  it.each([
    ["FS", "end", "start"], ["SS", "start", "start"], ["FF", "end", "end"], ["SF", "start", "end"],
  ] as const)("%s leaves %s and enters %s", (t, from, to) => {
    expect(anchorsFor(t)).toEqual({ from, to });
  });
});

describe("routeArrow", () => {
  it("FS forward: exit right, one vertical run, enter target start from the left", () => {
    const p = points(routeArrow("FS", { x: 100, y: 16 }, { x: 200, y: 48 }, 32));
    expect(p).toEqual([[100, 16], [100 + STUB, 16], [100 + STUB, 48], [200, 48]]);
  });

  it("FS backward (target starts before source ends): routes through the lane gap", () => {
    const p = points(routeArrow("FS", { x: 200, y: 16 }, { x: 120, y: 80 }, 32));
    expect(p).toEqual([[200, 16], [200 + STUB, 16], [200 + STUB, 32], [120 - STUB, 32], [120 - STUB, 80], [120, 80]]);
    // last segment travels rightwards into the bar start
    expect(p.at(-1)![0]).toBeGreaterThan(p.at(-2)![0]);
  });

  it("FF: exits right and enters the successor's end from the right", () => {
    const p = points(routeArrow("FF", { x: 300, y: 16 }, { x: 250, y: 48 }, 32));
    expect(p).toEqual([[300, 16], [300 + STUB, 16], [300 + STUB, 48], [250, 48]]);
    expect(p.at(-1)![0]).toBeLessThan(p.at(-2)![0]);
  });

  it("FF where the successor ends later: vertical run is right of both ends", () => {
    const p = points(routeArrow("FF", { x: 300, y: 16 }, { x: 400, y: 48 }, 32));
    expect(p).toEqual([[300, 16], [400 + STUB, 16], [400 + STUB, 48], [400, 48]]);
  });

  it("SS with negative lag (successor starts left of predecessor): drops into the gap, runs left, enters from the left", () => {
    const p = points(routeArrow("SS", { x: 200, y: 16 }, { x: 150, y: 48 }, 32));
    expect(p).toEqual([[200, 16], [200 - STUB, 16], [200 - STUB, 32], [150 - STUB, 32], [150 - STUB, 48], [150, 48]]);
    expect(p.at(-1)![0]).toBeGreaterThan(p.at(-2)![0]); // arrowhead points right, visible
  });

  it("SS forward: single vertical left of the predecessor start", () => {
    const p = points(routeArrow("SS", { x: 200, y: 16 }, { x: 260, y: 48 }, 32));
    expect(p).toEqual([[200, 16], [200 - STUB, 16], [200 - STUB, 48], [260, 48]]);
  });

  it("SF: leaves the predecessor start, enters the successor end from the right", () => {
    const p = points(routeArrow("SF", { x: 200, y: 16 }, { x: 150, y: 48 }, 32));
    expect(p).toEqual([[200, 16], [200 - STUB, 16], [200 - STUB, 48], [150, 48]]);
  });

  it("works upwards (successor above predecessor)", () => {
    const p = points(routeArrow("FS", { x: 200, y: 80 }, { x: 120, y: 16 }, 64));
    expect(p[2]).toEqual([200 + STUB, 64]);
    expect(p.at(-1)).toEqual([120, 16]);
  });
});
