"use client";

import { Dialog } from "@base-ui/react/dialog";
import type { RefObject } from "react";
import { Button } from "./Button";

// Asks before an "I'll participate" tap counts (#67, agreed in #31): it is a
// real commitment, and it shares the student's name and email. A sheet from
// the bottom on phones, a small dialog on wider screens (.sheet in globals.css).
// Base UI holds focus inside and hands it back to `returnFocus` on close.
type Props = {
  ideaNumber: number;
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  returnFocus: RefObject<HTMLButtonElement | null>;
};

export function ParticipateDialog({ ideaNumber, open, onConfirm, onCancel, returnFocus }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onCancel()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="sheet-backdrop" />
        <Dialog.Popup finalFocus={returnFocus} className="sheet flex flex-col gap-4 bg-surface text-ink">
          <Dialog.Title className="heading text-4xl">Help with #{ideaNumber}?</Dialog.Title>
          {/* Placeholder wording: who sees the name waits on PRD D16. */}
          <Dialog.Description className="max-w-prose">
            SGA leaders will see your name and northeastern.edu email. If this idea moves forward, SGA may
            email you about helping.
          </Dialog.Description>
          <div className="flex flex-wrap justify-end gap-2">
            <Dialog.Close render={<Button />}>Cancel</Dialog.Close>
            <Button variant="primary" onClick={onConfirm}>
              {"I'll participate"}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
