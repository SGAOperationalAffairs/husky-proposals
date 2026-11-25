import type { Session } from "@/auth/contract";
import { BOARD_CODES, type BoardCode } from "@/core/boards";
import { IDEAS_TAG, ideaTag } from "@/core/cacheTags";
import { can } from "@/core/permissions";
import {
  applyEditEvent,
  approveEditInputSchema,
  boardAfterEdit,
  declineEditInputSchema,
  editedUpdateBody,
  editFieldsOf,
  mayApproveEdit,
  type EditError,
  type EditFields,
  type EditRecord,
} from "@/core/postEdit";
import type { ReviewStatus } from "@/core/review";

// Deciding an author's edit to an approved post (#295): the rules, with the storage behind
// an interface, like decidePost. The server action (actions.ts) supplies the Prisma store
// inside one transaction; the tests supply a fake one. Who may review the board is
// permissions (#52), what the post allows is the edit state machine (postEdit.ts), and
// moving the board needs the VP; this module joins them and builds the write.

export type EditTarget = {
  id: string;
  // The idea's current board, which reviews the edit.
  boardId: string;
  // The approved version's category, to tell whether the edit changes it.
  category: EditFields["category"];
  authorId: string | null;
  reviewStatus: ReviewStatus;
  number: number | null;
  // The marker the decision's write is guarded on.
  editSubmittedAt: Date | null;
  // The latest revision, which is the edit. Null for a post with no revision.
  edit: (EditFields & { id: string }) | null;
};

// What an approval writes onto the idea: the edit's words, the board it lands on, and the
// cleared marker. A decline writes only the cleared marker.
export type EditIdeaPatch =
  ({ editSubmittedAt: null; boardId: BoardCode } & EditFields) | { editSubmittedAt: null };

export type EditDecisionWrite = {
  ideaId: string;
  // The marker the rules read. The write applies only if the post still holds it.
  editSubmittedAt: Date;
  patch: EditIdeaPatch;
  review: EditRecord & {
    revisionId: string;
    reviewerId: string;
    decidedAt: Date;
  };
  reviewer: { id: string; email: string; displayName: string };
  // Written only on approval: the system update the idea page shows.
  update: { body: string } | null;
};

export type EditReviewStore = {
  find(ideaId: string): Promise<EditTarget | null>;
  // Null when the guarded update moved nothing: someone decided first, or the post was
  // pulled back. Throws AlreadyDecidedError when the unique backstop fires (see decidePost).
  record(write: EditDecisionWrite): Promise<{ reviewId: string } | null>;
};

export type EditDecisionType = "approve" | "decline";

export type DecideEditError =
  | { code: "invalid"; fields: string[] }
  | { code: "not_found" }
  | { code: "not_allowed" }
  | { code: "already_decided" }
  | { code: "move_needs_vp" }
  | EditError;

export type DecideEditResult =
  | {
      ok: true;
      decision: EditDecisionType;
      number: number | null;
      // The public cache tags to refresh once the transaction has committed.
      refresh: string[];
    }
  | { ok: false; error: DecideEditError };

const fail = (error: DecideEditError): DecideEditResult => ({ ok: false, error });

function isBoardCode(value: string): value is BoardCode {
  return (BOARD_CODES as string[]).includes(value);
}

export async function decideEdit(
  store: EditReviewStore,
  session: Session,
  type: EditDecisionType,
  raw: unknown,
  now: Date,
): Promise<DecideEditResult> {
  const parsed =
    type === "approve" ? approveEditInputSchema.safeParse(raw) : declineEditInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? "form")))];
    return fail({ code: "invalid", fields });
  }
  const data: { ideaId: string; reason?: string } = parsed.data;
  const { ideaId } = data;
  const reason = data.reason ?? "";

  const target = await store.find(ideaId);
  if (!target) return fail({ code: "not_found" });
  // Boards are seeded and never invented, so an unknown code is a bad row: fail closed.
  if (!isBoardCode(target.boardId) || !can(session, "review", target.boardId)) {
    return fail({ code: "not_allowed" });
  }

  const actorId = session.user.id;
  const result = applyEditEvent(
    {
      reviewStatus: target.reviewStatus,
      authorId: target.authorId,
      editPending: target.editSubmittedAt !== null,
    },
    type === "approve" ? { type: "approve_edit", actorId } : { type: "decline_edit", actorId, reason },
  );
  if (!result.ok) return fail(result.error);
  // approve_edit and decline_edit always write a review row.
  if (!result.review) throw new Error(`The ${type} edit event produced no review row`);
  // A marker with no revision behind it has nothing to decide: fails closed.
  const { edit, editSubmittedAt } = target;
  if (!edit || editSubmittedAt === null) return fail({ code: "no_pending_edit" });

  let patch: EditIdeaPatch = { editSubmittedAt: null };
  let update: { body: string } | null = null;
  if (type === "approve") {
    const boardAfter = boardAfterEdit({ category: target.category, boardId: target.boardId }, edit.category);
    if (!mayApproveEdit(session, target.boardId, boardAfter)) return fail({ code: "move_needs_vp" });
    patch = { ...editFieldsOf(edit), boardId: boardAfter, editSubmittedAt: null };
    update = { body: editedUpdateBody(boardAfter === target.boardId ? null : boardAfter) };
  }

  const recorded = await store.record({
    ideaId: target.id,
    editSubmittedAt,
    patch,
    review: { ...result.review, revisionId: edit.id, reviewerId: actorId, decidedAt: now },
    reviewer: { id: actorId, email: session.user.email, displayName: session.user.name },
    update,
  });
  if (!recorded) return fail({ code: "already_decided" });

  // Only an approval changes what the public sees. A decline leaves the approved version
  // as it was, so it touches no cached page.
  return {
    ok: true,
    decision: type,
    number: target.number,
    refresh: type === "approve" && target.number !== null ? [IDEAS_TAG, ideaTag(target.number)] : [],
  };
}
