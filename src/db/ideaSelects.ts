import type { BoardCode } from "@/core/boards";
import type { Prisma } from "@/generated/prisma/client";

// Field lists per viewer shape (#53). Each one is checked against the schema with
// `satisfies Prisma.IdeaSelect`, so a misspelled field fails to compile. The shapes
// in src/core/viewerShapes.ts pick from these rows field by field, so a field here
// still reaches a viewer only if the shape names it.

// The student read. Nothing identifying the author beyond the display name, which
// the shape drops for anonymous posts.
export const studentIdeaSelect = {
  id: true,
  number: true,
  title: true,
  description: true,
  fullText: true,
  category: true,
  boardId: true,
  location: true,
  scale: true,
  costBand: true,
  timeHorizon: true,
  status: true,
  waitingReason: true,
  fromSga: true,
  isAnonymous: true,
  reviewStatus: true,
  submittedAt: true,
  approvedAt: true,
  statusChangedAt: true,
  deliveredAt: true,
  updatedAt: true,
  author: { select: { displayName: true } },
} as const satisfies Prisma.IdeaSelect;

// The author's own post. The author id decides "is this my post"; the latest
// review carries the reviewer's reason, shown only to the author (data model).
export const authorIdeaSelect = {
  ...studentIdeaSelect,
  authorId: true,
  reviews: {
    select: { decision: true, reason: true },
    orderBy: { decidedAt: "desc" },
    take: 1,
  },
} as const satisfies Prisma.IdeaSelect;

// Leaders. The author's identity and the supporters, read only for a viewer whose
// role allows it (viewerShapes decides; this list only reads).
export const leaderIdeaSelect = {
  ...studentIdeaSelect,
  authorId: true,
  author: { select: { id: true, displayName: true, email: true } },
  supports: {
    select: { user: { select: { id: true, displayName: true, email: true } } },
  },
} as const satisfies Prisma.IdeaSelect;

// The review queue (#58): leader fields without the supporters, since a pending post
// has none. The board join brings the due time in the same query, one read per queue.
export const reviewQueueSelect = {
  ...studentIdeaSelect,
  authorId: true,
  author: leaderIdeaSelect.author,
  board: { select: { reviewDueDays: true } },
} as const satisfies Prisma.IdeaSelect;

// Posts waiting for a decision on these boards. Pair it with boardsFor(viewer, "review").
export function awaitingReview(boards: BoardCode[]) {
  return { reviewStatus: "pending", boardId: { in: boards } } satisfies Prisma.IdeaWhereInput;
}

// The public numbers and updates on an approved idea (#60). Counts only: never the
// names behind willingCount, never followerCount, never an update's authorId.
export const publicStatsSelect = {
  supportCount: true,
  willingCount: true,
  rankInBoard: true,
  lastUpdateAt: true,
} as const satisfies Prisma.IdeaStatsSelect;

export const publicUpdateSelect = {
  kind: true,
  body: true,
  createdAt: true,
} as const satisfies Prisma.UpdateSelect;

// Who may see a post with no sign-in. Approved only: pending, declined, and
// withdrawn posts are never public (#49, #53).
export const isPublic = { reviewStatus: "approved" } as const satisfies Prisma.IdeaWhereInput;
