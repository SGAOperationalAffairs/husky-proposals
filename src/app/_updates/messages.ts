import { TRY_AGAIN_TEXT } from "@/app/_status/messages";
import { UPDATE_BODY_MAX } from "@/core/updates";
import type { PostUpdateError } from "./postUpdate";

// The words for an update that did not go through (#130). Every code the action can return
// is an expected result, so it gets plain copy, not a thrown error.
export type UpdateCode = PostUpdateError["code"] | "cross_origin" | "signed_out" | "unexpected";
export type UpdateMessage = { text: string; field?: "body"; refresh: boolean };

const BODY_NEEDED = `Write the update students will read, up to ${UPDATE_BODY_MAX.toLocaleString("en-US")} characters.`;

// A Record, so a new code fails to compile until it has copy.
const TEXT: Record<UpdateCode, string> = {
  invalid: TRY_AGAIN_TEXT,
  body_placeholder: "Replace the parts in [brackets] before you post.",
  not_found: "This idea is no longer public. The list now shows what is open.",
  not_allowed: "Only this board's chair or director, or the VP, can post updates on its ideas.",
  not_in_progress: "This idea is no longer in progress. The list now shows where it stands.",
  signed_out: "You're signed out. Sign in again to post an update.",
  cross_origin: TRY_AGAIN_TEXT,
  // A throw on dev or preview (#191); the floater shows the detail.
  unexpected: TRY_AGAIN_TEXT,
};

export const UPDATE_CODES = Object.keys(TEXT) as UpdateCode[];

// A stale list is refreshed so the row that no longer belongs leaves it.
const REFRESH: ReadonlySet<UpdateCode> = new Set(["not_in_progress", "not_found"]);

// `fields` is the invalid error's field list, which says whether it was the body.
export function updateMessage(code: UpdateCode, fields: string[] | undefined): UpdateMessage {
  if (code === "invalid" && fields?.includes("body")) {
    return { text: BODY_NEEDED, field: "body", refresh: false };
  }
  if (code === "body_placeholder") {
    return { text: TEXT[code], field: "body", refresh: false };
  }
  return { text: TEXT[code], refresh: REFRESH.has(code) };
}
