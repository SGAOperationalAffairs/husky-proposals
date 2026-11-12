import { describe, expect, it } from "vitest";
import { appStatus, IDEA_STATUSES, STATUS_LABELS } from "./statuses";
import { prismaEnum } from "./testing/prismaEnum";

describe("idea statuses (#34)", () => {
  // The database still has the retired in_review value (Nov 11). It comes out in a later
  // migration, which is a removal (CLAUDE.md), so until then the enum has one extra member.
  it("match the IdeaStatus enum in prisma/schema.prisma, apart from the retired value", () => {
    expect([...IDEA_STATUSES, "under_review"].sort()).toEqual(prismaEnum("IdeaStatus").sort());
  });

  it("every status has a student-facing label", () => {
    for (const status of IDEA_STATUSES) expect(STATUS_LABELS[status], status).not.toBe("");
  });

  // Rows still hold the retired value until #199's migration drops it. Reads map it here,
  // the one place rows become the app's status (#199).
  it("reads the retired under_review value as collecting_support", () => {
    expect(appStatus("under_review")).toBe("collecting_support");
  });

  it("passes every live status through unchanged", () => {
    for (const status of IDEA_STATUSES) expect(appStatus(status)).toBe(status);
  });
});
