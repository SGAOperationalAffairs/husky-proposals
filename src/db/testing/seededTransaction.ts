import { withRollback } from "./database";
import { seed } from "../seed";
import type { Prisma } from "@/generated/prisma/client";

// A transaction with the seed written inside it, rolled back at the end (#44). Tests
// that read or change the seeded world use this, so nothing persists on the branch.
export function withSeed<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return withRollback(async (tx) => {
    await seed(tx, { now: new Date() });
    return fn(tx);
  });
}
