import { useEffect, useRef, type RefObject } from "react";
import { useSettings } from "../settings/SettingsContext";
import type { ColumnSettings, DateFormat, Density, Notation, Settings } from "../settings/settings";

const COLUMN_LABELS: [keyof ColumnSettings, string][] = [
  ["duration", "Duration"], ["start", "Start"], ["finish", "Finish"], ["pct", "% Complete"], ["preds", "Predecessors"],
];
const OVERLAY_LABELS: [keyof Pick<Settings, "showArrows" | "showWeekends" | "showToday" | "showProgress">, string][] = [
  ["showArrows", "Dependency arrows"], ["showWeekends", "Weekend shading"], ["showToday", "Today marker"], ["showProgress", "Progress on bars"],
];

/**
 * View Settings (native <dialog>). Every change applies immediately.
 * Closes via Close, Escape, or a click on the backdrop; focus returns to the opener.
 */
export function SettingsDialog({ open, onClose, returnFocusRef }: {
  open: boolean; onClose: () => void; returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const { settings: s, update, reset } = useSettings();
  const dlg = useRef<HTMLDialogElement>(null);
  const first = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (open && !d.open) {
      if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", "");
      first.current?.focus();
    } else if (!open && d.open) {
      if (typeof d.close === "function") d.close(); else d.removeAttribute("open");
      returnFocusRef.current?.focus();
    }
  }, [open, returnFocusRef]);

  return (
    <dialog
      ref={dlg} className="app-dialog settings-dialog" aria-labelledby="settingsTitle"
      onCancel={e => { e.preventDefault(); onClose(); }}
      onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); onClose(); } }}
      onClick={e => { if (e.target === dlg.current) onClose(); }}
    >
      <header id="settingsTitle">View Settings</header>
      <div className="body">
        <fieldset>
          <legend>Notation &amp; dates</legend>
          <label className="field">Link notation
            <select ref={first} value={s.notation} onChange={e => update({ notation: e.target.value as Notation })}>
              <option value="de">Deutsch — EA/AA/EE/AE, T</option>
              <option value="en">English — FS/SS/FF/SF, d</option>
            </select>
          </label>
          <label className="field">Date format
            <select value={s.dateFormat} onChange={e => update({ dateFormat: e.target.value as DateFormat })}>
              <option value="locale">Browser locale</option>
              <option value="iso">ISO (YYYY-MM-DD)</option>
              <option value="dmy">DD.MM.YYYY</option>
            </select>
          </label>
        </fieldset>
        <fieldset>
          <legend>Layout</legend>
          <label className="field">Row density
            <select value={s.density} onChange={e => update({ density: e.target.value as Density })}>
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable</option>
            </select>
          </label>
          <div className="checks" role="group" aria-label="Grid columns">
            {COLUMN_LABELS.map(([k, label]) => (
              <label key={k} className="check">
                <input type="checkbox" checked={s.columns[k]}
                  onChange={e => update({ columns: { ...s.columns, [k]: e.target.checked } })} />
                {label} column
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Timeline</legend>
          <div className="checks">
            {OVERLAY_LABELS.map(([k, label]) => (
              <label key={k} className="check">
                <input type="checkbox" checked={s[k]} onChange={e => update({ [k]: e.target.checked })} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <footer>
        <button type="button" className="btn plain" onClick={reset}>Reset to defaults</button>
        <button type="button" className="btn primary" onClick={onClose}>Close</button>
      </footer>
    </dialog>
  );
}
