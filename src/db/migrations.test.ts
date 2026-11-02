import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The migrations (#44) are the database's source of truth. Two checks that run
// without a database: the idea_stats view in the migration matches its source file,
// and the four check constraints are present. Migrations are never edited once
// committed, so a view change is a new migration plus an edit to the source file.

const MIGRATIONS = join(process.cwd(), "prisma/migrations");
const VIEW_SOURCE = join(process.cwd(), "prisma/views/public/idea_stats.sql");

// Comments and whitespace do not count; the SQL does.
function normalize(sql: string): string {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

// From CREATE VIEW to the statement's end.
function viewBody(sql: string): string | undefined {
  const start = sql.indexOf("CREATE VIEW idea_stats AS");
  if (start === -1) return undefined;
  const end = sql.indexOf(";", start);
  return normalize(sql.slice(start, end + 1));
}

function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(MIGRATIONS, entry.name, "migration.sql"))
    .sort();
}

describe("idea_stats migration (#44)", () => {
  it("creates the view in exactly one migration, matching the source file", () => {
    const withView = migrationFiles().filter((file) => viewBody(readFileSync(file, "utf8")) !== undefined);
    expect(withView).toHaveLength(1);
    const latest = withView[0]!;
    expect(viewBody(readFileSync(latest, "utf8"))).toBe(viewBody(readFileSync(VIEW_SOURCE, "utf8")));
  });

  it("the init migration does not create the view, since Prisma cannot express it", () => {
    const init = migrationFiles().find((file) => file.includes("_init/"));
    expect(init).toBeDefined();
    expect(readFileSync(init!, "utf8")).not.toMatch(/idea_stats/);
  });

  it("the view source file says it is a source, not a draft", () => {
    expect(readFileSync(VIEW_SOURCE, "utf8")).not.toMatch(/Draft/);
  });
});

describe("check constraints (#44)", () => {
  const names = [
    "ideas_status_only_when_approved",
    "ideas_waiting_needs_reason",
    "reviews_take_down_is_decline",
    "reviews_decline_needs_reason",
  ];

  it("each of the four constraints is added by a migration", () => {
    const all = migrationFiles()
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    for (const name of names) {
      expect(all).toContain(`ADD CONSTRAINT ${name}`);
    }
  });
});
