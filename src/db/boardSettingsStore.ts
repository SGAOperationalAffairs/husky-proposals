import type { BoardSettingsStore } from "@/app/_review/changeReviewDueDays";
import type { Prisma } from "@/generated/prisma/client";

// The Prisma store for a board's settings (#58). Boards are seeded and the id is
// already a validated board code, so a missing row throws as unexpected.
export function prismaBoardSettingsStore(db: Pick<Prisma.TransactionClient, "board">): BoardSettingsStore {
  return {
    setReviewDueDays: async (boardId, days) => {
      await db.board.update({ where: { id: boardId }, data: { reviewDueDays: days }, select: { id: true } });
    },
  };
}
