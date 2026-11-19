import type { UpdateStore } from "@/app/_updates/postUpdate";
import type { Prisma } from "@/generated/prisma/client";
import { isPublic } from "./ideaSelects";
import { queueFollowerEmails } from "./outbox";

// The Prisma store for board updates and check-ins (#130). Always handed a transaction
// client: the update, the leader's user row, and any follower email rows land together or
// not at all.
type Tx = Pick<Prisma.TransactionClient, "idea" | "user" | "update" | "emailOutbox">;

export function prismaUpdateStore(tx: Tx): UpdateStore {
  return {
    find: async (ideaId) => {
      return tx.idea.findFirst({
        where: { id: ideaId, ...isPublic },
        select: { id: true, number: true, boardId: true, reviewStatus: true, status: true },
      });
    },

    // Copied from the session so the update's author has a user row to point at, as the
    // follow store does.
    ensureUser: async (user) => {
      await tx.user.upsert({
        where: { id: user.id },
        create: { id: user.id, email: user.email, displayName: user.displayName },
        update: { email: user.email, displayName: user.displayName },
      });
    },

    record: async ({ ideaId, kind, body, authorId, now, notify }) => {
      const row = await tx.update.create({
        data: { ideaId, kind, body, authorId, createdAt: now },
        select: { id: true },
      });
      // A check-in queues nothing, and this never queues the author's status email: an
      // update is not a status change.
      if (notify) await queueFollowerEmails(tx, { kind: "update", ideaId, updateId: row.id, body });
      return { updateId: row.id };
    },
  };
}
