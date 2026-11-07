import { useId, useState, type Dispatch } from "react";
import type { Action, Task } from "../../core/model";
import { formatPredecessors, parsePredecessors, type Lang, type ParseError } from "../../core/notation";

/**
 * Predecessors in MS Project shortcut notation (German or English input, shown
 * in the configured language). Commits on Enter or blur; Escape reverts.
 * A rejected entry keeps the typed text, marked invalid, with an inline error.
 */
export function PredecessorCell({ task, tasks, lang, dispatch }: {
  task: Task; tasks: Task[]; lang: Lang; dispatch: Dispatch<Action>;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<ParseError | null>(null);
  const errId = useId();
  const formatted = formatPredecessors(task.deps, tasks, lang);

  const commit = () => {
    if (draft === null) return;
    if (draft.trim() === formatted) { setDraft(null); setError(null); return; }
    const r = parsePredecessors(draft, tasks, task.id);
    if (r.ok) {
      dispatch({ type: "setPredecessors", id: task.id, links: r.links });
      setDraft(null);
      setError(null);
    } else {
      setError(r.error);
    }
  };

  const revert = () => { setDraft(null); setError(null); };

  return (
    <>
      <input
        type="text" className="cell-input" spellCheck={false} autoComplete="off"
        aria-label="Predecessors"
        title={(draft ?? formatted) || (lang === "de" ? "Vorgänger, z. B. 3;4EA+2T" : "Predecessors, e.g. 3,4FS+2d")}
        value={draft ?? formatted}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? errId : undefined}
        onFocus={() => { if (draft === null) setDraft(formatted); }}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          else if (e.key === "Escape") { e.preventDefault(); revert(); }
        }}
        onBlur={commit}
      />
      {error && <div className="cell-error" id={errId} role="alert">{error.message}</div>}
    </>
  );
}
