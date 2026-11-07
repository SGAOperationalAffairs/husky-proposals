import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";

// A row past this many attempts stays unsent with its lastError: never dropped, never
// retried, there for a human to read (#101).
export const MAX_ATTEMPTS = 5;

const claimedRow = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  type: z.string(),
  // Validated by the renderer for the row's type, not here.
  payload: z.unknown(),
  attempts: z.number().int(),
});

export type ClaimedOutboxRow = z.infer<typeof claimedRow>;

type Args = { now: Date; limit: number; lockFor: number };

// Claims up to `limit` due, unsent, unlocked rows: highest priority first, then oldest.
// One statement that commits by itself, so no lock is held while the provider is called.
// FOR UPDATE SKIP LOCKED lets two workers claim different rows at once, and locked_until
// is what makes a crashed worker's claim expire. `lockFor` is milliseconds. Times go in
// as ISO text cast to timestamp: the columns are timestamp(3), written in UTC by Prisma.
export async function claimOutboxBatch(
  db: Pick<Prisma.TransactionClient, "$queryRaw">,
  { now, limit, lockFor }: Args,
): Promise<ClaimedOutboxRow[]> {
  const nowText = now.toISOString();
  const lockedUntil = new Date(now.getTime() + lockFor).toISOString();
  const rows = await db.$queryRaw`
    update email_outbox
    set locked_until = ${lockedUntil}::timestamp, attempts = attempts + 1
    where id in (
      select id from email_outbox
      where sent_at is null
        and send_after <= ${nowText}::timestamp
        and (locked_until is null or locked_until < ${nowText}::timestamp)
        and attempts < ${MAX_ATTEMPTS}::int
      order by priority asc, created_at asc
      limit ${limit}::int
      for update skip locked
    )
    returning id, user_id as "userId", type::text as type, payload, attempts, priority, created_at
  `;
  // The claim's order is not the update's: return rows in the order they were due.
  return z
    .array(claimedRow.extend({ priority: z.number().int(), created_at: z.date() }))
    .parse(rows)
    .sort((a, b) => a.priority - b.priority || a.created_at.getTime() - b.created_at.getTime())
    .map(({ id, userId, type, payload, attempts }) => ({ id, userId, type, payload, attempts }));
}
