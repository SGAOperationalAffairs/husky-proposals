import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createRunRegistry,
  hasMigrations,
  RUN_DATABASE_PATTERN,
  runDatabaseName,
  withDatabaseName,
} from "./runDatabase";

describe("run database names (#104)", () => {
  it("names a CI database after the workflow run and attempt", () => {
    expect(runDatabaseName({ ci: true, runId: "123456", attempt: "2" })).toBe("hp_test_ci_123456_2");
  });

  it("names a local database after the worktree and a random suffix", () => {
    const name = runDatabaseName({ ci: false, cwd: "/work/.claude/worktrees/impl-104", random: "a1b2c3d4" });
    expect(name).toBe("hp_test_impl_104_a1b2c3d4");
  });

  it("cuts a long worktree name and still matches the pattern", () => {
    const name = runDatabaseName({
      ci: false,
      cwd: "/work/A-Very-Long-Worktree-Directory-Name-That-Goes-On-And-On",
      random: "a1b2c3d4",
    });
    expect(name).toBe("hp_test_a_very_long_worktree_dir_a1b2c3d4");
    expect(name.length).toBeLessThanOrEqual(63);
  });

  it("always matches the pattern", () => {
    for (const name of [
      runDatabaseName({ ci: true, runId: "9", attempt: "1" }),
      runDatabaseName({ ci: false, cwd: "/x/Weird Name!", random: "00ff00ff" }),
    ]) {
      expect(name).toMatch(RUN_DATABASE_PATTERN);
    }
  });

  it("rewrites only the database in a URL", () => {
    const rewritten = withDatabaseName(
      "postgresql://user:pw@host.example.com:5432/neondb?sslmode=require",
      "hp_test_x",
    );
    expect(rewritten).toBe("postgresql://user:pw@host.example.com:5432/hp_test_x?sslmode=require");
  });

  it("registers only the names it was given", () => {
    const registry = createRunRegistry();
    registry.add("hp_test_mine");
    expect(registry.has("hp_test_mine")).toBe(true);
    expect(registry.has("hp_test_foreign")).toBe(false);
  });

  it("sees migrations only when a folder has a migration.sql", () => {
    const dir = mkdtempSync(join(tmpdir(), "migrations-"));
    expect(hasMigrations(dir)).toBe(false);
    expect(hasMigrations(join(dir, "missing"))).toBe(false);
    writeFileSync(join(dir, "migration_lock.toml"), "");
    expect(hasMigrations(dir)).toBe(false);
    mkdirSync(join(dir, "20260101000000_init"));
    writeFileSync(join(dir, "20260101000000_init", "migration.sql"), "");
    expect(hasMigrations(dir)).toBe(true);
  });
});
