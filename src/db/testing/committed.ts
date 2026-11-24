import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { getTestClient } from "./database";

// Rows that really commit, for the few tests that need two real transactions: a race
// between two posts, or a rollback that aborts the transaction (#257). Every other
// database test uses withRollback and never commits. Rows built here use ids from a range
// the seed and the factories never reach (testUuid(9300) and up), and `finally` deletes
// them whether the test passed or not. Database test files run serially
// (`fileParallelism: false`), so a committed row is never seen by another test file.
export async function withCommittedRows<T>(
  rows: {
    users: Prisma.UserUncheckedCreateInput[];
    ideas?: Prisma.IdeaUncheckedCreateInput[];
  },
  fn: (client: PrismaClient) => Promise<T>,
): Promise<T> {
  const client = getTestClient();
  const userIds = rows.users.map((user) => user.id).filter((id): id is string => id !== undefined);
  try {
    await client.user.createMany({ data: rows.users });
    if (rows.ideas?.length) await client.idea.createMany({ data: rows.ideas });
    return await fn(client);
  } finally {
    // Revisions, reviews, and outbox rows cascade from the idea or the user. Ideas go
    // first: their author link is not a cascade from the user.
    await client.idea.deleteMany({ where: { authorId: { in: userIds } } });
    await client.user.deleteMany({ where: { id: { in: userIds } } });
  }
}
