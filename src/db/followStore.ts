import type { FollowStore } from "@/app/_follow/setFollow";
import type { PrismaClient } from "@/generated/prisma/client";
import { bumpActionCount } from "./actionLimit";
import { isPublic } from "./ideaSelects";

// The Prisma store for following (#101). Works with a client or a transaction client,
// so the bump and the write commit together (#255), as supportStore does.
type Db = Pick<PrismaClient, "idea" | "user" | "follow" | "actionCount">;

export function prismaFollowStore(db: Db): FollowStore {
  return {
    findPublicIdea: async (ideaId) => {
      const idea = await db.idea.findFirst({
        where: { id: ideaId, ...isPublic, status: { not: null } },
        select: { id: true, reviewStatus: true, status: true },
      });
      // An approved idea has a status; the check narrows the nullable column's type.
      return idea && idea.status !== null ? { ...idea, status: idea.status } : null;
    },

    ensureUser: async (user) => {
      // Copied from the session so the follow and the counter have a user row to point at.
      await db.user.upsert({
        where: { id: user.id },
        create: { id: user.id, email: user.email, displayName: user.displayName },
        update: { email: user.email, displayName: user.displayName },
      });
    },

    bump: (userId, now) => bumpActionCount(db, userId, now),

    // skipDuplicates: a double tap writes one row, never an error.
    follow: async (userId, ideaId) => {
      await db.follow.createMany({ data: [{ userId, ideaId }], skipDuplicates: true });
    },

    // deleteMany, so unfollowing when there is no row is fine.
    unfollow: async (userId, ideaId) => {
      await db.follow.deleteMany({ where: { userId, ideaId } });
    },
  };
}
