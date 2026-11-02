import type { PostStore } from "@/app/_post/submitPost";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

// The Prisma store for posting an idea (#54). Works with a client or a transaction
// client, so the database tests can run it inside a rolled-back transaction. The
// revision is a nested create, which Prisma writes atomically with the idea.
type Db = Pick<PrismaClient, "user" | "idea">;

export function prismaPostStore(db: Db): PostStore {
  return {
    countPending: (authorId) => db.idea.count({ where: { authorId, reviewStatus: "pending" } }),
    create: async (author, post) => {
      // The account is copied from SGAuth at posting, so the post has an author row.
      await db.user.upsert({
        where: { id: author.id },
        create: { id: author.id, email: author.email, displayName: author.displayName },
        update: { email: author.email, displayName: author.displayName },
      });
      const { revision, ...fields } = post;
      const idea = await db.idea.create({
        data: {
          ...fields,
          revisions: { create: revision },
        } satisfies Prisma.IdeaUncheckedCreateInput & { revisions: { create: typeof revision } },
        select: { id: true },
      });
      return { id: idea.id };
    },
  };
}
