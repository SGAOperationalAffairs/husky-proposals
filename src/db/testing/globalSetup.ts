import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import type { TestProject } from "vitest/node";
import { createPrismaClient } from "@/db/client";
import { createDatabase, dropDatabase } from "@/db/sql/testDatabases";
import { assertSafeDatabaseTarget } from "@/db/safeTarget";
import { testDatabaseEnv } from "@/env";
import { createRunRegistry, hasMigrations, runDatabaseName, withDatabaseName } from "./runDatabase";

declare module "vitest" {
  export interface ProvidedContext {
    testDatabaseUrl: string | undefined;
    testDatabaseAdminUrl: string | undefined;
    testDatabaseName: string | undefined;
    testDatabaseAllowedHosts: string[];
  }
}

// One database per run (issue 104): create it on the target server, migrate it,
// check it against prisma/schema.prisma, hand its URL to the tests, drop it after.
// The host guard runs before every connection, including the Prisma CLI's.
export default async function setup(project: TestProject): Promise<(() => Promise<void>) | undefined> {
  const { TEST_DATABASE_URL: adminUrl, TEST_DATABASE_ALLOWED_HOSTS: allowedHosts, ...ci } = testDatabaseEnv();
  project.provide("testDatabaseAllowedHosts", allowedHosts);
  if (!adminUrl) {
    project.provide("testDatabaseUrl", undefined);
    project.provide("testDatabaseAdminUrl", undefined);
    project.provide("testDatabaseName", undefined);
    return undefined;
  }
  assertSafeDatabaseTarget(adminUrl, allowedHosts);

  const name =
    ci.GITHUB_RUN_ID && ci.GITHUB_RUN_ATTEMPT
      ? runDatabaseName({ ci: true, runId: ci.GITHUB_RUN_ID, attempt: ci.GITHUB_RUN_ATTEMPT })
      : runDatabaseName({ ci: false, cwd: process.cwd(), random: randomBytes(4).toString("hex") });
  const runUrl = withDatabaseName(adminUrl, name);
  assertSafeDatabaseTarget(runUrl, allowedHosts);

  const registry = createRunRegistry();
  const withAdmin = async (fn: (admin: ReturnType<typeof createPrismaClient>) => Promise<void>) => {
    const admin = createPrismaClient(adminUrl);
    try {
      await fn(admin);
    } finally {
      await admin.$disconnect();
    }
  };

  const teardown = async () => {
    try {
      await withAdmin((admin) => dropDatabase(admin, name, registry));
    } catch (error) {
      // Printed, not thrown, so it never hides the real test result.
      console.error(
        `Could not drop test database ${name}: ${error instanceof Error ? error.message : error}`,
      );
    }
  };

  await withAdmin((admin) => createDatabase(admin, name, registry));
  try {
    migrate(runUrl);
    project.provide("testDatabaseUrl", runUrl);
    project.provide("testDatabaseAdminUrl", adminUrl);
    project.provide("testDatabaseName", name);
    console.log(`Database tests run in ${name} (issue 104).`);
  } catch (error) {
    await teardown();
    throw error;
  }
  return teardown;
}

// `prisma.config.ts` reads DIRECT_URL first, so point it at the run database
// and remove DATABASE_URL so nothing else can win.
function migrate(runUrl: string): void {
  const childEnv = { ...process.env, DIRECT_URL: runUrl, DATABASE_URL: undefined };
  const prisma = (...args: string[]) =>
    spawnSync("npx", ["--no-install", "prisma", ...args], { env: childEnv, encoding: "utf8" });

  const deploy = prisma("migrate", "deploy");
  if (deploy.status !== 0) {
    throw new Error(`prisma migrate deploy failed (issue 104):\n${deploy.stdout}${deploy.stderr}`);
  }

  if (!hasMigrations("prisma/migrations")) {
    console.log("No migrations yet: database tests run on an empty database (issue 104).");
    return;
  }
  const diff = prisma(
    "migrate",
    "diff",
    "--from-config-datasource",
    "--to-schema",
    "prisma/schema.prisma",
    "--script",
    "--exit-code",
  );
  if (diff.status === 2) {
    throw new Error(
      `The migrated test database does not match prisma/schema.prisma. Add a migration (issue 104).\n${diff.stdout}`,
    );
  }
  if (diff.status !== 0) {
    throw new Error(`prisma migrate diff failed (issue 104):\n${diff.stdout}${diff.stderr}`);
  }
}
