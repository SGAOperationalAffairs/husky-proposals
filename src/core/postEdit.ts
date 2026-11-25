// Editing an approved post (#295). Plain TypeScript, like review.ts: it says what the
// next edit state is and what to write, and the caller writes it. It never throws.
//
// Edit state is separate from the review status. The post stays `approved` the whole
// time, so support, follow, rank, and the wall never notice a pending edit. The edit is
// the post's latest revision, and `ideas.edit_submitted_at` marks that it is waiting.

import { z } from "zod";
import { BOARDS, type BoardCode } from "./boards";
import { COST_LABELS, SCALE_LABELS, TIME_LABELS } from "./ideaFacts";
import { can, type Viewer } from "./permissions";
import { BOARD_FOR_CATEGORY, postIdeaSchema, type CATEGORIES } from "./postIdea";
import { approveInputSchema, declineReasonSchema, type ReviewDecision, type ReviewStatus } from "./review";

// The stored words of a post, as the idea row and each revision hold them.
export type EditFields = {
  title: string;
  description: string;
  fullText: string | null;
  category: (typeof CATEGORIES)[number];
  location: string | null;
  scale: "small" | "medium" | "large" | null;
  costBand: "under_1k" | "from_1k_to_5k" | "over_5k" | null;
  timeHorizon: "this_semester" | "next_semester" | "within_a_year" | null;
  isAnonymous: boolean;
};

// The same validation as the post form (#55), plus which post.
export const editPostSchema = postIdeaSchema.extend({ ideaId: z.uuid() });

// A decision on an edit takes the same input as a decision on a post (#58).
export const approveEditInputSchema = approveInputSchema;
export const declineEditInputSchema = declineReasonSchema;

export type EditState = "none" | "pending";

export type EditEvent =
  | { type: "submit_edit"; actorId: string }
  | { type: "approve_edit"; actorId: string }
  | { type: "decline_edit"; actorId: string; reason: string };

export type EditEventType = EditEvent["type"];

// Edit state is orthogonal to review status, so it has its own table. A Record over both
// states, so a new state fails to compile.
export const EDIT_TRANSITIONS: Record<EditState, Partial<Record<EditEventType, EditState>>> = {
  none: { submit_edit: "pending" },
  pending: { approve_edit: "none", decline_edit: "none" },
};

export type EditRecord = { kind: "edit"; decision: ReviewDecision; reason: string | null };

export type EditError =
  | { code: "not_approved"; from: ReviewStatus }
  | { code: "edit_pending" }
  | { code: "no_pending_edit" }
  | { code: "not_author" }
  | { code: "own_post" }
  | { code: "reason_required" };

export type EditResult =
  | { ok: true; next: EditState; review: EditRecord | null }
  | { ok: false; error: EditError };

const fail = (error: EditError): EditResult => ({ ok: false, error });

export type EditPost = { reviewStatus: ReviewStatus; authorId: string | null; editPending: boolean };

export function applyEditEvent(post: EditPost, event: EditEvent): EditResult {
  // An edit exists only on an approved post. A pull-back or take-down is final for the edit.
  if (post.reviewStatus !== "approved") return fail({ code: "not_approved", from: post.reviewStatus });

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

  // Nobody decides their own post's edit, as for a post (data-model gap 7).
  if (isAuthor) return fail({ code: "own_post" });
  if (event.type === "approve_edit") {
    return { ok: true, next, review: { kind: "edit", decision: "approved", reason: null } };
  }
  const reason = event.reason.trim();
  if (reason === "") return fail({ code: "reason_required" });
  return { ok: true, next, review: { kind: "edit", decision: "declined", reason } };
}

const FIELD_KEYS = [
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

// True when the edit differs from the approved version in any field. The schema trims
// text, so a whitespace-only change is not a change.
export function hasChanges(approved: EditFields, edit: EditFields): boolean {
  return FIELD_KEYS.some((key) => approved[key] !== edit[key]);
}

// The board follows the category only when the category changes, so a VP's earlier move
// of the idea to another board survives an edit that keeps its category.
export function boardAfterEdit(
  current: { category: EditFields["category"]; boardId: BoardCode },
  editCategory: EditFields["category"],
): BoardCode {
  return editCategory === current.category ? current.boardId : BOARD_FOR_CATEGORY[editCategory];
}

// The current board reviews the edit. Moving the board also needs `change_board`, which
// is the VP's alone (permissions table).
export function mayApproveEdit(viewer: Viewer, currentBoard: BoardCode, boardAfter: BoardCode): boolean {
  if (!can(viewer, "review", currentBoard)) return false;
  return boardAfter === currentBoard || can(viewer, "change_board", boardAfter);
}

// The reviewer's field labels, in the order the diff lists them.
export const EDIT_FIELD_LABELS: Record<keyof EditFields, string> = {
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

const DIFF_ORDER: (keyof EditFields)[] = [
  "title",
  "description",
  "fullText",
  "category",
  "location",
  "scale",
  "costBand",
  "timeHorizon",
  "isAnonymous",
];

const NOT_SURE = "Not sure";

function shown(key: keyof EditFields, fields: EditFields): string {
  switch (key) {
    case "category":
      return BOARDS[BOARD_FOR_CATEGORY[fields.category]].name;
    case "scale":
      return fields.scale ? SCALE_LABELS[fields.scale] : NOT_SURE;
    case "costBand":
      return fields.costBand ? COST_LABELS[fields.costBand] : NOT_SURE;
    case "timeHorizon":
      return fields.timeHorizon ? TIME_LABELS[fields.timeHorizon] : NOT_SURE;
    case "isAnonymous":
      return fields.isAnonymous ? "Yes" : "No";
    case "location":
      return fields.location?.trim() || NOT_SURE;
    case "fullText":
      return fields.fullText?.trim() || "None";
    case "title":
    case "description":
      return fields[key];
  }
}

export type EditDiffRow = { field: keyof EditFields; label: string; before: string; after: string };

// One row per changed field, in a fixed order, as words a reviewer reads.
export function editDiff(approved: EditFields, edit: EditFields): EditDiffRow[] {
  return DIFF_ORDER.filter((key) => approved[key] !== edit[key]).map((field) => ({
    field,
    label: EDIT_FIELD_LABELS[field],
    before: shown(field, approved),
    after: shown(field, edit),
  }));
}

// The labels of the fields an edit left alone, for "Not changed: ...".
export function unchangedLabels(approved: EditFields, edit: EditFields): string[] {
  return DIFF_ORDER.filter((key) => approved[key] === edit[key]).map((key) => EDIT_FIELD_LABELS[key]);
}

// The system update on an approved edit. With a board move it names the new board.
export function editedUpdateBody(movedTo: BoardCode | null): string {
  return movedTo === null
    ? "This post was edited. A reviewer approved the changes."
    : `This post was edited and moved to the ${BOARDS[movedTo].name}. A reviewer approved the changes.`;
}
