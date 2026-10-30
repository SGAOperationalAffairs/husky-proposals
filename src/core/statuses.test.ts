import { describe, expect, it } from "vitest";
import { IDEA_STATUSES, STATUS_LABELS } from "./statuses";
import { prismaEnum } from "./testing/prismaEnum";

describe("idea statuses (#34)", () => {
  it("match the IdeaStatus enum in prisma/schema.prisma", () => {
    expect([...IDEA_STATUSES].sort()).toEqual(prismaEnum("IdeaStatus").sort());
  });

  it("every status has a student-facing label", () => {
    for (const status of IDEA_STATUSES) expect(STATUS_LABELS[status], status).not.toBe("");
  });
});
