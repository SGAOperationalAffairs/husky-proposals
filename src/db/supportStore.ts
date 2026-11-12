import type { SupportStore } from "@/app/_support/setSupport";
import type { PrismaClient } from "@/generated/prisma/client";
import { appStatus } from "@/core/statuses";
import { bumpActionCount } from "./actionLimit";
import { isPublic } from "./ideaSelects";

// The Prisma store for setting a support (#94). Works with a client or a transaction
// client, so the bump, the trim, and the write can commit together.
type Db = Pick<PrismaClient, "user" | "idea" | "support" | "actionCount">;

export function prismaSupportStore(db: Db): SupportStore {
  return {
    find: async (number) => {
      const idea = await db.idea.findFirst({
        where: { number, ...isPublic, status: { not: null } },
        select: { id: true, number: true, reviewStatus: true, status: true },
      });
      // An approved idea has both; the checks narrow the nullable columns' types.
      return idea && idea.number !== null && idea.status !== null
        ? { ...idea, number: idea.number, status: appStatus(idea.status) }
        : null;
    },
    ensureUser: async (user) => {
      await db.user.upsert({
        where: { id: user.id },
        create: { id: user.id, email: user.email, displayName: user.displayName },
        update: { email: user.email, displayName: user.displayName },
      });
    },
    bump: (userId, now) => bumpActionCount(db, userId, now),
    set: async (userId, ideaId, supported) => {
      // createMany with skipDuplicates is ON CONFLICT DO NOTHING, so racing double taps
      // leave one row, and its count says whether this call added it.
      const { count } = supported
        ? await db.support.createMany({ data: [{ userId, ideaId }], skipDuplicates: true })
        : await db.support.deleteMany({ where: { userId, ideaId } });
      return count > 0;
    },
  };
}
