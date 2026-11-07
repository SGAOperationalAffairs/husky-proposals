import type { FollowStore } from "@/app/_follow/setFollow";
import type { Prisma } from "@/generated/prisma/client";
import { isPublic } from "./ideaSelects";

// The Prisma store for following (#101).
type Db = Pick<Prisma.TransactionClient, "idea" | "user" | "follow">;

export function prismaFollowStore(db: Db): FollowStore {
  return {
    findPublicIdea: (ideaId) =>
      db.idea.findFirst({ where: { id: ideaId, ...isPublic }, select: { id: true } }),

    follow: async (user, ideaId) => {
      // Copied from the session so the follow has a user row to point at, as reviewStore does.
      await db.user.upsert({
        where: { id: user.id },
        create: { id: user.id, email: user.email, displayName: user.displayName },
        update: { email: user.email, displayName: user.displayName },
      });
      // skipDuplicates: a double tap writes one row, never an error.
      await db.follow.createMany({ data: [{ userId: user.id, ideaId }], skipDuplicates: true });
    },

    // deleteMany, so unfollowing when there is no row is fine.
    unfollow: async (userId, ideaId) => {
      await db.follow.deleteMany({ where: { userId, ideaId } });
    },
  };
}
