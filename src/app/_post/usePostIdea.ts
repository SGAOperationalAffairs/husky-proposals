"use client";

import { useRef, useState } from "react";
import type { PostIdeaInput } from "@/core/postIdea";
import { postIdea } from "./actions";
import { clearDraft } from "./draft";
import { fieldErrors, postMessage, TRY_AGAIN } from "./messages";

// The one hook for the post form (#181): runs the post action once, and maps each
// result to what the form shows. It never retries.
export type PostPhase = "idle" | "posting" | "saved" | "signed_out";

export function usePostIdea() {
  const [phase, setPhase] = useState<PostPhase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  // The real double-submit guard. State updates are not synchronous, so a fast second
  // tap or Enter could pass a state check before "posting" is rendered.
  const inFlight = useRef(false);

  // Returns the field errors a server `invalid` result names, for the form to show.
  async function submit(input: PostIdeaInput): Promise<Record<string, string> | null> {
    if (inFlight.current) return null;
    inFlight.current = true;
    setPhase("posting");
    setMessage(null);
    try {
      const result = await postIdea(input);
      if (result.ok) {
        clearDraft();
        setPhase("saved");
        return null;
      }
      const { error } = result;
      if (error.code === "signed_out") {
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
    } catch {
      // The server logs it. The student gets the general line and keeps their input.
      setPhase("idle");
      setMessage(TRY_AGAIN);
      return null;
    } finally {
      inFlight.current = false;
    }
  }

  function reset() {
    setPhase("idle");
    setMessage(null);
  }

  return { phase, message, submit, reset };
}
