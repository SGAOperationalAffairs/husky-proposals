import type { ParticipationStore } from "@/app/_participate/setParticipation";
import type { PrismaClient } from "@/generated/prisma/client";
import { bumpActionCount } from "./actionLimit";
import { isPublic } from "./ideaSelects";

// The Prisma store for setting "I'll participate" (#95). Works with a client or a transaction
// client, so the bump and the write commit together. It reads no names or emails:
// src/db/peopleStore.ts stays the only place they are read.
type Db = Pick<PrismaClient, "user" | "idea" | "participation" | "actionCount">;

export function prismaParticipationStore(db: Db): ParticipationStore {
  return {
    find: async (number) => {
      const idea = await db.idea.findFirst({
        where: { number, ...isPublic, status: { not: null } },
        select: { id: true, number: true, reviewStatus: true, status: true },
      });
      // An approved idea has both; the checks narrow the nullable columns' types.
      return idea && idea.number !== null && idea.status !== null
        ? { ...idea, number: idea.number, status: idea.status }
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
    set: async (userId, ideaId, participating) => {
      // createMany with skipDuplicates, never an upsert: a repeat tap must keep the contactStatus and
      // contactedAt a leader set. Its count says whether this call added the row.
      const { count } = participating
        ? await db.participation.createMany({ data: [{ userId, ideaId }], skipDuplicates: true })
        : await db.participation.deleteMany({ where: { userId, ideaId } });
      return count > 0;
    },
  };
}
