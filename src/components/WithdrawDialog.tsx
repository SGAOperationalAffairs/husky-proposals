"use client";

import { Dialog } from "@base-ui/react/dialog";
import type { RefObject } from "react";
import { BOARDS, type BoardCode } from "@/core/boards";
import { Button } from "./Button";

// Confirms an author withdrawing their own post (#128). It cannot be undone, so it asks
// first. .sheet in the post's board color, like TakeDownDialog. Presentational: the
// caller runs the action and passes back busy and error.
type Props = {
  board: BoardCode;
  open: boolean;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  returnFocus: RefObject<HTMLElement | null>;
};

export function WithdrawDialog({ board, open, busy, error, onConfirm, onCancel, returnFocus }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onCancel()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="sheet-backdrop" />
        <Dialog.Popup
          finalFocus={returnFocus}
          data-board={BOARDS[board].color}
          className="sheet board-accent flex flex-col gap-4 bg-surface text-ink"
        >
          <Dialog.Title className="heading text-4xl">Withdraw this post?</Dialog.Title>
          <Dialog.Description className="max-w-prose">
            It will not be reviewed. You can post a new idea at any time.
          </Dialog.Description>
          {error && (
            <p role="alert" className="font-semibold text-accent-text">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Dialog.Close render={<Button variant="text" aria-disabled={busy} />}>Keep it</Dialog.Close>
            <Button variant="primary" aria-disabled={busy} onClick={() => !busy && onConfirm()}>
              {busy ? "Withdrawing" : "Withdraw post"}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
