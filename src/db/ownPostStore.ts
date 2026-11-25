import type { OwnPostStore } from "@/app/_post/ownPost";
import { Prisma } from "@/generated/prisma/client";
import { lockPendingPosts } from "./sql/lockPendingPosts";

// The Prisma store for an author's resubmit and withdraw (#56). Handed a transaction
// client, so the guarded idea write and the new revision land together or not at all.
type Tx = Pick<Prisma.TransactionClient, "idea" | "ideaRevision" | "$queryRaw">;

const targetSelect = {
  id: true,
  authorId: true,
  reviewStatus: true,
  editSubmittedAt: true,
  // The words the idea row holds now, to refuse an edit that changes nothing (#295).
  title: true,
  description: true,
  fullText: true,
  category: true,
  location: true,
  scale: true,
  costBand: true,
  timeHorizon: true,
  isAnonymous: true,
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
        editPending: idea.editSubmittedAt !== null,
        approved: {
          title: idea.title,
          description: idea.description,
          fullText: idea.fullText,
          category: idea.category,
          location: idea.location,
          scale: idea.scale,
          costBand: idea.costBand,
          timeHorizon: idea.timeHorizon,
          isAnonymous: idea.isAnonymous,
        },
      };
    },

    lockPendingPosts: (authorId) => lockPendingPosts(tx, authorId),

    countPending: (authorId) => tx.idea.count({ where: { authorId, reviewStatus: "pending" } }),

    resubmit: async ({ ideaId, from, patch, revision }) => {
      // Guarded on the status the rules read, so a double submit writes nothing twice.
      const moved = await tx.idea.updateMany({ where: { id: ideaId, reviewStatus: from }, data: patch });
      if (moved.count === 0) return false;
      // A duplicate version (idea_revisions_idea_id_version_key) is left to throw: the
      // guarded update above already ran, so the whole transaction must roll back (#56).
      await tx.ideaRevision.create({ data: { ideaId, ...revision }, select: { id: true } });
      return true;
    },

    submitEdit: async ({ ideaId, submittedAt, revision }) => {
      // Guarded on "approved with no edit waiting", so a double send, or a take-down that
      // landed first, writes nothing (#295). The idea's own words are not touched.
      const marked = await tx.idea.updateMany({
        where: { id: ideaId, reviewStatus: "approved", editSubmittedAt: null },
        data: { editSubmittedAt: submittedAt },
      });
      if (marked.count === 0) return false;
      // As in resubmit, a duplicate version throws and rolls the whole transaction back.
      await tx.ideaRevision.create({ data: { ideaId, ...revision }, select: { id: true } });
      return true;
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
