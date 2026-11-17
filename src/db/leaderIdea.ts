import type { BoardCode } from "@/core/boards";
import { boardsFor, can, type Viewer } from "@/core/permissions";
import { ideaForViewer, type LeaderIdea } from "@/core/viewerShapes";
import type { Prisma } from "@/generated/prisma/client";
import { isPublic, reviewQueueSelect } from "./ideaSelects";

// What a leader sees on top of the public idea page (#59): who posted, and whether
// they may take the idea down or change its status. Approved ideas only, so it can never reveal a pending
// or declined post. Never cached: it depends on who is signed in.
type Db = Pick<Prisma.TransactionClient, "idea">;

// `mayManageStatus` unlocks start, hold, and deliver (#98).
export type LeaderIdeaData = { idea: LeaderIdea; mayTakeDown: boolean; mayManageStatus: boolean };

export async function leaderIdeaByNumber(
  db: Db,
  viewer: Viewer,
  number: number,
): Promise<LeaderIdeaData | null> {
  // Nobody here has a leader view of any board: no query at all.
  if (
    boardsFor(viewer, "review").length === 0 &&
    boardsFor(viewer, "see_names").length === 0 &&
    boardsFor(viewer, "manage_status").length === 0
  ) {
    return null;
  }

  const row = await db.idea.findFirst({ where: { ...isPublic, number }, select: reviewQueueSelect });
  if (!row) return null;
  const boardId = row.boardId as BoardCode;
  const view = ideaForViewer(viewer, { ...row, boardId });
  // The student shape means this viewer has nothing extra to see here.
  if (view?.shape !== "leader") return null;
  return {
    idea: view.idea,
    mayTakeDown: can(viewer, "review", boardId),
    mayManageStatus: can(viewer, "manage_status", boardId),
  };
}
