import type { Session } from "@/auth/contract";
import { BOARD_CODES, type BoardCode } from "@/core/boards";
import { IDEAS_TAG, ideaTag } from "@/core/cacheTags";
import { statusOnApproval } from "@/core/ideaStatus";
import { can } from "@/core/permissions";
import {
  applyReviewEvent,
  approveInputSchema,
  reasonInputSchema,
  type ReviewDecision,
  type ReviewError,
  type ReviewKind,
  type ReviewStatus,
} from "@/core/review";
import type { IdeaStatus } from "@/core/statuses";

// Deciding a pending post, or taking an approved one down (#58): the rules, with the
// storage behind an interface. The server action (actions.ts) supplies the Prisma
// store inside one transaction; the tests supply a fake one. Who may review a board
// is permissions (#52) and what the post allows is the state machine (#50); this
// module joins them and builds the write.

export type ReviewTarget = {
  id: string;
  boardId: string;
  authorId: string | null;
  reviewStatus: ReviewStatus;
  number: number | null;
  // The review points at exactly the words the reviewer saw (#49).
  latestRevisionId: string;
};

// The idea columns a decision changes. Approving sets the status the idea starts in;
// a take-down clears it, as "status is null unless approved" requires.
export type IdeaPatch = {
  reviewStatus: "approved" | "declined";
  number?: number;
  approvedAt?: Date;
  status?: IdeaStatus | null;
  waitingReason?: null;
  statusChangedAt?: Date;
};

export type ReviewWrite = {
  ideaId: string;
  // The status the rules read. The write applies only if the post is still in it.
  from: ReviewStatus;
  patch: IdeaPatch;
  review: {
    kind: ReviewKind;
    decision: ReviewDecision;
    reason: string | null;
    revisionId: string;
    reviewerId: string;
    decidedAt: Date;
  };
  // Copied from the session, because the review's reviewer must be a user row.
  reviewer: { id: string; email: string; displayName: string };
};

export type ReviewStore = {
  find(ideaId: string): Promise<ReviewTarget | null>;
  // The next public number: the highest plus one, under a lock (see lockIdeaNumbers).
  nextNumber(): Promise<number>;
  // Null when the post is no longer in `from`: someone else decided it first.
  record(write: ReviewWrite): Promise<{ reviewId: string } | null>;
};

export type DecisionType = "approve" | "decline" | "take_down";

export type DecideError =
  | { code: "invalid"; fields: string[] }
  | { code: "not_found" }
  | { code: "not_allowed" }
  | { code: "already_decided" }
  | ReviewError;

export type DecideResult =
  | {
      ok: true;
      reviewStatus: ReviewStatus;
      number: number | null;
      // The public cache tags to refresh once the transaction has committed.
      refresh: string[];
    }
  | { ok: false; error: DecideError };

const fail = (error: DecideError): DecideResult => ({ ok: false, error });

function isBoardCode(value: string): value is BoardCode {
  return (BOARD_CODES as string[]).includes(value);
}

export async function decidePost(
  store: ReviewStore,
  session: Session,
  type: DecisionType,
  raw: unknown,
  now: Date,
): Promise<DecideResult> {
  const input = parseInput(type, raw);
  if (!input.ok) return fail({ code: "invalid", fields: input.fields });

  const target = await store.find(input.ideaId);
  if (!target) return fail({ code: "not_found" });
  // Boards are seeded and never invented, so an unknown code is a bad row: fail closed.
  if (!isBoardCode(target.boardId) || !can(session, "review", target.boardId)) {
    return fail({ code: "not_allowed" });
  }

  const actorId = session.user.id;
  const result = applyReviewEvent(
    { reviewStatus: target.reviewStatus, authorId: target.authorId },
    type === "approve" ? { type, actorId } : { type, actorId, reason: input.reason },
  );
  if (!result.ok) return fail(result.error);
  // approve, decline, and take_down always write a review row.
  if (!result.review) throw new Error(`The ${type} event produced no review row`);

  let number = target.number;
  let patch: IdeaPatch;
  if (type === "approve") {
    // A taken-down idea approved again keeps its number, so links to it still work.
    number = target.number ?? (await store.nextNumber());
    // approvedAt is reset on every approval, so "Newest" places a re-approved idea
    // by when it came back (#58).
    patch = { reviewStatus: "approved", number, approvedAt: now, ...statusOnApproval(now) };
  } else if (result.clearIdeaStatus) {
    patch = { reviewStatus: "declined", status: null, waitingReason: null };
  } else {
    patch = { reviewStatus: "declined" };
  }

  const recorded = await store.record({
    ideaId: target.id,
    from: target.reviewStatus,
    patch,
    review: {
      ...result.review,
      revisionId: target.latestRevisionId,
      reviewerId: actorId,
      decidedAt: now,
    },
    reviewer: { id: actorId, email: session.user.email, displayName: session.user.name },
  });
  if (!recorded) return fail({ code: "already_decided" });

  // Only a change to what is public needs a refresh: pending and declined posts are
  // never public, so a decline touches no cached page.
  return {
    ok: true,
    reviewStatus: result.reviewStatus,
    number,
    refresh: type !== "decline" && number !== null ? [IDEAS_TAG, ideaTag(number)] : [],
  };
}

// Approve takes only the idea; decline and take-down also take the reason.
function parseInput(
  type: DecisionType,
  raw: unknown,
): { ok: true; ideaId: string; reason: string } | { ok: false; fields: string[] } {
  const parsed = type === "approve" ? approveInputSchema.safeParse(raw) : reasonInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? "form")))];
    return { ok: false, fields };
  }
  const data: { ideaId: string; reason?: string } = parsed.data;
  return { ok: true, ideaId: data.ideaId, reason: data.reason ?? "" };
}
