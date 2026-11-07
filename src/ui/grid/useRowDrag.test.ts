import { describe, expect, it } from "vitest";
import type { Task } from "../../core/model";
import { laneTops } from "../timeline/geometry";
import { dropIndex, slotAt, slotY } from "./useRowDrag";

const t = (id: number): Task => ({ id, n: `T${id}`, s: "2026-11-02", e: "2026-11-03", c: 0, p: 0, deps: [] });
const tasks = [1, 2, 3, 4].map(t);
const ROW = 32, DETAIL = 44;

describe("slotAt (midpoint rule)", () => {
  const tops = laneTops(tasks, new Set(), ROW, DETAIL); // 0, 32, 64, 96
  it("first and last slot", () => {
    expect(slotAt(-50, tops, ROW)).toBe(0);
    expect(slotAt(0, tops, ROW)).toBe(0);
    expect(slotAt(15.9, tops, ROW)).toBe(0);
    expect(slotAt(500, tops, ROW)).toBe(4);
  });
  it("switches at each row's midpoint", () => {
    expect(slotAt(16, tops, ROW)).toBe(1);
    expect(slotAt(47.9, tops, ROW)).toBe(1);
    expect(slotAt(48, tops, ROW)).toBe(2);
    expect(slotAt(112, tops, ROW)).toBe(4);
  });
  it("an open detail strip belongs to the row above it", () => {
    const t2 = laneTops(tasks, new Set([2]), ROW, DETAIL); // 0, 32, 108, 140
    expect(t2).toEqual([0, 32, 108, 140]);
    expect(slotAt(70, t2, ROW)).toBe(2);   // inside row 2's detail strip
    expect(slotAt(123, t2, ROW)).toBe(2);  // upper half of row 3
    expect(slotAt(124, t2, ROW)).toBe(3);
  });
});

describe("dropIndex / slotY", () => {
  it("maps slots to moveTask indexes", () => {
    expect(dropIndex(5, 1)).toBe(1);  // row 6 between rows 1 and 2 → index 1 (row 2)
    expect(dropIndex(1, 4)).toBe(3);
    expect(dropIndex(2, 2)).toBe(2);  // above itself: no move
    expect(dropIndex(2, 3)).toBe(2);  // below itself: no move
  });
  it("draws the line at the slot's row top, or at the end", () => {
    const tops = [0, 32, 108, 140];
    expect(slotY(0, tops, 172)).toBe(0);
    expect(slotY(2, tops, 172)).toBe(108);
    expect(slotY(4, tops, 172)).toBe(172);
  });
});
