import type { BoardCode } from "@/core/boards";
import { boardsFor, type Viewer } from "@/core/permissions";
import { boardAfterEdit, editFieldsOf, mayApproveEdit, type EditFields } from "@/core/postEdit";
import { reviewDueAt } from "@/core/review";
import { ideaForViewer, type LeaderIdea } from "@/core/viewerShapes";
import type { Prisma } from "@/generated/prisma/client";
import {
  awaitingEditReview,
  awaitingReview,
  editQueueSelect,
  isPublic,
  reviewQueueSelect,
} from "./ideaSelects";

// The review queue (#58): pending posts, and edits to approved posts (#295), on the
// boards the viewer may review, oldest first. The scope comes from permissions, never
// from a row field.
type Db = Pick<Prisma.TransactionClient, "idea">;

// An edit row's extra data: the approved words to diff against, the board the edit lands
// on, and whether this viewer may approve it (a board move needs the VP).
export type QueueEditData = {
  revisionId: string;
  approved: EditFields;
  boardAfter: BoardCode;
  mayApprove: boolean;
};

// For an edit, `idea` carries the pending version's words (title, text, anonymity) on the
// idea's current board, and `sentAt` is when the edit was sent.
export type ReviewQueueItemData = {
  idea: LeaderIdea;
  dueAt: Date;
  sentAt: Date;
  edit: QueueEditData | null;
};

export async function reviewQueue(db: Db, viewer: Viewer): Promise<ReviewQueueItemData[]> {
  const boards = boardsFor(viewer, "review");
  // A student or visitor has no board to review: no query at all.
  if (boards.length === 0) return [];

  const [posts, edits] = await Promise.all([
    db.idea.findMany({
      where: awaitingReview(boards),
      select: reviewQueueSelect,
      // Matches the [reviewStatus, boardId, submittedAt] index; the id breaks ties.
      orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
    }),
    db.idea.findMany({
      where: awaitingEditReview(boards),
      select: editQueueSelect,
      orderBy: [{ editSubmittedAt: "asc" }, { id: "asc" }],
    }),
  ]);

  const items: ReviewQueueItemData[] = [];
  for (const row of posts) {
    // Prisma types the board id as a string; boards are seeded with the five codes.
    const view = ideaForViewer(viewer, { ...row, boardId: row.boardId as BoardCode });
    if (view?.shape !== "leader") continue;
    items.push({
      idea: view.idea,
      dueAt: reviewDueAt(row.submittedAt, row.board.reviewDueDays),
      sentAt: row.submittedAt,
      edit: null,
    });
  }
  for (const row of edits) {
    const revision = row.revisions[0];
    // A marker with no revision behind it has nothing to review: skipped, failing closed.
    if (!row.editSubmittedAt || !revision) continue;
    const boardId = row.boardId as BoardCode;
    const approved = editFieldsOf(row);
    // The row shows the edit's words on the current board, so who may see the author
    // follows the pending version's anonymity.
    const view = ideaForViewer(viewer, { ...row, ...editFieldsOf(revision), boardId });
    if (view?.shape !== "leader") continue;
    const boardAfter = boardAfterEdit({ category: row.category, boardId }, revision.category);
    items.push({
      idea: view.idea,
      dueAt: reviewDueAt(row.editSubmittedAt, row.board.reviewDueDays),
      sentAt: row.editSubmittedAt,
      edit: {
        revisionId: revision.id,
        approved,
        boardAfter,
        mayApprove: mayApproveEdit(viewer, boardId, boardAfter),
      },
    });
  }
  // Oldest sent first, across posts and edits. The sort is stable, so ties keep their order.
  return items.sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
}

export type ApprovedItemData = { idea: LeaderIdea };

// Ideas approved on the viewer's boards since `since`, newest first, so a leader can
// take one down from the queue (#59). Scope is the review boards, never a row field.
export async function recentlyApproved(db: Db, viewer: Viewer, since: Date): Promise<ApprovedItemData[]> {
  const boards = boardsFor(viewer, "review");
  if (boards.length === 0) return [];

  const rows = await db.idea.findMany({
    where: { ...isPublic, boardId: { in: boards }, approvedAt: { gte: since } },
    select: reviewQueueSelect,
    orderBy: [{ approvedAt: "desc" }, { id: "asc" }],
    take: 50,
  });

  const items: ApprovedItemData[] = [];
  for (const row of rows) {
    const view = ideaForViewer(viewer, { ...row, boardId: row.boardId as BoardCode });
    if (view?.shape !== "leader") continue;
    items.push({ idea: view.idea });
  }
  return items;
}

// The red number on the queue tab: pending posts and waiting edits, in one query.
export async function reviewQueueCount(db: Db, viewer: Viewer): Promise<number> {
  const boards = boardsFor(viewer, "review");
  if (boards.length === 0) return 0;
  return db.idea.count({ where: { OR: [awaitingReview(boards), awaitingEditReview(boards)] } });
}
