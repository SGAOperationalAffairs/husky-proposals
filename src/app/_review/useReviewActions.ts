"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import type { BoardCode } from "@/core/boards";
import { approvePost, declinePost, takeDownPost } from "./actions";
import { decisionMessage, type DecisionCode, type DecisionContext } from "./messages";

// The one hook for the review screens (#59): runs the #58 actions, shows the toast
// for what happened, refreshes the page's data, and holds the busy and error state.
// It never retries. Callers use the returned boolean to close their drawer or dialog
// and to move focus.
export type ReviewBusy = "approve" | "decline" | "take_down" | null;
export type ReviewError = { text: string; field?: "reason" } | null;

type Outcome =
  { ok: true; number?: number | null } | { ok: false; error: { code: DecisionCode; fields?: string[] } };

type Target = { id: string; boardId: BoardCode };

export function useReviewActions() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<ReviewBusy>(null);
  const [error, setError] = useState<ReviewError>(null);

  async function run(
    kind: Exclude<ReviewBusy, null>,
    context: DecisionContext,
    call: () => Promise<Outcome>,
    onOk: (outcome: { number?: number | null }) => void,
  ): Promise<boolean> {
    setBusy(kind);
    setError(null);
    try {
      const outcome = await call();
      if (outcome.ok) {
        onOk(outcome);
        router.refresh();
        return true;
      }
      const message = decisionMessage(outcome.error.code, context, outcome.error.fields);
      setError({ text: message.text, field: message.field });
      if (message.refresh) router.refresh();
      return false;
    } finally {
      setBusy(null);
    }
  }

  return {
    busy,
    error,
    clearError: () => setError(null),
    approve: (target: Target) =>
      run(
        "approve",
        "decide",
        () => approvePost({ ideaId: target.id }),
        ({ number }) =>
          toast({
            title: number ? `Approved as #${number}` : "Approved",
            description: "Anyone with the link can see it now.",
            board: target.boardId,
          }),
      ),
    decline: (target: Target, reason: string) =>
      run(
        "decline",
        "decide",
        () => declinePost({ ideaId: target.id, reason }),
        () =>
          toast({
            title: "Declined",
            description: "The student sees your reason and can edit it and send it again.",
            board: target.boardId,
          }),
      ),
    takeDown: (target: Target & { number: number }, reason: string) =>
      run(
        "take_down",
        "take_down",
        () => takeDownPost({ ideaId: target.id, reason }),
        () =>
          toast({
            title: "Taken down",
            description: `#${target.number} is no longer public.`,
            board: target.boardId,
          }),
      ),
  };
}
