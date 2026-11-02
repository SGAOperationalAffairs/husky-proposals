import { afterAll, describe, inject } from "vitest";
import { createPrismaClient } from "@/db/client";
import { assertSafeDatabaseTarget } from "@/db/safeTarget";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

// Database tests run in one database per run, created, migrated, and dropped by
// globalSetup.ts (issue 104), and never commit. Without TEST_DATABASE_URL they skip
// (vitest.config.ts prints why); the CI database job refuses to skip.
export function hasTestDatabase(): boolean {
  return Boolean(inject("testDatabaseUrl"));
}

export function describeWithDatabase(name: string, fn: () => void): void {
  describe.skipIf(!hasTestDatabase())(name, fn);
}

let client: PrismaClient | undefined;
let adminClient: PrismaClient | undefined;

// The guard runs again here, before any connection, in case a test file is ever
// run without the globalSetup that checked the same host.
function connect(url: string | undefined, what: string): PrismaClient {
  if (!url) throw new Error(`${what} needs TEST_DATABASE_URL. Wrap the tests in describeWithDatabase().`);
  assertSafeDatabaseTarget(url, inject("testDatabaseAllowedHosts"));
  return createPrismaClient(url);
}

// One client per test file, disconnected when the file's tests finish.
export function getTestClient(): PrismaClient {
  if (!client) {
    client = connect(inject("testDatabaseUrl"), "getTestClient()");
    afterAll(async () => {
      await client?.$disconnect();
      client = undefined;
    });
  }
  return client;
}

// The server-level connection, for the admin SQL test only. Same lifetime as getTestClient().
export function getAdminClient(): PrismaClient {
  if (!adminClient) {
    adminClient = connect(inject("testDatabaseAdminUrl"), "getAdminClient()");
    afterAll(async () => {
      await adminClient?.$disconnect();
      adminClient = undefined;
    });
  }
  return adminClient;
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
