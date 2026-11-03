import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";

// The advisory lock key that serializes public number assignment (#58). Any fixed
// number works, as long as nothing else in the app takes the same one.
export const IDEA_NUMBER_LOCK = 58_001;

const lockRows = z.array(z.object({ locked: z.literal(true) })).length(1);

// Takes a transaction-scoped lock, released when the transaction ends. Approvals
// take it before reading the highest number, so two approvals cannot read the same
// maximum. It runs as its own statement, ahead of the max read: under read committed
// a lock taken inside the same statement would not see a number another transaction
// had just committed. Needs a transaction client, since the lock lives as long as
// the transaction does.
export async function lockIdeaNumbers(tx: Pick<Prisma.TransactionClient, "$queryRaw">): Promise<void> {
  lockRows.parse(
    await tx.$queryRaw`select true as locked from (select pg_advisory_xact_lock(${IDEA_NUMBER_LOCK}::bigint)) as l`,
  );
}
