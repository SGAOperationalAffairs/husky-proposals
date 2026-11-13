"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useState, type RefObject } from "react";
import { BOARDS, type BoardCode } from "@/core/boards";
import { HOLD_REASONS, HOLD_REASON_MAX } from "@/core/ideaStatus";
import { Button } from "./Button";
import { SelectField, TextField } from "./Field";

// Puts an approved idea on hold with a reason students see (#98). The reason is a preset
// or "Something else" with free text. .sheet in the idea's board color, like
// TakeDownDialog. Presentational: the caller runs the action and passes back busy and
// error.
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

const OTHER = "other";
const PICK_REASON = "Pick a reason students will see.";
const WRITE_REASON = "Write the reason students will see.";

export function HoldDialog({ number, board, open, busy, error, onConfirm, onCancel, returnFocus }: Props) {
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
  const [choice, setChoice] = useState("");
  const [text, setText] = useState("");
  const [missing, setMissing] = useState(false);
  const isOther = choice === OTHER;
  const reason = isOther ? text.trim() : choice;
  const serverReason = error?.field === "reason" ? error.text : undefined;
  const generalError = error && error.field !== "reason" ? error.text : undefined;
  const missingText = missing ? (isOther ? WRITE_REASON : PICK_REASON) : undefined;

  const confirm = () => {
    if (busy) return;
    if (reason === "") {
      setMissing(true);
      return;
    }
    onConfirm(reason);
  };

  return (
    <>
      <Dialog.Title className="heading text-4xl">Put #{number} on hold?</Dialog.Title>
      <Dialog.Description className="max-w-prose">
        It stays on the list and keeps its support. Students see the reason you pick.
      </Dialog.Description>
      <SelectField
        label="Reason students will see"
        value={choice}
        error={isOther ? undefined : (missingText ?? serverReason)}
        onChange={(e) => {
          setChoice(e.target.value);
          setMissing(false);
        }}
      >
        <option value="">Choose a reason</option>
        {HOLD_REASONS.map((preset) => (
          <option key={preset} value={preset}>
            {preset}
          </option>
        ))}
        <option value={OTHER}>Something else</option>
      </SelectField>
      {isOther && (
        <TextField
          label="Write the reason"
          hint="Students see this. Keep it general, and leave out confidential talks with administration."
          value={text}
          max={HOLD_REASON_MAX}
          maxLength={HOLD_REASON_MAX}
          error={missingText ?? serverReason}
          onChange={(e) => {
            setText(e.target.value);
            setMissing(false);
          }}
        />
      )}
      {generalError && (
        <p role="alert" className="font-semibold text-accent-text">
          {generalError}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Dialog.Close render={<Button aria-disabled={busy} />}>Cancel</Dialog.Close>
        <Button variant="primary" aria-disabled={busy} onClick={confirm}>
          {busy ? "Putting on hold…" : "Put on hold"}
        </Button>
      </div>
    </>
  );
}
