import { useEffect, useRef, type RefObject } from "react";
import { useSettings } from "../settings/SettingsContext";
import type { Calendar } from "../core/model";
import { LANGUAGES, type MessageKey } from "../i18n";
import { useI18n } from "../i18n/I18nContext";
import type { ColumnSettings, DateFormat, Density, LanguagePref, Notation, Settings } from "../settings/settings";

const COLUMN_LABELS: [keyof ColumnSettings, MessageKey][] = [
  ["duration", "grid.duration"], ["start", "grid.start"], ["finish", "grid.finish"], ["pct", "grid.pct.title"], ["preds", "grid.preds"],
];
const OVERLAY_LABELS: [keyof Pick<Settings, "showArrows" | "showWeekends" | "showToday" | "showProgress">, MessageKey][] = [
  ["showArrows", "settings.arrows"], ["showWeekends", "settings.weekends"], ["showToday", "settings.today"], ["showProgress", "settings.progress"],
];

/**
 * Settings (native <dialog>). Every change applies immediately.
 * Closes via Close, Escape, or a click on the backdrop; focus returns to the opener.
 * The Project section edits the open project (saved in its link); everything
 * else is a per-browser view setting. "Reset to defaults" only resets the latter.
 */
export function SettingsDialog({ open, onClose, returnFocusRef, calendar, onCalendar }: {
  open: boolean; onClose: () => void; returnFocusRef: RefObject<HTMLElement | null>;
  calendar: Calendar; onCalendar: (c: Calendar) => void;
}) {
  const { settings: s, update, reset } = useSettings();
  const { t } = useI18n();
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
      <header id="settingsTitle">{t("settings.title")}</header>
      <div className="body">
        <fieldset className="project-section">
          <legend>{t("settings.project")} <span className="hint">{t("settings.project.hint")}</span></legend>
          <div className="radios" role="radiogroup" aria-label={t("settings.scheduleIn")}>
            <span className="radios-label">{t("settings.scheduleIn")}</span>
            <label className="check">
              <input type="radio" name="calendar" checked={calendar === "days"} onChange={() => onCalendar("days")} />
              {t("settings.calendarDays")}
            </label>
            <label className="check">
              <input type="radio" name="calendar" checked={calendar === "workdays"} onChange={() => onCalendar("workdays")} />
              {t("settings.workingDays")}
            </label>
          </div>
        </fieldset>
        <fieldset>
          <legend>{t("settings.languageSection")}</legend>
          <label className="field">{t("settings.language")}
            <select ref={first} value={s.language} onChange={e => update({ language: e.target.value as LanguagePref })}>
              <option value="auto">{t("settings.language.auto")}</option>
              {/* Each language in its own name, so it can be found whatever the current language is */}
              {LANGUAGES.map(l => <option key={l.code} value={l.code} lang={l.code}>{l.name}</option>)}
            </select>
          </label>
          <label className="field">{t("settings.notation")}
            <select value={s.notation} onChange={e => update({ notation: e.target.value as Notation })}>
              <option value="auto">{t("settings.notation.auto")}</option>
              <option value="de">{t("settings.notation.de")}</option>
              <option value="en">{t("settings.notation.en")}</option>
            </select>
          </label>
          <label className="field">{t("settings.dateFormat")}
            <select value={s.dateFormat} onChange={e => update({ dateFormat: e.target.value as DateFormat })}>
              <option value="locale">{t("settings.dateFormat.locale")}</option>
              <option value="iso">{t("settings.dateFormat.iso")}</option>
              <option value="dmy">{t("settings.dateFormat.dmy")}</option>
            </select>
          </label>
        </fieldset>
        <fieldset>
          <legend>{t("settings.layout")}</legend>
          <label className="field">{t("settings.density")}
            <select value={s.density} onChange={e => update({ density: e.target.value as Density })}>
              <option value="compact">{t("settings.density.compact")}</option>
              <option value="comfortable">{t("settings.density.comfortable")}</option>
            </select>
          </label>
          <div className="checks" role="group" aria-label={t("settings.columns")}>
            {COLUMN_LABELS.map(([k, key]) => (
              <label key={k} className="check">
                <input type="checkbox" checked={s.columns[k]}
                  onChange={e => update({ columns: { ...s.columns, [k]: e.target.checked } })} />
                {t("settings.column", t(key as "grid.duration"))}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>{t("settings.timeline")}</legend>
          <div className="checks">
            {OVERLAY_LABELS.map(([k, key]) => (
              <label key={k} className="check">
                <input type="checkbox" checked={s[k]} onChange={e => update({ [k]: e.target.checked })} />
                {t(key as "settings.arrows")}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <footer>
        <button type="button" className="btn plain" onClick={reset}>{t("settings.reset")}</button>
        <button type="button" className="btn primary" onClick={onClose}>{t("settings.close")}</button>
      </footer>
    </dialog>
  );
}
