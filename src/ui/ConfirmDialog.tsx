import { useEffect, useId, useRef, type RefObject } from "react";

export interface ConfirmAction {
  label: string;
  onConfirm: () => void;
  /** Styles the button as destructive. */
  danger?: boolean;
}

/**
 * Small modal confirmation (native <dialog>, same shell as the settings dialog):
 * a title, a message, one or two actions and Cancel. Escape, Cancel and a click
 * on the backdrop cancel; focus returns to the opener when it closes.
 */
export function ConfirmDialog({ open, title, message, actions, onCancel, returnFocusRef }: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  actions: readonly ConfirmAction[];
  onCancel: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const dlg = useRef<HTMLDialogElement>(null);
  const firstAction = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const msgId = useId();

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (open && !d.open) {
      if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", "");
      firstAction.current?.focus();
    } else if (!open && d.open) {
      if (typeof d.close === "function") d.close(); else d.removeAttribute("open");
      returnFocusRef?.current?.focus();
    }
  }, [open, returnFocusRef]);

  return (
    <dialog
      ref={dlg} className="app-dialog confirm-dialog" role="alertdialog"
      aria-labelledby={titleId} aria-describedby={msgId}
      onCancel={e => { e.preventDefault(); onCancel(); }}
      onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); onCancel(); } }}
      onClick={e => { if (e.target === dlg.current) onCancel(); }}
    >
      <header id={titleId}>{title}</header>
      <div className="body" id={msgId}>{message}</div>
      <footer>
        <button type="button" className="btn plain" onClick={onCancel}>Cancel</button>
        <span className="actions">
          {actions.map((a, i) => (
            <button key={a.label} type="button" ref={i === 0 ? firstAction : undefined}
              className={`btn ${a.danger ? "danger" : i === actions.length - 1 ? "primary" : "plain"}`}
              onClick={a.onConfirm}>
              {a.label}
            </button>
          ))}
        </span>
      </footer>
    </dialog>
  );
}
