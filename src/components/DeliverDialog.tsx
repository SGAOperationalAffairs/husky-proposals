"use client";

import { Dialog } from "@base-ui/react/dialog";
import type { RefObject } from "react";
import { BOARDS, type BoardCode } from "@/core/boards";
import { Button } from "./Button";

// Confirms marking an idea delivered (#98). Delivered is final, so it asks first. .sheet
// in the idea's board color, like TakeDownDialog. Presentational: the caller runs the
// action and passes back busy and error.
type Props = {
  number: number;
  board: BoardCode;
  open: boolean;
  busy: boolean;
  error: { text: string } | null;
  onConfirm: () => void;
  onCancel: () => void;
  returnFocus: RefObject<HTMLElement | null>;
};

export function DeliverDialog({ number, board, open, busy, error, onConfirm, onCancel, returnFocus }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onCancel()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="sheet-backdrop" />
        <Dialog.Popup
          finalFocus={returnFocus}
          data-board={BOARDS[board].color}
          className="sheet board-accent flex flex-col gap-4 bg-surface text-ink"
        >
          <Dialog.Title className="heading text-4xl">Mark #{number} delivered?</Dialog.Title>
          <Dialog.Description className="max-w-prose">
            Delivered is final. The idea stays on record and leaves the board&apos;s ranking.
          </Dialog.Description>
          {error && (
            <p role="alert" className="font-semibold text-accent-text">
              {error.text}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Dialog.Close render={<Button aria-disabled={busy} />}>Cancel</Dialog.Close>
            <Button variant="primary" aria-disabled={busy} onClick={() => !busy && onConfirm()}>
              {busy ? "Marking delivered…" : "Mark delivered"}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
