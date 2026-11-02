import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { RUN_DATABASE_PATTERN, type RunRegistry } from "@/db/testing/runDatabase";

type Admin = Pick<Prisma.TransactionClient, "$executeRaw" | "$queryRaw">;

function assertRunName(name: string): void {
  if (!RUN_DATABASE_PATTERN.test(name)) {
    throw new Error(
      `Refusing to touch database "${name}": it does not look like a test run database (issue 104).`,
    );
  }
}

// Identifiers cannot be bound parameters. The pattern allows only [a-z0-9_],
// so quoting the name is safe.
export async function createDatabase(db: Admin, name: string, registry: RunRegistry): Promise<void> {
  assertRunName(name);
  await db.$executeRaw`CREATE DATABASE ${Prisma.raw(`"${name}"`)}`;
  registry.add(name);
}

// Only a database this run created. Nothing lists or sweeps others, so a
// cancelled run's leftover is never touched by the next one (issue 104).
export async function dropDatabase(db: Admin, name: string, registry: RunRegistry): Promise<void> {
  assertRunName(name);
  if (!registry.has(name)) {
    throw new Error(`Refusing to drop database "${name}": this run did not create it (issue 104).`);
  }
  await db.$executeRaw`DROP DATABASE IF EXISTS ${Prisma.raw(`"${name}"`)} WITH (FORCE)`;
}

const currentDatabaseRows = z.array(z.object({ name: z.string() })).length(1);

export async function currentDatabase(db: Admin): Promise<string> {
  const rows = currentDatabaseRows.parse(await db.$queryRaw`select current_database() as name`);
  return rows[0]!.name;
}
