// The review state machine (#50). Plain TypeScript: it says what the next
// status is and what row to write, and the caller writes it. It never throws.
// Whether the actor may review this board at all is permissions (#52); this
// module only enforces the rules about the post itself.

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
