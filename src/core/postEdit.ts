// Editing an approved post (#295). Plain TypeScript, like review.ts: it says what the
// next state is and what row to write, and the caller writes it. It never throws.
//
// Edit state is separate from review status. The idea stays approved the whole time, so
// support, follow, rank, and the wall do not move while an edit waits. The pending edit is
// the idea's latest revision, and `ideas.edit_submitted_at` marks that one is waiting.

import { z } from "zod";
import { BOARDS, type BoardCode } from "./boards";
import {
  COST_LABELS,
  SCALE_LABELS,
  TIME_LABELS,
  type CostBandValue,
  type IdeaScaleValue,
  type TimeHorizonValue,
} from "./ideaFacts";
import { can, type Viewer } from "./permissions";
import { BOARD_FOR_CATEGORY, postIdeaSchema, type CATEGORIES } from "./postIdea";
import { approveInputSchema, declineReasonSchema, type ReviewDecision, type ReviewStatus } from "./review";

// Same validation as the post form, plus which post (#295).
export const editPostSchema = postIdeaSchema.extend({ ideaId: z.uuid() });

// The reviewer's inputs reuse the review actions' schemas, so an edit decision is checked
// like any other decision (a decline needs the same 40 characters).
export const editApproveInputSchema = approveInputSchema;
export const editDeclineInputSchema = declineReasonSchema;

// The words of a post, as stored on an idea and on each of its revisions.
export type EditFields = {
  title: string;
  description: string;
  fullText: string | null;
  category: (typeof CATEGORIES)[number];
  location: string | null;
  scale: IdeaScaleValue | null;
  costBand: CostBandValue | null;
  timeHorizon: TimeHorizonValue | null;
  isAnonymous: boolean;
};

export type EditState = "none" | "pending";

export type EditEvent =
  | { type: "submit_edit"; actorId: string }
  | { type: "approve_edit"; actorId: string }
  | { type: "decline_edit"; actorId: string; reason: string };

export type EditEventType = EditEvent["type"];

// A Record over every state, so a new state fails to compile. An edit decision returns the
// edit to "none": the next edit starts again from there.
export const EDIT_TRANSITIONS: Record<EditState, Partial<Record<EditEventType, EditState>>> = {
  none: { submit_edit: "pending" },
  pending: { approve_edit: "none", decline_edit: "none" },
};

// authorId is null after an account deletion (D14). editPending is true while
// `edit_submitted_at` is set.
export type EditPost = { reviewStatus: ReviewStatus; authorId: string | null; editPending: boolean };

// The Review row to write for a decision: always kind "edit".
export type EditReviewRecord = { kind: "edit"; decision: ReviewDecision; reason: string | null };

export type EditError =
  | { code: "not_approved" }
  | { code: "edit_pending" }
  | { code: "no_pending_edit" }
  | { code: "not_author" }
  | { code: "own_post" }
  | { code: "reason_required" };

export type EditResult =
  | { ok: true; next: EditState; review: EditReviewRecord | null }
  | { ok: false; error: EditError };

const fail = (error: EditError): EditResult => ({ ok: false, error });

export function applyEditEvent(post: EditPost, event: EditEvent): EditResult {
  // A post that is not approved is never edited this way: a pending or declined post is
  // edited by resubmitting, and a taken-down post is final (#286).
  if (post.reviewStatus !== "approved") return fail({ code: "not_approved" });

  const state: EditState = post.editPending ? "pending" : "none";
  const next = EDIT_TRANSITIONS[state][event.type];
  if (next === undefined) {
    return fail({ code: event.type === "submit_edit" ? "edit_pending" : "no_pending_edit" });
  }

  const isAuthor = post.authorId !== null && event.actorId === post.authorId;
  if (event.type === "submit_edit") {
    if (!isAuthor) return fail({ code: "not_author" });
    return { ok: true, next, review: null };
  }

  // Nobody decides their own post, as in review.ts (data-model gap 7). A null author never matches.
  if (isAuthor) return fail({ code: "own_post" });
  if (event.type === "approve_edit") {
    return { ok: true, next, review: { kind: "edit", decision: "approved", reason: null } };
  }
  const reason = event.reason.trim();
  if (reason === "") return fail({ code: "reason_required" });
  return { ok: true, next, review: { kind: "edit", decision: "declined", reason } };
}

export const EDIT_FIELDS = [
  "title",
  "description",
  "fullText",
  "category",
  "location",
  "scale",
  "costBand",
  "timeHorizon",
  "isAnonymous",
] as const satisfies readonly (keyof EditFields)[];

export type EditField = (typeof EDIT_FIELDS)[number];

// What a reviewer reads for each field. "Board" is the category: the board follows it.
export const EDIT_FIELD_LABELS: Record<EditField, string> = {
  title: "Title",
  description: "Short description",
  fullText: "Detailed description",
  category: "Board",
  location: "Where",
  scale: "Scale",
  costBand: "Rough cost",
  timeHorizon: "Timing",
  isAnonymous: "Anonymous to students",
};

// An edit that changes nothing is not sent. The form's schema trims every text, so a
// whitespace-only change is already gone by the time it gets here.
export function hasChanges(approved: EditFields, edit: EditFields): boolean {
  return EDIT_FIELDS.some((field) => approved[field] !== edit[field]);
}

// The board follows the category only when the category changes, so a VP's earlier move of
// the idea survives an edit that keeps the category (#295).
export function boardAfterEdit(
  idea: { category: EditFields["category"]; boardId: BoardCode },
  editCategory: EditFields["category"],
): BoardCode {
  return editCategory === idea.category ? idea.boardId : BOARD_FOR_CATEGORY[editCategory];
}

// The idea's current board reviews the edit. Moving the board is the VP's alone
// (`change_board`), so a chair or director can decline an edit that moves it, not approve it.
export function mayApproveEdit(viewer: Viewer, currentBoard: BoardCode, boardAfter: BoardCode): boolean {
  if (!can(viewer, "review", currentBoard)) return false;
  return boardAfter === currentBoard || can(viewer, "change_board", boardAfter);
}

const NOT_SURE = "Not sure";

function labelOf<T extends string>(labels: Record<T, string>, value: T | null): string {
  return value === null ? NOT_SURE : (labels[value] ?? NOT_SURE);
}

// A field's value in words, for the reviewer's before and after.
function show(field: EditField, fields: EditFields): string {
  switch (field) {
    case "title":
      return fields.title;
    case "description":
      return fields.description;
    case "fullText":
      return fields.fullText ?? "";
    case "category":
      return BOARDS[BOARD_FOR_CATEGORY[fields.category]].name;
    case "location":
      return fields.location ?? NOT_SURE;
    case "scale":
      return labelOf(SCALE_LABELS, fields.scale);
    case "costBand":
      return labelOf(COST_LABELS, fields.costBand);
    case "timeHorizon":
      return labelOf(TIME_LABELS, fields.timeHorizon);
    case "isAnonymous":
      return fields.isAnonymous ? "Yes" : "No";
  }
}

export type EditChange = { field: EditField; before: string; after: string };

// The changed fields in form order, with their values in words.
export function editDiff(approved: EditFields, edit: EditFields): EditChange[] {
  return EDIT_FIELDS.filter((field) => approved[field] !== edit[field]).map((field) => ({
    field,
    before: show(field, approved),
    after: show(field, edit),
  }));
}

// The one system update an approved edit writes. It states what happened and promises nothing.
export function editedUpdateBody(movedTo: BoardCode | null): string {
  return movedTo === null
    ? "This post was edited. A reviewer approved the changes."
    : `This post was edited and moved to the ${BOARDS[movedTo].name}. A reviewer approved the changes.`;
}
