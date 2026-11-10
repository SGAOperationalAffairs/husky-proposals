import { windowStart } from "@/core/actionLimit";
import type { PrismaClient } from "@/generated/prisma/client";

// Counts one student action in the student's current minute and returns the minute's
// count (#94). Support calls it now; participate (#95) and follow (#101) call it too,
// inside their own write transactions, so every change shares one limit. Works with a
// client or a transaction client, as postStore does.
type Db = Pick<PrismaClient, "actionCount">;

export async function bumpActionCount(db: Db, userId: string, now: Date): Promise<number> {
  const start = windowStart(now);
  // A unique-only where with a plain increment makes Prisma use ON CONFLICT, so
  // concurrent taps cannot lose a bump or raise a unique error.
  const row = await db.actionCount.upsert({
    where: { userId_windowStart: { userId, windowStart: start } },
    create: { userId, windowStart: start, count: 1 },
    update: { count: { increment: 1 } },
    select: { count: true },
  });
  // Trim as we go: only the current minute's row is ever read.
  await db.actionCount.deleteMany({ where: { userId, windowStart: { lt: start } } });
  return row.count;
}
