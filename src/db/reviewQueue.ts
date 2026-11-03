import type { BoardCode } from "@/core/boards";
import { boardsFor, type Viewer } from "@/core/permissions";
import { reviewDueAt } from "@/core/review";
import { ideaForViewer, type LeaderIdea } from "@/core/viewerShapes";
import type { Prisma } from "@/generated/prisma/client";
import { awaitingReview, reviewQueueSelect } from "./ideaSelects";

// The review queue (#58): pending posts on the boards the viewer may review, oldest
// first. The scope comes from permissions, never from a row field.
type Db = Pick<Prisma.TransactionClient, "idea">;

export type ReviewQueueItemData = { idea: LeaderIdea; dueAt: Date };

export async function reviewQueue(db: Db, viewer: Viewer): Promise<ReviewQueueItemData[]> {
  const boards = boardsFor(viewer, "review");
  // A student or visitor has no board to review: no query at all.
  if (boards.length === 0) return [];

  const rows = await db.idea.findMany({
    where: awaitingReview(boards),
    select: reviewQueueSelect,
    // Matches the [reviewStatus, boardId, submittedAt] index; the id breaks ties.
    orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
  });

  const items: ReviewQueueItemData[] = [];
  for (const row of rows) {
    // Prisma types the board id as a string; boards are seeded with the five codes.
    const view = ideaForViewer(viewer, { ...row, boardId: row.boardId as BoardCode });
    if (view?.shape !== "leader") continue;
    items.push({ idea: view.idea, dueAt: reviewDueAt(row.submittedAt, row.board.reviewDueDays) });
  }
  return items;
}

// The red number on the queue tab.
export async function reviewQueueCount(db: Db, viewer: Viewer): Promise<number> {
  const boards = boardsFor(viewer, "review");
  if (boards.length === 0) return 0;
  return db.idea.count({ where: awaitingReview(boards) });
}
