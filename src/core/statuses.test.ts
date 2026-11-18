import { describe, expect, it } from "vitest";
import { IDEA_STATUSES, STATUS_LABELS, WALL_STATUSES, takesSupport } from "./statuses";
import { prismaEnum } from "./testing/prismaEnum";

describe("idea statuses (#34)", () => {
  it("match the IdeaStatus enum in prisma/schema.prisma", () => {
    expect([...IDEA_STATUSES].sort()).toEqual(prismaEnum("IdeaStatus").sort());
  });

  it("every status has a student-facing label", () => {
    for (const status of IDEA_STATUSES) expect(STATUS_LABELS[status], status).not.toBe("");
  });
});

describe("support and the wall (#237)", () => {
  it("only delivered and closed ideas stop taking support", () => {
    for (const status of IDEA_STATUSES) {
      expect(takesSupport(status), status).toBe(status !== "delivered" && status !== "closed");
    }
  });

  it("the wall filter offers every status except closed", () => {
    expect([...WALL_STATUSES]).toEqual(IDEA_STATUSES.filter((status) => status !== "closed"));
  });
});
