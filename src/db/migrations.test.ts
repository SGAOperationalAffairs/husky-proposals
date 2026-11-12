import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BOARDS, BOARD_CODES } from "@/core/boards";
import { BOARD_POSITIONS } from "@/core/positions";
import { categoryForBoard } from "@/core/postIdea";

// The migrations (#44) are the database's source of truth. Two checks that run
// without a database: the idea_stats view in the migration matches its source file,
// and the five check constraints are present. Migrations are never edited once
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
  // The view is created once, then rebuilt by a later migration when a column type changes
  // (#202). The latest one must match the source file.
  it("the latest migration that creates the view matches the source file", () => {
    const withView = migrationFiles().filter((file) => viewBody(readFileSync(file, "utf8")) !== undefined);
    expect(withView.length).toBeGreaterThanOrEqual(1);
    const latest = withView[withView.length - 1]!;
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

// The migration holds its own copy of the five boards, so a change to the core constants
// without a matching migration (or the reverse) fails here, with no database needed (#219).
describe("board reference rows (#219)", () => {
  const file = migrationFiles().find((path) => path.includes("_board_reference_rows/"));

  it("the migration exists and inserts the boards once, without overwriting", () => {
    expect(file).toBeDefined();
    const sql = normalize(readFileSync(file!, "utf8"));
    expect(sql.match(/INSERT INTO boards/g)).toHaveLength(1);
    expect(sql).toContain("ON CONFLICT DO NOTHING");
  });

  it("its five rows agree with BOARDS, BOARD_POSITIONS, and categoryForBoard", () => {
    expect(file).toBeDefined();
    const sql = normalize(readFileSync(file!, "utf8"));
    for (const code of BOARD_CODES) {
      const tuple = `('${code}', '${BOARDS[code].name}', '${categoryForBoard(code)}', '${BOARD_POSITIONS[code].lead}', '${BOARD_POSITIONS[code].member}')`;
      expect(sql, code).toContain(tuple);
    }
  });
});

describe("check constraints (#44)", () => {
  const names = [
    "ideas_status_only_when_approved",
    "ideas_waiting_needs_reason",
    "reviews_take_down_is_decline",
    "reviews_decline_needs_reason",
    "boards_review_due_days_range",
  ];

  it("each of the five constraints is added by a migration", () => {
    const all = migrationFiles()
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    for (const name of names) {
      expect(all).toContain(`ADD CONSTRAINT ${name}`);
    }
  });
});
