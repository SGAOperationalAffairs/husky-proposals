import { readdirSync } from "node:fs";
import { basename, join } from "node:path";

// Every database a test run creates matches this, and the 63-byte Postgres
// limit holds (issue 104). Nothing else is ever created or dropped by the harness.
export const RUN_DATABASE_PATTERN = /^hp_test_[a-z0-9_]{1,55}$/;

type RunDatabaseInput =
  { ci: true; runId: string; attempt: string } | { ci: false; cwd: string; random: string };

// CI: one database per workflow run attempt. Local: one per worktree and run,
// so two worktrees running at once never share data.
export function runDatabaseName(input: RunDatabaseInput): string {
  if (input.ci) return `hp_test_ci_${slug(input.runId)}_${slug(input.attempt)}`;
  return `hp_test_${slug(basename(input.cwd)).slice(0, 24)}_${slug(input.random)}`;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "_");
}

// Same URL, only the database (the path) replaced. User, password, host, and query stay.
export function withDatabaseName(url: string, name: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${name}`;
  return parsed.toString();
}

// The names this run created, and only those. dropDatabase refuses any other,
// so a bug can never drop a database the run did not make.
export interface RunRegistry {
  add(name: string): void;
  has(name: string): boolean;
}

export function createRunRegistry(): RunRegistry {
  const names = new Set<string>();
  return {
    add: (name) => void names.add(name),
    has: (name) => names.has(name),
  };
}

// True when prisma/migrations has at least one migration folder.
export function hasMigrations(migrationsDir: string): boolean {
  try {
    return readdirSync(migrationsDir, { withFileTypes: true }).some(
      (entry) =>
        entry.isDirectory() && readdirSync(join(migrationsDir, entry.name)).includes("migration.sql"),
    );
  } catch {
    return false;
  }
}
