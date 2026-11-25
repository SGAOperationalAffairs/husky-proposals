import type { BoardCode } from "@/core/boards";
import type { Prisma } from "@/generated/prisma/client";

// Field lists per viewer shape (#53). Each one is checked against the schema with
// `satisfies Prisma.IdeaSelect`, so a misspelled field fails to compile. The shapes
// in src/core/viewerShapes.ts pick from these rows field by field, so a field here
// still reaches a viewer only if the shape names it.

// The student read. Nothing identifying the author: not even the display name, which a
// public read fetches separately and only for non-anonymous posts (publicAuthorNames),
// so an anonymous post's name never leaves the database on a public path (#257).
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
  closedReason: true,
  fromSga: true,
  isAnonymous: true,
  reviewStatus: true,
  submittedAt: true,
  approvedAt: true,
  statusChangedAt: true,
  deliveredAt: true,
  updatedAt: true,
} as const satisfies Prisma.IdeaSelect;

// Posts whose poster's name students may see (#257). The one filter every public name
// read carries, so an anonymous post can never match it.
export const namedPost = { isAnonymous: false } as const satisfies Prisma.IdeaWhereInput;

// The poster's display name for a non-anonymous post, with the idea id to match it back.
// Always read with `namedPost` in the where clause (publicAuthorNames).
export const publicAuthorSelect = {
  id: true,
  author: { select: { displayName: true } },
} as const satisfies Prisma.IdeaSelect;

// The author's own post. The author id decides "is this my post"; the latest
// review carries the reviewer's reason, shown only to the author (data model). Its kind
// says whether a declined post was sent back (#286). It names no reviewer. The author's
// name is read explicitly: ownPost.ts filters on authorId, so the name is the viewer's own.
export const authorIdeaSelect = {
  ...studentIdeaSelect,
  authorId: true,
  author: { select: { displayName: true } },
  reviews: {
    select: { decision: true, kind: true, reason: true },
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

// The leader's idea page (#100): the queue's fields plus the supporters, oldest first.
// One query per page, never one per supporter. viewerShapes still decides whether the
// list reaches the viewer.
export const leaderPageSelect = {
  ...reviewQueueSelect,
  supports: { select: leaderIdeaSelect.supports.select, orderBy: { createdAt: "asc" } },
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

// Who may see a post with no sign-in. Approved only: pending, declined, withdrawn, and
// taken-down posts are never public (#49, #53, #286).
export const isPublic = { reviewStatus: "approved" } as const satisfies Prisma.IdeaWhereInput;

// The public wall: public ideas minus closed ones. A closed idea stays public by its
// link (the idea page reads isPublic alone) but is off the wall (#237).
export const onWall = { ...isPublic, NOT: { status: "closed" } } as const satisfies Prisma.IdeaWhereInput;
