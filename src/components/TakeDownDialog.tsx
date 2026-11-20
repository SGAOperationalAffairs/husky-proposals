"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useState, type RefObject } from "react";
import { BOARDS, type BoardCode } from "@/core/boards";
import { DECLINE_REASON_MIN } from "@/core/review";
import { Button } from "./Button";
import { REASON_MISSING, REASON_SHORT, TAKE_DOWN_REASON_MISSING } from "./DecisionSheet";
import { TextArea } from "./Field";

// Pulls an approved idea off the public site (#59). It now covers both outcomes (#286),
// and keeps its name to limit churn: send_back returns the post to the student to fix
// and resubmit, and take_down ends it for good. The reason is required for both, and
// the student sees it. The same component on the queue and the idea page; .sheet in the
// idea's board color, like ParticipateDialog. Presentational: the caller runs the
// action and passes back busy and error.
export type PullBackKind = "send_back" | "take_down";

type Props = {
  kind: PullBackKind;
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
  kind,
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
          <Body kind={kind} number={number} busy={busy} error={error} onConfirm={onConfirm} />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// The words that differ between the two outcomes.
const COPY = {
  send_back: {
    title: (number: number) => `Send #${number} back to the student?`,
    description: (number: number) =>
      `It comes off the ideas list right away. The student sees your reason, can edit the post, and can send it for review again. If it is approved again, it keeps #${number}.`,
    label: "What the student should change",
    hint: `At least ${DECLINE_REASON_MIN} characters.`,
    confirm: "Send back",
    busy: "Sending back…",
  },
  take_down: {
    title: (number: number) => `Take down #${number}?`,
    description: () =>
      "It comes off the ideas list for good. The student sees your reason, but cannot edit it or send it again. If they could fix it, use Send back instead.",
    label: "Reason the student will see",
    hint: undefined,
    confirm: "Take down",
    busy: "Taking down…",
  },
} as const;

function Body({
  kind,
  number,
  busy,
  error,
  onConfirm,
}: Pick<Props, "kind" | "number" | "busy" | "error" | "onConfirm">) {
  const copy = COPY[kind];
  const [reason, setReason] = useState("");
  const [attempted, setAttempted] = useState(false);

  // A send-back needs enough written for the student to know what to change, like a
  // decline (#58). A take-down only needs some reason.
  const min = kind === "send_back" ? DECLINE_REASON_MIN : 1;
  const trimmed = reason.trim().length;
  const tooShort = trimmed < min;
  const clientError =
    trimmed === 0 ? (kind === "send_back" ? REASON_MISSING : TAKE_DOWN_REASON_MISSING) : REASON_SHORT;
  const fieldError = attempted && tooShort ? clientError : error?.field === "reason" ? error.text : undefined;
  const generalError = error && error.field !== "reason" ? error.text : undefined;

  const confirm = () => {
    if (busy) return;
    if (tooShort) {
      setAttempted(true);
      return;
    }
    onConfirm(reason);
  };

  return (
    <>
      <Dialog.Title className="heading text-4xl">{copy.title(number)}</Dialog.Title>
      <Dialog.Description className="max-w-prose">{copy.description(number)}</Dialog.Description>
      <TextArea
        label={copy.label}
        hint={copy.hint}
        value={reason}
        error={fieldError}
        onChange={(e) => {
          setReason(e.target.value);
          setAttempted(false);
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
          {busy ? copy.busy : copy.confirm}
        </Button>
      </div>
    </>
  );
}
