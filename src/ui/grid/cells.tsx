import { useState, type Dispatch } from "react";
import { durationOf, ISO_RE } from "../../core/dates";
import { MAX_DURATION, type Action, type Task } from "../../core/model";
import type { DateFormat } from "../../settings/settings";
import { formatDate } from "../format";
import { LinkedIcon } from "../icons";

/**
 * A date shown as formatted text (honours the date-format setting); click or
 * Enter swaps in a native date input. Commits valid dates while editing.
 */
export function DateCell({ value, label, fmt, onCommit }: {
  value: string; label: string; fmt: DateFormat; onCommit: (iso: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const shown = formatDate(value, fmt);
  if (!editing) {
    return (
      <button type="button" className="date-text" aria-label={`${label}: ${shown}. Edit`} onClick={() => setEditing(true)}>
        {shown}
      </button>
    );
  }
  return (
    <input
      type="date" className="cell-input" aria-label={label} autoFocus defaultValue={value}
      onChange={e => { if (ISO_RE.test(e.target.value)) onCommit(e.target.value); }}
      onBlur={() => setEditing(false)}
      onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") setEditing(false); }}
    />
  );
}

/** Start of an auto-scheduled task: read-only, marked as computed. */
export function ComputedDate({ value, fmt }: { value: string; fmt: DateFormat }) {
  return (
    <span className="date-text computed" title="Calculated from predecessors" aria-readonly="true">
      <LinkedIcon />{formatDate(value, fmt)}
    </span>
  );
}

/** Duration in whole days. Invalid input is ignored while typing and reverts on blur. */
export function DurationInput({ task, dispatch, className = "cell-input" }: {
  task: Task; dispatch: Dispatch<Action>; className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const dur = String(durationOf(task));
  return (
    <input
      type="number" className={className} min={1} max={MAX_DURATION} step={1}
      aria-label="Duration in days" title="Duration in days"
      value={draft ?? dur}
      onFocus={() => setDraft(dur)}
      onChange={e => {
        const v = e.target.value;
        setDraft(v);
        const n = Number(v);
        if (v.trim() !== "" && Number.isInteger(n) && n >= 1 && n <= MAX_DURATION) {
          dispatch({ type: "setDuration", id: task.id, days: n });
        }
      }}
      onBlur={() => setDraft(null)}
    />
  );
}
