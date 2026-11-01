import { afterAll, describe } from "vitest";
import { env } from "@/env";
import { createPrismaClient } from "@/db/client";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

// Database tests run against the Neon test branch and never commit (#43).
// Without DATABASE_URL they skip (vitest.config.ts prints why); CI refuses to skip.
export function hasTestDatabase(): boolean {
  return Boolean(env().DATABASE_URL);
}

export function describeWithDatabase(name: string, fn: () => void): void {
  describe.skipIf(!hasTestDatabase())(name, fn);
}

let client: PrismaClient | undefined;

// One client per test file, disconnected when the file's tests finish.
export function getTestClient(): PrismaClient {
  if (!client) {
    const url = env().DATABASE_URL;
    if (!url)
      throw new Error("getTestClient() needs DATABASE_URL. Wrap the tests in describeWithDatabase().");
    client = createPrismaClient(url);
    afterAll(async () => {
      await client?.$disconnect();
      client = undefined;
    });
  }
  return client;
}

// Thrown on purpose to roll the transaction back. Private, so no real error can match it.
class Rollback extends Error {}

// Runs fn inside a transaction that is always rolled back, so tests share the
// branch without seeing each other's rows. The long timeouts cover Neon cold starts.
export async function withRollback<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  let result: { value: T } | undefined;
  try {
    await getTestClient().$transaction(
      async (tx) => {
        result = { value: await fn(tx) };
        throw new Rollback();
      },
      { timeout: 15_000, maxWait: 15_000 },
    );
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  }
  if (!result) throw new Error("withRollback finished without a result");
  return result.value;
}
