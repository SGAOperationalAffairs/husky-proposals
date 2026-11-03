import { afterAll, inject } from "vitest";
import { createPrismaClient } from "@/db/client";
import { assertSafeDatabaseTarget } from "@/db/safeTarget";
import { seed } from "@/db/seed";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

// Counts the queries a read sends (#60), for "a fixed number of queries, not one per
// idea" tests. Like withSeed(), it writes the seed inside a transaction that is always
// rolled back. `queries.count` starts at zero when `fn` starts, and `reset()` zeroes it
// again, for a test that measures two reads in one transaction.
export type QueryCounter = { count: number; reset(): void };

let client: PrismaClient | undefined;
const counter: QueryCounter = {
  count: 0,
  reset() {
    counter.count = 0;
  },
};

// One counting client per test file, with the same guard and lifetime as getTestClient().
function getCountingClient(): PrismaClient {
  if (!client) {
    const url = inject("testDatabaseUrl");
    if (!url)
      throw new Error("withCountedSeed() needs TEST_DATABASE_URL. Wrap the tests in describeWithDatabase().");
    assertSafeDatabaseTarget(url, inject("testDatabaseAllowedHosts"));
    client = createPrismaClient(url, {
      onQuery: () => {
        counter.count += 1;
      },
    });
    afterAll(async () => {
      await client?.$disconnect();
      client = undefined;
    });
  }
  return client;
}

// Thrown on purpose to roll the transaction back. Private, so no real error can match it.
class Rollback extends Error {}

export async function withCountedSeed<T>(
  fn: (tx: Prisma.TransactionClient, queries: QueryCounter) => Promise<T>,
): Promise<T> {
  let result: { value: T } | undefined;
  try {
    await getCountingClient().$transaction(
      async (tx) => {
        await seed(tx, { now: new Date() });
        counter.reset();
        result = { value: await fn(tx, counter) };
        throw new Rollback();
      },
      { timeout: 15_000, maxWait: 15_000 },
    );
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  }
  if (!result) throw new Error("withCountedSeed finished without a result");
  return result.value;
}
