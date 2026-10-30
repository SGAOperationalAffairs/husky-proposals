import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";

const pingRows = z.array(z.object({ ok: z.literal(1) })).length(1);

// The first raw query, and the pattern for the rest: tagged $queryRaw, result
// parsed with zod (#43). Takes a client or a transaction. E10 monitoring can reuse it.
export async function ping(db: Pick<Prisma.TransactionClient, "$queryRaw">): Promise<boolean> {
  pingRows.parse(await db.$queryRaw`select 1 as ok`);
  return true;
}
