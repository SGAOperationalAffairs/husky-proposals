import type { OwnPostStore } from "@/app/_post/ownPost";
import { Prisma } from "@/generated/prisma/client";

// The Prisma store for an author's resubmit and withdraw (#56). Handed a transaction
// client, so the guarded idea write and the new revision land together or not at all.
type Tx = Pick<Prisma.TransactionClient, "idea" | "ideaRevision">;

const targetSelect = {
  id: true,
  authorId: true,
  reviewStatus: true,
  revisions: { select: { version: true }, orderBy: { version: "desc" }, take: 1 },
} as const satisfies Prisma.IdeaSelect;

export function prismaOwnPostStore(tx: Tx): OwnPostStore {
  return {
    find: async (ideaId) => {
      const idea = await tx.idea.findUnique({ where: { id: ideaId }, select: targetSelect });
      const revision = idea?.revisions[0];
      // A post with no revision has nothing to resubmit: treated as missing, so it fails closed.
      if (!idea || !revision) return null;
      return {
        id: idea.id,
        authorId: idea.authorId,
        reviewStatus: idea.reviewStatus,
        latestVersion: revision.version,
      };
    },

    countPending: (authorId) => tx.idea.count({ where: { authorId, reviewStatus: "pending" } }),

    resubmit: async ({ ideaId, from, patch, revision }) => {
      // Guarded on the status the rules read, so a double submit writes nothing twice.
      const moved = await tx.idea.updateMany({ where: { id: ideaId, reviewStatus: from }, data: patch });
      if (moved.count === 0) return false;
      try {
        await tx.ideaRevision.create({ data: { ideaId, ...revision }, select: { id: true } });
        return true;
      } catch (error) {
        // The backstop: one revision per version (idea_revisions_idea_id_version_key).
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
        throw error;
      }
    },

    withdraw: async ({ ideaId, from }) => {
      const moved = await tx.idea.updateMany({
        where: { id: ideaId, reviewStatus: from },
        data: { reviewStatus: "withdrawn" },
      });
      return moved.count > 0;
    },
  };
}
