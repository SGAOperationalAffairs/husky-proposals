"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { ReviewRowData } from "@/app/_review/present";
import { BOARDS } from "@/core/boards";
import { DECLINE_REASON_MIN } from "@/core/review";
import { Button } from "./Button";
import { TextArea } from "./Field";
import { PosterLine } from "./PosterLine";

// The decision drawer on the SGA queue (#59), from the prototype's idea panel: what
// the student wrote, who posted it, and approve or decline with a reason. A right-side
// panel on wide screens and a bottom sheet on phones (.drawer in globals.css). Base UI
// holds focus inside, closes on Escape, and hands focus back to `returnFocus`.
// Presentational: the caller runs the actions and passes back busy and error.
export const REASON_MISSING = "Write a reason so the student knows what to change.";
export const TAKE_DOWN_REASON_MISSING = "Write a reason so the student knows why it came down.";
export const REASON_SHORT = `Write at least ${DECLINE_REASON_MIN} characters so the student knows what to change.`;

type Props = {
  row: ReviewRowData | null;
  open: boolean;
  busy: "approve" | "decline" | null;
  error: { text: string; field?: "reason" } | null;
  onApprove: () => void;
  onDecline: (reason: string) => void;
  onClose: () => void;
  returnFocus: RefObject<HTMLElement | null>;
};

export function DecisionSheet({ row, open, busy, error, onApprove, onDecline, onClose, returnFocus }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="sheet-backdrop" />
        <Dialog.Popup
          finalFocus={returnFocus}
          data-board={row ? BOARDS[row.boardId].color : undefined}
          className="sheet drawer board-accent flex flex-col gap-4 bg-surface text-ink"
        >
          {row && (
            <DecisionBody
              key={row.id}
              row={row}
              busy={busy}
              error={error}
              onApprove={onApprove}
              onDecline={onDecline}
            />
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DecisionBody({
  row,
  busy,
  error,
  onApprove,
  onDecline,
}: Pick<Props, "busy" | "error" | "onApprove" | "onDecline"> & { row: ReviewRowData }) {
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  // Set when a decline is sent with a reason that is blank or too short (#58).
  const [attempted, setAttempted] = useState(false);
  const field = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (declining) field.current?.querySelector("textarea")?.focus();
  }, [declining]);

  // A refused or blank reason shows on the field itself, not above the buttons.
  const trimmed = reason.trim().length;
  const fieldError = attempted
    ? trimmed === 0
      ? REASON_MISSING
      : trimmed < DECLINE_REASON_MIN
        ? REASON_SHORT
        : undefined
    : error?.field === "reason"
      ? error.text
      : undefined;
  const generalError = error && error.field !== "reason" ? error.text : undefined;
  const isBusy = busy !== null;
  // An author's edit to an approved post (#295): the same drawer, with the diff first.
  const edit = row.edit;

  const send = () => {
    if (isBusy) return;
    if (reason.trim().length < DECLINE_REASON_MIN) {
      setAttempted(true);
      return;
    }
    onDecline(reason);
  };

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold">
          <span>{BOARDS[row.boardId].name}</span>
          <span className="font-normal text-muted">{edit ? edit.sentText : row.sentText}</span>
          <span className={row.due.overdue ? "text-accent-text" : "font-normal text-muted"}>
            {row.due.text}
          </span>
        </p>
        <Dialog.Close render={<Button size="sm" icon={<X className="size-4" />} />}>Close</Dialog.Close>
      </div>
      {edit && (
        <p className="text-sm text-muted">
          Changes to #{edit.number}. The approved version stays public until you decide.
        </p>
      )}
      <Dialog.Title className="heading text-4xl text-balance">{row.title}</Dialog.Title>
      <div className="flex flex-col gap-1 text-sm">
        <PosterLine poster={row.poster} />
      </div>
      {edit && (
        <section aria-label="What changed" className="flex flex-col gap-3 border-t border-line pt-4">
          <h3 className="text-sm font-bold">What changed</h3>
          {edit.changes.map((change) => (
            <div key={change.label} className="flex flex-col gap-1 text-sm">
              <p className="font-semibold">{change.label}</p>
              <dl className="flex flex-col gap-1">
                <div className="flex flex-col gap-0.5">
                  <dt className="text-muted">Before</dt>
                  <dd className="max-w-prose whitespace-pre-line">{change.before}</dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-muted">After</dt>
                  <dd className="max-w-prose font-semibold whitespace-pre-line">{change.after}</dd>
                </div>
              </dl>
            </div>
          ))}
          {edit.unchanged.length > 0 && (
            <p className="text-sm text-muted">Not changed: {edit.unchanged.join(", ")}.</p>
          )}
          <h3 className="pt-2 text-sm font-bold">The new version</h3>
        </section>
      )}
      <p className="max-w-prose font-semibold">{row.description}</p>
      {row.paragraphs.map((p) => (
        <p key={p} className="max-w-prose">
          {p}
        </p>
      ))}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-4 text-sm">
        {row.facts.map((fact) => (
          <div key={fact.term} className="flex flex-col gap-0.5">
            <dt className="text-muted">{fact.term}</dt>
            <dd className="font-semibold">{fact.value}</dd>
          </div>
        ))}
      </dl>

      {declining && (
        <div ref={field}>
          <TextArea
            label="Reason the student will see"
            required
            hint={
              edit
                ? `Say what to change. The approved version stays public. At least ${DECLINE_REASON_MIN} characters.`
                : `Say what to change, so they can edit it and send it again. At least ${DECLINE_REASON_MIN} characters.`
            }
            min={DECLINE_REASON_MIN}
            max={1000}
            value={reason}
            error={fieldError}
            onChange={(e) => {
              setReason(e.target.value);
              setAttempted(false);
            }}
          />
        </div>
      )}
      {generalError && (
        <p role="alert" className="font-semibold text-accent-text">
          {generalError}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {declining ? (
          <>
            <Button variant="primary" aria-disabled={isBusy} onClick={send}>
              {busy === "decline" ? "Declining…" : "Send decline"}
            </Button>
            <Button
              variant="plain"
              aria-disabled={isBusy}
              onClick={() => {
                if (isBusy) return;
                setDeclining(false);
                setAttempted(false);
              }}
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            {/* A board move needs the VP, so a chair is told so instead of getting a button that fails (#295). */}
            {edit && !edit.mayApprove ? (
              <p className="w-full text-sm font-semibold">
                This moves the idea to the {BOARDS[edit.boardAfter].name}. Only the VP of Campus Affairs can
                approve a move. You can decline it with a reason.
              </p>
            ) : (
              <Button variant="primary" aria-disabled={isBusy} onClick={() => !isBusy && onApprove()}>
                {busy === "approve" ? "Approving…" : edit ? "Approve changes" : "Approve and post"}
              </Button>
            )}
            <Button variant="line" aria-disabled={isBusy} onClick={() => !isBusy && setDeclining(true)}>
              {edit ? "Decline changes" : "Decline"}
            </Button>
          </>
        )}
      </div>
    </>
  );
}
