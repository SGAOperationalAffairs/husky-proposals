import { PENDING_LIMIT } from "@/core/review";
import type { editIdea, postIdea, resubmitIdea, withdrawIdea } from "./actions";

// The words for a post that did not go through (#181, #128, #295). Every code the post,
// resubmit, withdraw, and edit actions can return is an expected result, so it gets
// plain copy, not a thrown error.
type ErrorCode<A extends (raw: unknown) => Promise<unknown>> =
  Exclude<Awaited<ReturnType<A>>, { ok: true }> extends { error: { code: infer C } } ? C : never;
export type PostCode =
  | ErrorCode<typeof postIdea>
  | ErrorCode<typeof resubmitIdea>
  | ErrorCode<typeof withdrawIdea>
  | ErrorCode<typeof editIdea>;

export const TRY_AGAIN = "That didn't go through. Try again.";
const CHANGED = "This post changed while you were editing. Reload the page to see where it stands.";

// Field names as the rules module reports them, mapped to the plain message a student sees.
// The client check and a server `invalid` result use the same words.
export const FIELD_MESSAGES: Record<string, string> = {
  title: "Add a title, up to 120 characters.",
  summary: "Add a summary, up to 140 characters.",
  details: "Write 80 to 1,000 characters of detail.",
  category: "Choose the board this idea is for.",
  location: "Keep the location up to 120 characters.",
};

// A Record, so a new code fails to compile until it has copy.
const TEXT: Record<PostCode, string> = {
  signed_out: "Sign in to post your idea. We kept what you wrote, so you can send it once you are back.",
  invalid: TRY_AGAIN,
  pending_limit: `You have ${PENDING_LIMIT} posts waiting for review. You can post again once one is reviewed.`,
  cross_origin: TRY_AGAIN,
  // A throw on dev or preview (#191); the floater shows the detail.
  unexpected: TRY_AGAIN,
  // The edit page and the withdraw dialog (#128).
  not_found: "We could not find this post. It may have been withdrawn.",
  not_editable: CHANGED,
  invalid_transition: CHANGED,
  already_changed: CHANGED,
  // Editing an approved post (#295).
  edit_pending:
    "You already sent changes to this post. You can edit it again after a reviewer decides.",
  no_changes: "You have not changed anything yet.",
  not_approved: CHANGED,
  // A decision with nothing waiting is a reviewer's error, never an author's.
  no_pending_edit: TRY_AGAIN,
  // Unreachable for an author: they own the post, and a reason is a reviewer's field.
  own_post: TRY_AGAIN,
  not_author: TRY_AGAIN,
  reason_required: TRY_AGAIN,
};

// Shown in the withdraw dialog when the session ended (#128).
export const WITHDRAW_SIGNED_OUT = "Sign in again to withdraw this post.";

// The edit form's sign-in prompt (#128).
export const RESUBMIT_SIGNED_OUT =
  "Sign in again to send your changes. We kept them, so you can send them once you are back.";

export const POST_CODES = Object.keys(TEXT) as PostCode[];

export const postMessage = (code: PostCode): string => TEXT[code];

// `fields` is the invalid error's field list. A `form`-level error has no field to mark,
// so it is reported apart and the form shows the general line.
export function fieldErrors(fields: string[]): { errors: Record<string, string>; formLevel: boolean } {
  const errors: Record<string, string> = {};
  let formLevel = false;
  for (const field of fields) {
    if (field === "form") formLevel = true;
    else errors[field] = FIELD_MESSAGES[field] ?? "Check this field.";
  }
  return { errors, formLevel };
}
