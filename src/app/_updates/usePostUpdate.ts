"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { reportActionOutcome, reportError } from "@/app/_errors/reports";
import { TRY_AGAIN_TEXT } from "@/app/_status/messages";
import { useToast } from "@/components/Toast";
import type { BoardCode } from "@/core/boards";
import { CHECK_IN_BODY, nextDueText } from "@/core/updates";
import { postUpdateAction } from "./actions";
import { updateMessage, type UpdateCode } from "./messages";

// The one hook for posting updates (#130), and the one #131's still-working button calls:
// runs the action, shows the toast for what happened, refreshes the page's data, and holds
// the busy and error state. It never retries. Callers use the returned boolean to close
// their panel and to move focus.
export type UpdateBusy = "board" | "check_in" | null;
export type UpdateError = { text: string; field?: "body" } | null;

type Outcome =
  { ok: true } | { ok: false; error: { code: UpdateCode; fields?: string[]; report?: { message: string } } };

// `cadenceDays` is the board's, for the toast's "next one due".
export type UpdateTargetData = { id: string; number: number; boardId: BoardCode; cadenceDays: number };

export function usePostUpdate() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<UpdateBusy>(null);
  const [error, setError] = useState<UpdateError>(null);

  async function run(kind: Exclude<UpdateBusy, null>, call: () => Promise<Outcome>, onOk: () => void) {
    setBusy(kind);
    setError(null);
    try {
      let outcome: Outcome;
      try {
        outcome = await call();
      } catch (thrown) {
        // Production rethrows a failed action (#191). Report it and show Try again, instead
        // of leaving an unhandled rejection and a button that seems to do nothing.
        reportError("action", thrown);
        setError({ text: TRY_AGAIN_TEXT });
        return false;
      }
      if (outcome.ok) {
        onOk();
        router.refresh();
        return true;
      }
      reportActionOutcome(outcome);
      const message = updateMessage(outcome.error.code, outcome.error.fields);
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
    post: (target: UpdateTargetData, body: string) =>
      run(
        "board",
        () => postUpdateAction({ ideaId: target.id, kind: "board", body }),
        () =>
          toast({
            title: `Update posted on #${target.number}`,
            description: `Students see it on the idea page. ${nextDueText(target.cadenceDays, new Date())}`,
            board: target.boardId,
          }),
      ),
    checkIn: (target: UpdateTargetData) =>
      run(
        "check_in",
        () => postUpdateAction({ ideaId: target.id, kind: "check_in" }),
        () =>
          toast({
            title: `Check-in posted on #${target.number}`,
            description: `Students see "${CHECK_IN_BODY}" ${nextDueText(target.cadenceDays, new Date())}`,
            board: target.boardId,
          }),
      ),
  };
}
