import type { ChangeStatusError } from "./changeIdeaStatus";

// The words for a status change that did not go through (#98). Every code the actions
// can return is an expected result, so it gets plain copy, not a thrown error. The
// heads-up is not a failure: the hook shows it as its own state.
export type StatusCode =
  Exclude<ChangeStatusError["code"], "heads_up"> | "cross_origin" | "signed_out" | "unexpected";
export type StatusMessage = { text: string; field?: "reason"; refresh: boolean };

export const TRY_AGAIN_TEXT = "That didn't go through. Try again.";
const REASON_NEEDED = "Pick a reason students will see.";
const CHANGED = "Someone already changed this idea's status. The page now shows where it stands.";

// A Record, so a new code fails to compile until it has copy.
const TEXT: Record<StatusCode, string> = {
  not_allowed: "Only this board's chair or director, or the VP, can change its status.",
  already_changed: CHANGED,
  invalid_transition: CHANGED,
  same_status: CHANGED,
  not_found: "This idea is no longer public.",
  signed_out: "You're signed out. Sign in again to change this idea.",
  waiting_reason_required: REASON_NEEDED,
  invalid: TRY_AGAIN_TEXT,
  cross_origin: TRY_AGAIN_TEXT,
  // A throw on dev or preview (#191); the floater shows the detail.
  unexpected: TRY_AGAIN_TEXT,
};

export const STATUS_CODES = Object.keys(TEXT) as StatusCode[];

const REFRESH: ReadonlySet<StatusCode> = new Set([
  "already_changed",
  "invalid_transition",
  "same_status",
  "not_found",
]);

// `fields` is the invalid error's field list, which says whether it was the reason.
export function statusMessage(code: StatusCode, fields: string[] | undefined): StatusMessage {
  if (code === "waiting_reason_required" || (code === "invalid" && fields?.includes("reason"))) {
    return { text: REASON_NEEDED, field: "reason", refresh: false };
  }
  return { text: TEXT[code], refresh: REFRESH.has(code) };
}
