import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { IDEA_STATUSES, STATUS_LABELS } from "./statuses";

// Core cannot import Prisma, so read the enum out of the schema as text.
function prismaIdeaStatuses() {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const match = /enum IdeaStatus \{([^}]*)\}/.exec(schema);
  expect(match, "enum IdeaStatus not found in prisma/schema.prisma").not.toBeNull();
  return match![1]!
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, "").trim())
    .filter((line) => line !== "");
}

describe("idea statuses (#34)", () => {
  it("match the IdeaStatus enum in prisma/schema.prisma", () => {
    expect([...IDEA_STATUSES].sort()).toEqual(prismaIdeaStatuses().sort());
  });

  it("every status has a student-facing label", () => {
    for (const status of IDEA_STATUSES) expect(STATUS_LABELS[status], status).not.toBe("");
  });
});
