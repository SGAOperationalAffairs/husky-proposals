"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { reportActionOutcome, reportError } from "@/app/_errors/reports";
import type { PostIdeaInput } from "@/core/postIdea";
import { postIdea, resubmitIdea, withdrawIdea } from "./actions";
import { clearDraft } from "./draft";
import { fieldErrors, postMessage, TRY_AGAIN, WITHDRAW_SIGNED_OUT } from "./messages";

// The one hook for the post form (#181): runs the post action once, and maps each
// result to what the form shows. It never retries. With an `ideaId` (#128) it is the
// edit form's hook: submit resubmits that declined post, and withdraw withdraws it.
export type PostPhase = "idle" | "posting" | "saved" | "signed_out" | "withdrawing" | "withdrawn";

export function usePostIdea(ideaId?: string) {
  const router = useRouter();
  const [phase, setPhase] = useState<PostPhase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  // The real double-submit guard. State updates are not synchronous, so a fast second
  // tap or Enter could pass a state check before "posting" is rendered.
  const inFlight = useRef(false);

  // Returns the field errors a server `invalid` result names, for the form to show.
  // `onSignedOut` runs before the phase changes, so the caller can keep the draft before
  // the Sign in link renders (a passive effect could lose that race, R3-C1).
  async function submit(
    input: PostIdeaInput,
    onSignedOut?: () => void,
  ): Promise<Record<string, string> | null> {
    if (inFlight.current) return null;
    inFlight.current = true;
    setPhase("posting");
    setMessage(null);
    try {
      const result = ideaId ? await resubmitIdea({ ...input, ideaId }) : await postIdea(input);
      if (result.ok) {
        clearDraft(ideaId);
        setPhase("saved");
        // The page's pending count is read on the server (#96).
        router.refresh();
        return null;
      }
      reportActionOutcome(result);
      const { error } = result;
      if (error.code === "pending_limit") {
        // The server knows of more pending posts than the page showed, for example from
        // another tab. Refresh so the count and the blocked state catch up (#96).
        router.refresh();
      }
      if (error.code === "signed_out") {
        onSignedOut?.();
        setPhase("signed_out");
        return null;
      }
      setPhase("idle");
      if (error.code === "invalid") {
        const { errors, formLevel } = fieldErrors(error.fields);
        if (formLevel || Object.keys(errors).length === 0) setMessage(postMessage(error.code));
        return errors;
      }
      setMessage(postMessage(error.code));
      return null;
    } catch (thrown) {
      // The server logs it. The student gets the general line and keeps their input.
      // Production rethrows the action's error; dev and preview show it in the floater (#191, #207).
      reportError("action", thrown);
      setPhase("idle");
      setMessage(TRY_AGAIN);
      return null;
    } finally {
      inFlight.current = false;
    }
  }

  // Edit mode only. Returns the line to show when the withdrawal did not happen, or
  // null when it did (the phase is then "withdrawn").
  async function withdraw(): Promise<string | null> {
    if (!ideaId || inFlight.current) return null;
    inFlight.current = true;
    setPhase("withdrawing");
    try {
      const result = await withdrawIdea({ ideaId });
      if (result.ok) {
        clearDraft(ideaId);
        setPhase("withdrawn");
        return null;
      }
      reportActionOutcome(result);
      setPhase("idle");
      return result.error.code === "signed_out" ? WITHDRAW_SIGNED_OUT : postMessage(result.error.code);
    } catch (thrown) {
      reportError("action", thrown);
      setPhase("idle");
      return TRY_AGAIN;
    } finally {
      inFlight.current = false;
    }
  }

  function reset() {
    setPhase("idle");
    setMessage(null);
  }

  return { phase, message, submit, withdraw, reset };
}
