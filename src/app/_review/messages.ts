import type { DecideError } from "./decidePost";

// The words for a decision that did not go through (#59). Every code the actions can
// return is an expected result, so it gets plain copy, not a thrown error.
export type DecisionCode = DecideError["code"] | "cross_origin" | "signed_out" | "unexpected";
export type DecisionContext = "decide" | "take_down";
export type DecisionMessage = { text: string; field?: "reason"; refresh: boolean };

const TRY_AGAIN = "That didn't go through. Try again.";
const REASON_NEEDED = "Write a reason so the student knows what to change.";

// A Record, so a new code fails to compile until it has copy.
const TEXT: Record<DecisionCode, string> = {
  own_post: "You posted this, so another reviewer has to decide it.",
  already_decided: "Someone already decided this post.",
  not_found: "This post is gone. The student may have withdrawn it.",
  not_allowed: "You don't review this board.",
  signed_out: "You're signed out. Sign in again to decide this post.",
  reason_required: REASON_NEEDED,
  invalid: TRY_AGAIN,
  invalid_transition: TRY_AGAIN,
  not_editable: TRY_AGAIN,
  not_author: TRY_AGAIN,
  pending_limit: TRY_AGAIN,
  cross_origin: TRY_AGAIN,
  // A throw on dev or preview (#191); the floater shows the detail.
  unexpected: TRY_AGAIN,
};

export const TRY_AGAIN_TEXT = TRY_AGAIN;

export const DECISION_CODES = Object.keys(TEXT) as DecisionCode[];

const REFRESH: ReadonlySet<DecisionCode> = new Set(["already_decided", "not_found"]);

// `fields` is the invalid error's field list, which says whether it was the reason.
export function decisionMessage(
  code: DecisionCode,
  context: DecisionContext,
  fields: string[] | undefined,
): DecisionMessage {
  if (code === "reason_required" || (code === "invalid" && fields?.includes("reason"))) {
    return { text: REASON_NEEDED, field: "reason", refresh: false };
  }
  // A take-down on an idea that someone already took down.
  if (code === "invalid_transition" && context === "take_down") {
    return { text: "This idea is no longer approved.", refresh: true };
  }
  return { text: TEXT[code], refresh: REFRESH.has(code) };
}
