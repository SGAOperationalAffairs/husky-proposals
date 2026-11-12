import { PENDING_LIMIT } from "@/core/review";
import type { postIdea } from "./actions";

// The words for a post that did not go through (#181). Every code the post action can
// return is an expected result, so it gets plain copy, not a thrown error.
export type PostCode = Exclude<Awaited<ReturnType<typeof postIdea>>, { ok: true }>["error"]["code"];

export const TRY_AGAIN = "That didn't go through. Try again.";

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
};

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
