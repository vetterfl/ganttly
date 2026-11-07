import { useId, useState, type Dispatch } from "react";
import type { Action, Calendar, Task } from "../../core/model";
import { formatPredecessors, parsePredecessors, type Lang, type ParseError } from "../../core/notation";
import { useI18n } from "../../i18n/I18nContext";
import type { Translate } from "../../i18n";

/**
 * Predecessors in MS Project shortcut notation (German or English input, shown
 * in the configured language). Commits on Enter or blur; Escape reverts.
 * A rejected entry keeps the typed text, marked invalid, with an inline error.
 */
export function PredecessorCell({ task, tasks, lang, calendar, dispatch }: {
  task: Task; tasks: Task[]; lang: Lang; calendar: Calendar; dispatch: Dispatch<Action>;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<ParseError | null>(null);
  const { t } = useI18n();
  const errId = useId();
  const formatted = formatPredecessors(task.deps, tasks, lang);

  const commit = () => {
    if (draft === null) return;
    if (draft.trim() === formatted) { setDraft(null); setError(null); return; }
    const r = parsePredecessors(draft, tasks, task.id, calendar);
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
        aria-label={t("grid.preds")}
        title={(draft ?? formatted) || t(lang === "de" ? "grid.preds.hint.de" : "grid.preds.hint.en")}
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
      {error && <div className="cell-error" id={errId} role="alert">{errorText(error, t)}</div>}
    </>
  );
}

/** A parse error in the app language (core only provides kind + params). */
function errorText(e: ParseError, t: Translate): string {
  switch (e.kind) {
    case "syntax": return t("error.syntax", e.params.entry ?? e.entry);
    case "unknown": return t("error.unknown", e.params.row ?? e.entry);
    case "self": return t("error.self");
    case "cycle": return t("error.cycle", { rows: e.params.rows ?? e.entry, me: e.params.me ?? 0 });
  }
}
