import { AlreadyDecidedError, type ReviewStore } from "@/app/_review/decidePost";
import { decisionKindOf } from "@/email/postDecided";
import { Prisma } from "@/generated/prisma/client";
import { queueDecisionEmail } from "./outbox";
import { lockIdeaNumbers } from "./sql/lockIdeaNumbers";

// The Prisma store for review decisions (#58). Always handed a transaction client:
// the number lock lives as long as the transaction, and the idea write and the
// Review row must land together or not at all.
type Tx = Pick<Prisma.TransactionClient, "idea" | "review" | "user" | "emailOutbox" | "$queryRaw">;

// Public numbers start at 101, like the prototype's sample ideas.
const FIRST_NUMBER = 101;

const targetSelect = {
  id: true,
  boardId: true,
  authorId: true,
  reviewStatus: true,
  number: true,
  revisions: { select: { id: true }, orderBy: { version: "desc" }, take: 1 },
  // The version that was approved, which differs from the latest while an edit waits (#295).
  reviews: {
    where: { decision: "approved" },
    orderBy: { decidedAt: "desc" },
    take: 1,
    select: { revisionId: true },
  },
} as const satisfies Prisma.IdeaSelect;

export function prismaReviewStore(tx: Tx): ReviewStore {
  return {
    find: async (ideaId) => {
      const idea = await tx.idea.findUnique({ where: { id: ideaId }, select: targetSelect });
      const revision = idea?.revisions[0];
      // A post with no revision has nothing to review: treated as missing, so it fails closed.
      if (!idea || !revision) return null;
      return {
        id: idea.id,
        boardId: idea.boardId,
        authorId: idea.authorId,
        reviewStatus: idea.reviewStatus,
        number: idea.number,
        latestRevisionId: revision.id,
        // A seed row can be approved with no review row: its latest version is the approved one.
        approvedRevisionId: idea.reviews[0]?.revisionId ?? revision.id,
      };
    },

    // Highest plus one under a lock, not a sequence: a sequence would collide with the
    // explicit numbers the seed writes, and leaves gaps when an approval rolls back.
    nextNumber: async () => {
      await lockIdeaNumbers(tx);
      const { _max } = await tx.idea.aggregate({ _max: { number: true } });
      return (_max.number ?? FIRST_NUMBER - 1) + 1;
    },

    record: async ({ ideaId, from, patch, review, reviewer }) => {
      // The reviewer is copied from the session, so the review has a user row to point at.
      await tx.user.upsert({
        where: { id: reviewer.id },
        create: { id: reviewer.id, email: reviewer.email, displayName: reviewer.displayName },
        update: { email: reviewer.email, displayName: reviewer.displayName },
      });
      // Guarded on the status the rules read, so a second reviewer deciding at the
      // same moment writes nothing and records no second review.
      const moved = await tx.idea.updateMany({ where: { id: ideaId, reviewStatus: from }, data: patch });
      if (moved.count === 0) return null;
      let row: { id: string };
      try {
        row = await tx.review.create({ data: { ideaId, ...review }, select: { id: true } });
      } catch (error) {
        // The backstop: one decision and one take-down per revision (reviews_revision_id_kind_key).
        // The idea was already updated above, so this throws instead of returning null: the
        // whole transaction rolls back and the idea is unchanged (#257).
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new AlreadyDecidedError({ cause: error });
        }
        throw error;
      }
      // The author's email, in this transaction, so it commits with the decision and rolls
      // back with it. Nothing is queued above when the guarded update moved nothing or the
      // insert hit the unique backstop (#211).
      await queueDecisionEmail(tx, {
        ideaId,
        reviewId: row.id,
        decision: decisionKindOf(review),
        reason: review.reason,
        decidedAt: review.decidedAt,
      });
      return { reviewId: row.id };
    },
  };
}
