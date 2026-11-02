import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assertSeedable, seedRows } from "./seed";
import { FIXTURE_TIME } from "./testing/factories";

// The seed (#44) writes invented data only. These unit tests check the rules it
// depends on without a database: every @updatedAt column is set, dates move with
// the clock, and the seed refuses any environment but local and test.

const DAY = 24 * 60 * 60 * 1000;

describe("seed rows", () => {
  it("sets every @updatedAt column itself, since the database has no default for it", () => {
    // Read the schema, so a new @updatedAt model fails here until the seed handles it.
    const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");
    const models = [...schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)]
      .filter(([, , body]) => /@updatedAt/.test(body ?? ""))
      .map(([, name]) => name)
      .sort();
    expect(models).toEqual(["Idea", "Participation"]);

    const rows = seedRows(FIXTURE_TIME);
    for (const row of rows.ideas) expect(row.updatedAt).toBeInstanceOf(Date);
    for (const row of rows.participations) expect(row.updatedAt).toBeInstanceOf(Date);
  });

  it("moves every date by the same offset, so relative ages hold on any run", () => {
    const later = new Date(FIXTURE_TIME.getTime() + 10 * DAY);
    const before = seedRows(FIXTURE_TIME);
    const after = seedRows(later);
    const food = (rows: ReturnType<typeof seedRows>) => rows.ideas.find((idea) => idea.number === 103)!;
    const at = (value: Date | string | null | undefined) => new Date(value ?? 0).getTime();
    expect(at(food(after).approvedAt) - at(food(before).approvedAt)).toBe(10 * DAY);
    expect(at(food(after).statusChangedAt) - at(food(before).statusChangedAt)).toBe(10 * DAY);
  });

  it("gives the food pantry a review, a version, and its supporters from the fixtures", () => {
    const rows = seedRows(FIXTURE_TIME);
    const food = rows.ideas.find((idea) => idea.number === 103)!;
    expect(rows.revisions.some((revision) => revision.ideaId === food.id && revision.version === 1)).toBe(
      true,
    );
    expect(rows.reviews.some((review) => review.ideaId === food.id && review.decision === "approved")).toBe(
      true,
    );
    expect(rows.supports.filter((support) => support.ideaId === food.id)).toHaveLength(2);
  });

  it("gives every declined review a written reason", () => {
    const rows = seedRows(FIXTURE_TIME);
    for (const review of rows.reviews.filter((r) => r.decision === "declined")) {
      expect(review.reason?.trim()).toBeTruthy();
    }
  });
});

describe("assertSeedable", () => {
  it("allows the local and test environments", () => {
    expect(() => assertSeedable("local")).not.toThrow();
    expect(() => assertSeedable("test")).not.toThrow();
  });

  it.each(["preview", "dev", "production", undefined])(
    "refuses %s, so invented data never reaches a deployed site",
    (env) => {
      expect(() => assertSeedable(env)).toThrow(/local or test/);
    },
  );
});
