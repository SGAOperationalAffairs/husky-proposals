"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useState, type RefObject } from "react";
import { BOARDS, type BoardCode } from "@/core/boards";
import { CLOSED_REASON_MAX } from "@/core/ideaStatus";
import { Button } from "./Button";
import { TextArea } from "./Field";

// Finishes an in-progress idea as Delivered or Closed (#126). Neither choice is
// selected when it opens, so one click cannot close an idea. Closed asks for the reason
// students see. .sheet in the idea's board color, like HoldDialog. Presentational: the
// caller runs the actions and passes back busy and error.
type Props = {
  number: number;
  board: BoardCode;
  open: boolean;
  busy: "deliver" | "close" | null;
  error: { text: string; field?: "reason" } | null;
  onDeliver: () => void;
  onClose: (reason: string) => void;
  onCancel: () => void;
  returnFocus: RefObject<HTMLElement | null>;
};

type Choice = "delivered" | "closed";

const PICK_CHOICE = "Pick Delivered or Closed.";
const WRITE_REASON = "Write the reason students will see.";

const OPTIONS: { value: Choice; label: string; text: string }[] = [
  {
    value: "delivered",
    label: "Delivered",
    text: "The board did the work. It stays on record and leaves the ranking.",
  },
  {
    value: "closed",
    label: "Closed",
    text: "It will not move forward for now. It leaves the wall and stops taking support. It stays stored, and the board can reopen it.",
  },
];

export function FinishDialog({
  number,
  board,
  open,
  busy,
  error,
  onDeliver,
  onClose,
  onCancel,
  returnFocus,
}: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onCancel()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="sheet-backdrop" />
        <Dialog.Popup
          finalFocus={returnFocus}
          data-board={BOARDS[board].color}
          className="sheet board-accent flex flex-col gap-4 bg-surface text-ink"
        >
          <Body number={number} busy={busy} error={error} onDeliver={onDeliver} onClose={onClose} />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function confirmLabel(choice: Choice | "", busy: Props["busy"]): string {
  if (choice === "delivered") return busy === "deliver" ? "Marking delivered…" : "Mark delivered";
  if (choice === "closed") return busy === "close" ? "Closing…" : "Close idea";
  return "Finish";
}

// The state lives here, not in FinishDialog, so it starts empty on every open.
function Body({
  number,
  busy,
  error,
  onDeliver,
  onClose,
}: Pick<Props, "number" | "busy" | "error" | "onDeliver" | "onClose">) {
  const [choice, setChoice] = useState<Choice | "">("");
  const [reason, setReason] = useState("");
  const [missing, setMissing] = useState<"choice" | "reason" | null>(null);
  const reasonError =
    missing === "reason" ? WRITE_REASON : error?.field === "reason" ? error.text : undefined;
  const generalError = error && error.field !== "reason" ? error.text : undefined;

  const confirm = () => {
    if (busy) return;
    if (choice === "") {
      setMissing("choice");
      return;
    }
    if (choice === "delivered") {
      onDeliver();
      return;
    }
    if (reason.trim() === "") {
      setMissing("reason");
      return;
    }
    onClose(reason.trim());
  };

  return (
    <>
      <Dialog.Title className="heading text-4xl">Finish #{number}</Dialog.Title>
      <Dialog.Description className="max-w-prose">
        Pick how this idea ends. You can reopen it later.
      </Dialog.Description>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">How did it end?</legend>
        {OPTIONS.map((option) => (
          <label
            key={option.value}
            className="flex items-start gap-3 rounded-field bordered bg-surface p-3 has-checked:border-accent has-checked:bg-accent-soft"
          >
            <input
              type="radio"
              name="finish"
              value={option.value}
              checked={choice === option.value}
              className="mt-1"
              onChange={() => {
                setChoice(option.value);
                setMissing(null);
              }}
            />
            <span className="flex flex-col gap-1">
              <span className="font-semibold">{option.label}</span>
              <span className="text-sm text-muted">{option.text}</span>
            </span>
          </label>
        ))}
        {missing === "choice" && <small className="font-semibold text-accent-text">{PICK_CHOICE}</small>}
      </fieldset>
      {choice === "closed" && (
        <TextArea
          label="Reason students will see"
          hint="Keep it general, and leave out confidential talks with administration."
          required
          value={reason}
          max={CLOSED_REASON_MAX}
          maxLength={CLOSED_REASON_MAX}
          error={reasonError}
          onChange={(e) => {
            setReason(e.target.value);
            setMissing(null);
          }}
        />
      )}
      {generalError && (
        <p role="alert" className="font-semibold text-accent-text">
          {generalError}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Dialog.Close render={<Button aria-disabled={busy !== null} />}>Cancel</Dialog.Close>
        <Button variant="primary" aria-disabled={busy !== null} onClick={confirm}>
          {confirmLabel(choice, busy)}
        </Button>
      </div>
    </>
  );
}
