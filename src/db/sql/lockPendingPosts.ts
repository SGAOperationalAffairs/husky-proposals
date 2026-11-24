import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";

// The first key of the per-author pending-post lock (#257). The two-int form of
// pg_advisory_xact_lock is a separate key space from IDEA_NUMBER_LOCK's bigint, so the two
// never collide.
export const PENDING_POSTS_LOCK = 54_001;

const lockRows = z.array(z.object({ locked: z.literal(true) })).length(1);

// Takes a transaction-scoped lock for one author, released when the transaction ends.
// A post and a resubmit take it before counting the author's pending posts, so two at once
// cannot both read the count below the limit (#257). It runs as its own statement, ahead of
// the count, for the reason lockIdeaNumbers does. Two authors whose ids hash alike only wait
// for each other, which is harmless. Needs a transaction client.
export async function lockPendingPosts(
  tx: Pick<Prisma.TransactionClient, "$queryRaw">,
  authorId: string,
): Promise<void> {
  lockRows.parse(
    await tx.$queryRaw`select true as locked from (select pg_advisory_xact_lock(${PENDING_POSTS_LOCK}::int, hashtext(${authorId}::text))) as l`,
  );
}
