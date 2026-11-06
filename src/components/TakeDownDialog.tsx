"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useState, type RefObject } from "react";
import { BOARDS, type BoardCode } from "@/core/boards";
import { Button } from "./Button";
import { TextArea } from "./Field";
import { REASON_MISSING } from "./DecisionSheet";

// Takes an approved idea off the public site (#59). The reason is required: the
// student sees it and can edit and resubmit. The same component on the queue and the
// idea page; .sheet in the idea's board color, like ParticipateDialog. Presentational:
// the caller runs the action and passes back busy and error.
type Props = {
  number: number;
  board: BoardCode;
  open: boolean;
  busy: boolean;
  error: { text: string; field?: "reason" } | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  returnFocus: RefObject<HTMLElement | null>;
};

export function TakeDownDialog({
  number,
  board,
  open,
  busy,
  error,
  onConfirm,
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
          <Body number={number} busy={busy} error={error} onConfirm={onConfirm} />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Body({ number, busy, error, onConfirm }: Pick<Props, "number" | "busy" | "error" | "onConfirm">) {
  const [reason, setReason] = useState("");
  const [missing, setMissing] = useState(false);
  const fieldError = missing ? REASON_MISSING : error?.field === "reason" ? error.text : undefined;
  const generalError = error && error.field !== "reason" ? error.text : undefined;

  const confirm = () => {
    if (busy) return;
    if (reason.trim() === "") {
      setMissing(true);
      return;
    }
    onConfirm(reason);
  };

  return (
    <>
      <Dialog.Title className="heading text-4xl">Take down #{number}?</Dialog.Title>
      <Dialog.Description className="max-w-prose">
        It stops being public right away. The student sees your reason and can edit it and send it again.
      </Dialog.Description>
      <TextArea
        label="Reason the student will see"
        value={reason}
        error={fieldError}
        onChange={(e) => {
          setReason(e.target.value);
          setMissing(false);
        }}
      />
      {generalError && (
        <p role="alert" className="font-semibold text-accent-text">
          {generalError}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Dialog.Close render={<Button aria-disabled={busy} />}>Cancel</Dialog.Close>
        <Button variant="primary" aria-disabled={busy} onClick={confirm}>
          {busy ? "Taking down…" : "Take down"}
        </Button>
      </div>
    </>
  );
}
