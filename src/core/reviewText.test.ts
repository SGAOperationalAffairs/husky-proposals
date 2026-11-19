import { describe, expect, it } from "vitest";
import { createFakeClock } from "@/testing/fakeClock";
import { dueText, reviewerLabel, studentWaitText } from "./reviewText";

const NOW = new Date("2026-11-05T15:00:00.000Z");
const at = (iso: string) => new Date(iso);

describe("the wait text an author sees on a pending post (#200)", () => {
  const now = createFakeClock("2026-11-05T15:00:00.000Z").now();

  it("says reviewers aim to decide within the days left", () => {
    expect(studentWaitText(at("2026-11-07T09:00:00.000Z"), now)).toBe(
      "Reviewers aim to decide within 2 days.",
    );
  });

  it("says tomorrow with one day left", () => {
    expect(studentWaitText(at("2026-11-06T09:00:00.000Z"), now)).toBe("Reviewers aim to decide by tomorrow.");
  });

  it("says today on the due day, whatever the hour", () => {
    expect(studentWaitText(at("2026-11-05T01:00:00.000Z"), now)).toBe("Reviewers aim to decide today.");
  });

  it("says it is taking longer, and asks nothing of the author, once past due", () => {
    const late =
      "This is taking longer than usual. It is still waiting for a reviewer, and you do not need to do anything.";
    expect(studentWaitText(at("2026-11-04T23:00:00.000Z"), now)).toBe(late);
    expect(studentWaitText(at("2026-11-02T09:00:00.000Z"), now)).toBe(late);
  });

  it("falls back to a few days when there is no due time", () => {
    expect(studentWaitText(null, now)).toBe("Reviewers aim to decide within a few days.");
  });
});

describe("review due text (#59)", () => {
  it("says due today for the same calendar day, whatever the hour", () => {
    expect(dueText(at("2026-11-05T01:00:00.000Z"), NOW)).toEqual({ text: "Due today", overdue: false });
    expect(dueText(at("2026-11-05T23:59:00.000Z"), NOW)).toEqual({ text: "Due today", overdue: false });
  });

  it("counts whole days ahead", () => {
    expect(dueText(at("2026-11-06T09:00:00.000Z"), NOW)).toEqual({ text: "Due in 1 day", overdue: false });
    expect(dueText(at("2026-11-08T09:00:00.000Z"), NOW)).toEqual({ text: "Due in 3 days", overdue: false });
  });

  it("counts whole days late, and marks them overdue", () => {
    expect(dueText(at("2026-11-04T23:00:00.000Z"), NOW)).toEqual({ text: "1 day overdue", overdue: true });
    expect(dueText(at("2026-11-01T09:00:00.000Z"), NOW)).toEqual({ text: "4 days overdue", overdue: true });
  });
});

describe("the reviewer label (#59)", () => {
  it("is null for a leader who reviews no board", () => {
    expect(reviewerLabel([])).toBeNull();
  });

  it("names one board", () => {
    expect(reviewerLabel(["DAB"])).toBe("You review Dining");
  });

  it("joins two boards with and", () => {
    expect(reviewerLabel(["DAB", "GIB"])).toBe("You review Dining and Green Initiatives");
  });

  it("joins three or four boards with commas and a final and", () => {
    expect(reviewerLabel(["DAB", "CPAB", "CSC"])).toBe(
      "You review Dining, Campus Planning, and Campus Services",
    );
    expect(reviewerLabel(["DAB", "CPAB", "CSC", "GIB"])).toBe(
      "You review Dining, Campus Planning, Campus Services, and Green Initiatives",
    );
  });

  it("says all five boards for the VP", () => {
    expect(reviewerLabel(["DAB", "CPAB", "CSC", "GIB", "SC"])).toBe("You review all five boards");
  });
});
