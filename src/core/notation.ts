import type { Link, LinkType, Task } from "./model";
import { wouldCreateCycle } from "./schedule";
import type { Calendar } from "./calendar";

export type Lang = "de" | "en";
export type ParseErrorKind = "syntax" | "unknown" | "self" | "cycle";
export interface ParseError {
  kind: ParseErrorKind;
  entry: string;
  message: string;
}
export type ParseResult = { ok: true; links: Link[] } | { ok: false; error: ParseError };

const TYPE_MAP: Record<string, LinkType> = {
  ea: "FS", aa: "SS", ee: "FF", ae: "SF", fs: "FS", ss: "SS", ff: "FF", sf: "SF",
};
const DAY_UNITS = new Set(["", "d", "day", "days", "t", "tag", "tage"]);
const WEEK_UNITS = new Set(["w", "wk", "wks", "week", "weeks", "wo", "woche", "wochen"]);
const ENTRY_RE = /^(\d+)\s*(ea|aa|ee|ae|fs|ss|ff|sf)?\s*(?:([+\-−])\s*(\d+)\s*([a-z]*))?$/i;

/** Days in a week of the project calendar: 7 calendar days or 5 working days. */
export const weekDays = (cal: Calendar): number => (cal === "workdays" ? 5 : 7);

/** Lags are in project days (calendar or working days); a week is `weekDays(cal)`. */
export function parsePredecessors(text: string, tasks: Task[], taskId: number, cal: Calendar = "days"): ParseResult {
  const fail = (kind: ParseErrorKind, entry: string, message: string): ParseResult => ({
    ok: false,
    error: { kind, entry, message },
  });
  const byPred = new Map<number, Link>();
  const entries = text.split(/[;,]/).map((s) => s.trim()).filter((s) => s !== "");
  for (const entry of entries) {
    const m = ENTRY_RE.exec(entry);
    const unit = m ? (m[5] ?? "").toLowerCase() : "";
    if (!m || !(DAY_UNITS.has(unit) || WEEK_UNITS.has(unit)) || (m[3] === undefined && m[5] !== undefined)) {
      return fail("syntax", entry, `Invalid entry "${entry}"`);
    }
    const row = Number(m[1]);
    const target = tasks[row - 1];
    if (!target) return fail("unknown", entry, `Task ${m[1]} does not exist`);
    if (target.id === taskId) return fail("self", entry, "A task cannot depend on itself");
    const type = m[2] ? (TYPE_MAP[m[2].toLowerCase()] as LinkType) : "FS";
    let lag = 0;
    if (m[3] !== undefined) {
      lag = Number(m[4]) * (WEEK_UNITS.has(unit) ? weekDays(cal) : 1);
      if (m[3] !== "+") lag = -lag;
    }
    byPred.delete(target.id); // last one wins, keep order of last occurrence
    byPred.set(target.id, { pred: target.id, type, lag: lag === 0 ? 0 : lag });
  }
  const links = [...byPred.values()];
  if (wouldCreateCycle(tasks, taskId, links)) {
    const me = tasks.findIndex((t) => t.id === taskId) + 1;
    const rows = links
      .filter((l) => wouldCreateCycle(tasks, taskId, [l]))
      .map((l) => tasks.findIndex((t) => t.id === l.pred) + 1);
    return fail(
      "cycle",
      rows.join(", "),
      `Circular dependency: task ${rows.join(", ")} already depends on task ${me}`,
    );
  }
  return { ok: true, links };
}

const DE_CODE: Record<LinkType, string> = { FS: "EA", SS: "AA", FF: "EE", SF: "AE" };

export function formatPredecessors(links: Link[], tasks: Task[], lang: Lang): string {
  const parts: string[] = [];
  for (const l of links) {
    const idx = tasks.findIndex((t) => t.id === l.pred);
    if (idx < 0) continue;
    let s = String(idx + 1);
    if (l.type !== "FS") s += lang === "de" ? DE_CODE[l.type] : l.type;
    if (l.lag !== 0) s += (l.lag > 0 ? "+" : "-") + Math.abs(l.lag) + (lang === "de" ? "T" : "d");
    parts.push(s);
  }
  return parts.join(lang === "de" ? ";" : ",");
}
