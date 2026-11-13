"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { reportActionOutcome, reportError } from "@/app/_errors/reports";
import { useToast } from "@/components/Toast";
import type { BoardCode } from "@/core/boards";
import { deliverIdea, holdIdea, startIdea } from "./actions";
import { statusMessage, TRY_AGAIN_TEXT, type StatusCode } from "./messages";

// The one hook for the status controls (#98): runs the actions, shows the toast for
// what happened, refreshes the page's data, and holds the busy, error, and heads-up
// state. It never retries. Callers use the returned boolean to close their dialog and
// to move focus.
export type StatusBusy = "start" | "hold" | "deliver" | null;
export type StatusError = { text: string; field?: "reason" } | null;
export type HeadsUpState = { inProgress: number; guideline: number } | null;

type Outcome =
  | { ok: true }
  | {
      ok: false;
      error: {
        code: StatusCode | "heads_up";
        fields?: string[];
        inProgress?: number;
        guideline?: number;
        report?: { message: string };
      };
    };

type Target = { id: string; number: number; boardId: BoardCode };

export function useStatusActions() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<StatusBusy>(null);
  const [error, setError] = useState<StatusError>(null);
  const [headsUp, setHeadsUp] = useState<HeadsUpState>(null);

  async function run(kind: Exclude<StatusBusy, null>, call: () => Promise<Outcome>, onOk: () => void) {
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
        setHeadsUp(null);
        onOk();
        router.refresh();
        return true;
      }
      if (outcome.error.code === "heads_up") {
        // Not a failure: the leader chooses whether to start anyway.
        setHeadsUp({ inProgress: outcome.error.inProgress ?? 0, guideline: outcome.error.guideline ?? 0 });
        return false;
      }
      reportActionOutcome(outcome);
      const message = statusMessage(outcome.error.code, outcome.error.fields);
      setError({ text: message.text, field: message.field });
      if (message.refresh) router.refresh();
      return false;
    } finally {
      setBusy(null);
    }
  }

  const startWith = (target: Target, confirmed: boolean) =>
    run(
      "start",
      () => startIdea(confirmed ? { ideaId: target.id, confirmed } : { ideaId: target.id }),
      () =>
        toast({
          title: `Started #${target.number}`,
          description: "Students see it as in progress, with an update on the idea page.",
          board: target.boardId,
        }),
    );

  return {
    busy,
    error,
    headsUp,
    clearError: () => setError(null),
    dismissHeadsUp: () => setHeadsUp(null),
    start: (target: Target) => startWith(target, false),
    startAnyway: (target: Target) => startWith(target, true),
    hold: (target: Target, reason: string) =>
      run(
        "hold",
        () => holdIdea({ ideaId: target.id, reason }),
        () =>
          toast({
            title: "On hold",
            description: "Students see your reason on the idea page.",
            board: target.boardId,
          }),
      ),
    deliver: (target: Target) =>
      run(
        "deliver",
        () => deliverIdea({ ideaId: target.id }),
        () =>
          toast({
            title: "Delivered",
            description: `#${target.number} stays on record as delivered.`,
            board: target.boardId,
          }),
      ),
  };
}
