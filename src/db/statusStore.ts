import type { StatusStore } from "@/app/_status/changeIdeaStatus";
import type { Prisma } from "@/generated/prisma/client";
import { isPublic } from "./ideaSelects";
import { queueFollowerEmails } from "./outbox";

// The Prisma store for start, hold, and deliver (#98). Always handed a transaction
// client: the idea write, the system update, and the follower email rows land together
// or not at all.
type Tx = Pick<Prisma.TransactionClient, "idea" | "update" | "emailOutbox">;

const targetSelect = {
  id: true,
  number: true,
  boardId: true,
  reviewStatus: true,
  status: true,
  waitingReason: true,
  scale: true,
  board: { select: { inProgressGuideline: true } },
} as const satisfies Prisma.IdeaSelect;

export function prismaStatusStore(tx: Tx): StatusStore {
  return {
    find: async (ideaId) => {
      const idea = await tx.idea.findUnique({ where: { id: ideaId }, select: targetSelect });
      if (!idea) return null;
      const { board, ...rest } = idea;
      return { ...rest, guideline: board.inProgressGuideline };
    },

    // One query for the board's whole in-progress load, however many ideas it has.
    boardLoad: async (boardId) => {
      const rows = await tx.idea.findMany({
        where: { ...isPublic, boardId, status: "in_progress" },
        select: { scale: true },
      });
      return rows.map((row) => row.scale);
    },

    record: async ({ ideaId, from, patch, update, event }) => {
      // Guarded on the status the rules read, so a second leader changing it at the same
      // moment writes nothing and records no second update.
      const moved = await tx.idea.updateMany({
        where: { id: ideaId, reviewStatus: "approved", status: from },
        data: patch,
      });
      if (moved.count === 0) return null;
      const row = await tx.update.create({
        data: { ideaId, kind: update.kind, body: update.body, authorId: null },
        select: { id: true },
      });
      await queueFollowerEmails(tx, event);
      return { updateId: row.id };
    },
  };
}
