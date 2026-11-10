// The review state machine (#50). Plain TypeScript: it says what the next
// status is and what row to write, and the caller writes it. It never throws.
// Whether the actor may review this board at all is permissions (#52); this
// module only enforces the rules about the post itself.

import { z } from "zod";
import { BOARD_CODES } from "./boards";

// Mirrors the ReviewStatus enum in prisma/schema.prisma, pinned by a test (#50).
export const REVIEW_STATUSES = ["pending", "approved", "declined", "withdrawn"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

// Mirror the ReviewKind and ReviewDecision enums, pinned by tests (#50).
export const REVIEW_KINDS = ["review", "take_down"] as const;
export type ReviewKind = (typeof REVIEW_KINDS)[number];

export const REVIEW_DECISIONS = ["approved", "declined"] as const;
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

// At most this many posts waiting for review per student (#50).
export const PENDING_LIMIT = 3;

// What a student reads about the limit. The post form shows these now (#132), and the
// refusal of a fourth post (#96) reuses them so the words match.
export function pendingPostsText(count: number): string {
  const noun = count === 1 ? "post" : "posts";
  return `You have ${count} pending ${noun}. Students can have up to ${PENDING_LIMIT}.`;
}

export const PENDING_LIMIT_REASON =
  "You can't post a new idea right now. You can post again once one of your pending posts is reviewed.";

// A pending post is due this many days after it was submitted, set per board by the
// VP or the board's chair or director (#58). The default is pinned to the schema by a
// test; the bounds are backed by a check constraint on boards.review_due_days.
export const REVIEW_DUE_DAYS = { default: 3, min: 1, max: 14 } as const;

// Whole days in milliseconds, no clock read: the caller passes the board's setting.
export function reviewDueAt(submittedAt: Date, dueDays: number): Date {
  return new Date(submittedAt.getTime() + dueDays * 24 * 60 * 60 * 1000);
}

const text = (max: number) => z.string().trim().min(1).max(max);

// Input for the review server actions (#58). The reason is shared by decline and take-down.
export const approveInputSchema = z.object({ ideaId: z.uuid() });
export const reasonInputSchema = z.object({ ideaId: z.uuid(), reason: text(1000) });
// Input for the author's withdraw action (#56).
export const withdrawInputSchema = z.object({ ideaId: z.uuid() });
export const reviewDueDaysInputSchema = z.object({
  boardId: z.enum(BOARD_CODES),
  days: z.int().min(REVIEW_DUE_DAYS.min).max(REVIEW_DUE_DAYS.max),
});

// authorId is null after an account deletion (D14).
export type ReviewPost = { reviewStatus: ReviewStatus; authorId: string | null };

// pendingCount is the author's posts in pending now, counted by the caller.
// Withdrawn posts are never pending, so they never count.
export type ReviewEvent =
  | { type: "approve"; actorId: string }
  | { type: "decline"; actorId: string; reason: string }
  | { type: "take_down"; actorId: string; reason: string }
  | { type: "withdraw"; actorId: string }
  | { type: "resubmit"; actorId: string; pendingCount: number };

type EventType = ReviewEvent["type"];

// The Review row to write.
export type ReviewRecord = { kind: ReviewKind; decision: ReviewDecision; reason: string | null };

export type PendingLimitError = { code: "pending_limit"; limit: number };

export type ReviewError =
  | { code: "invalid_transition"; from: ReviewStatus; event: EventType }
  | { code: "not_editable" }
  | { code: "own_post" }
  | { code: "not_author" }
  | { code: "reason_required" }
  | PendingLimitError;

export type ReviewResult =
  | { ok: true; reviewStatus: ReviewStatus; review: ReviewRecord | null; clearIdeaStatus: boolean }
  | { ok: false; error: ReviewError };

// A Record over every status, so a new status fails to compile.
const TRANSITIONS: Record<ReviewStatus, Partial<Record<EventType, ReviewStatus>>> = {
  pending: { approve: "approved", decline: "declined", withdraw: "withdrawn" },
  declined: { resubmit: "pending", withdraw: "withdrawn" },
  approved: { take_down: "declined" },
  withdrawn: {}, // final (#49)
};

const fail = (error: ReviewError): ReviewResult => ({ ok: false, error });

export function applyReviewEvent(post: ReviewPost, event: ReviewEvent): ReviewResult {
  const next = TRANSITIONS[post.reviewStatus][event.type];
  if (next === undefined) {
    // Approved posts are never edited (data-model gap 5).
    if (post.reviewStatus === "approved" && event.type === "resubmit") return fail({ code: "not_editable" });
    return fail({ code: "invalid_transition", from: post.reviewStatus, event: event.type });
  }

  const isAuthor = post.authorId !== null && event.actorId === post.authorId;

  switch (event.type) {
    case "approve":
    case "decline":
    case "take_down":
      // Nobody decides their own post (data-model gap 7). A null author never matches.
      if (isAuthor) return fail({ code: "own_post" });
      break;
    case "withdraw":
    case "resubmit":
      if (!isAuthor) return fail({ code: "not_author" });
      break;
  }

  let reason: string | null = null;
  if (event.type === "decline" || event.type === "take_down") {
    reason = event.reason.trim();
    if (reason === "") return fail({ code: "reason_required" });
  }

  if (event.type === "resubmit" && event.pendingCount >= PENDING_LIMIT) {
    return fail({ code: "pending_limit", limit: PENDING_LIMIT });
  }

  let review: ReviewRecord | null = null;
  if (event.type === "approve") review = { kind: "review", decision: "approved", reason: null };
  if (event.type === "decline") review = { kind: "review", decision: "declined", reason };
  if (event.type === "take_down") review = { kind: "take_down", decision: "declined", reason };

  // The idea status is null unless approved, so a take-down clears it.
  return { ok: true, reviewStatus: next, review, clearIdeaStatus: event.type === "take_down" };
}

// A brand-new post has no prior state, so it only checks the limit.
export function checkNewPost(pendingCount: number): { ok: true } | { ok: false; error: PendingLimitError } {
  if (pendingCount >= PENDING_LIMIT)
    return { ok: false, error: { code: "pending_limit", limit: PENDING_LIMIT } };
  return { ok: true };
}

// Editing happens only by resubmitting after a decline. A pending post is not
// edited in place, since revisions are one per submission (#50).
export function isEditable(status: ReviewStatus): boolean {
  return status === "declined";
}
