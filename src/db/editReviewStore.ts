import { AlreadyDecidedError } from "@/app/_review/decidePost";
import type { EditReviewStore } from "@/app/_review/decideEdit";
import { decisionKindOf } from "@/email/postDecided";
import { Prisma } from "@/generated/prisma/client";
import { editRevisionSelect } from "./ideaSelects";
import { queueDecisionEmail } from "./outbox";

// The Prisma store for decisions on an edit to an approved post (#295). Always handed a
// transaction client: the idea write, the Review row, the system update, and the author's
// email land together or not at all. Followers and supporters are never emailed
// (queueFollowerEmails is not called).
type Tx = Pick<Prisma.TransactionClient, "idea" | "review" | "update" | "user" | "emailOutbox">;

const targetSelect = {
  id: true,
  boardId: true,
  category: true,
  authorId: true,
  reviewStatus: true,
  number: true,
  editSubmittedAt: true,
  revisions: { select: editRevisionSelect, orderBy: { version: "desc" }, take: 1 },
} as const satisfies Prisma.IdeaSelect;

export function prismaEditReviewStore(tx: Tx): EditReviewStore {
  return {
    find: async (ideaId) => {
      const idea = await tx.idea.findUnique({ where: { id: ideaId }, select: targetSelect });
      if (!idea) return null;
      const { revisions, ...rest } = idea;
      return { ...rest, edit: revisions[0] ?? null };
    },

    record: async ({ ideaId, editSubmittedAt, patch, review, reviewer, update }) => {
      await tx.user.upsert({
        where: { id: reviewer.id },
        create: { id: reviewer.id, email: reviewer.email, displayName: reviewer.displayName },
        update: { email: reviewer.email, displayName: reviewer.displayName },
      });
      // Guarded on the post still being approved with this very edit waiting, so a second
      // reviewer, or a take-down that landed first, writes nothing.
      const moved = await tx.idea.updateMany({
        where: { id: ideaId, reviewStatus: "approved", editSubmittedAt },
        data: patch,
      });
      if (moved.count === 0) return null;
      let row: { id: string };
      try {
        row = await tx.review.create({ data: { ideaId, ...review }, select: { id: true } });
      } catch (error) {
        // The backstop, one decision per edit revision (reviews_revision_id_kind_key). The
        // idea was already updated, so this throws and the transaction rolls back.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new AlreadyDecidedError({ cause: error });
        }
        throw error;
      }
      if (update) {
        await tx.update.create({
          data: { ideaId, kind: "system", body: update.body, authorId: null },
          select: { id: true },
        });
      }
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
