import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";

function Harness({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button type="button" ref={opener} onClick={() => setOpen(true)}>Open</button>
      <ConfirmDialog
        open={open} title="Start a new project?" message="This replaces the current chart."
        actions={[{ label: "New project", danger: true, onConfirm: () => { onConfirm(); setOpen(false); } }]}
        onCancel={() => { onCancel(); setOpen(false); }}
        returnFocusRef={opener}
      />
    </>
  );
}

const setup = () => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const user = userEvent.setup();
  render(<Harness onConfirm={onConfirm} onCancel={onCancel} />);
  const dialog = () => document.querySelector<HTMLDialogElement>("dialog.confirm-dialog")!;
  return { user, onConfirm, onCancel, dialog };
};

describe("ConfirmDialog", () => {
  it("opens with title, message and the action focused; confirm runs the action", async () => {
    const { user, onConfirm, onCancel, dialog } = setup();
    await user.click(screen.getByText("Open"));
    expect(dialog().open).toBe(true);
    expect(dialog().textContent).toContain("Start a new project?");
    expect(dialog().textContent).toContain("This replaces the current chart.");
    const action = screen.getByRole("button", { name: "New project" });
    expect(document.activeElement).toBe(action);
    await user.click(action);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
    expect(dialog().open).toBe(false);
    expect(document.activeElement).toBe(screen.getByText("Open"));
  });

  it("Cancel closes without confirming and returns focus", async () => {
    const { user, onConfirm, onCancel, dialog } = setup();
    await user.click(screen.getByText("Open"));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(dialog().open).toBe(false);
    expect(document.activeElement).toBe(screen.getByText("Open"));
  });

  it("Escape cancels", async () => {
    const { user, onConfirm, onCancel, dialog } = setup();
    await user.click(screen.getByText("Open"));
    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(dialog().open).toBe(false);
  });
});
