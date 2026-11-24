import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";

const countRows = z.array(z.object({ waiting: z.number() })).length(1);

// How many sessions are waiting for an advisory lock right now. Test support (#257): a
// race test needs to know the second transaction is really blocked on the lock before it
// lets the first one go, and raw SQL may only live in this folder. The app never calls it.
export async function advisoryLockWaiters(db: Pick<Prisma.TransactionClient, "$queryRaw">): Promise<number> {
  const rows = countRows.parse(
    await db.$queryRaw`select count(*)::int as waiting from pg_locks where locktype = 'advisory' and not granted`,
  );
  return rows[0]?.waiting ?? 0;
}
