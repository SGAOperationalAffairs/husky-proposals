import { describe, expect, it } from "vitest";
import { addDays, DAY_MS, dayCount, daysAgo, daysAgoText, daysUntil, untilText, utcDayDiff } from "./days";
import { contactText } from "./people";
import { dueText, studentWaitText } from "./reviewText";
import { cadenceFlag } from "./updates";

// #273: one day rule for every page.
const NOW = new Date("2026-11-04T23:00:00Z");
const DEADLINE = new Date("2026-11-05T01:00:00Z");

describe("a deadline just after midnight UTC", () => {
  it("reads as 1 day away on every page", () => {
    expect(dueText(DEADLINE, NOW).text).toBe("Due in 1 day");
    expect(contactText(daysUntil(DEADLINE, NOW))).toBe("Contact in 1 day");
    expect(cadenceFlag(DEADLINE, false, NOW).text).toBe("Due in 1 day");
    expect(studentWaitText(DEADLINE, NOW)).toBe("Reviewers aim to decide by tomorrow.");
  });

  it("reads as yesterday for an activity just before midnight", () => {
    const then = new Date("2026-11-04T23:00:00Z");
    const now = new Date("2026-11-05T01:00:00Z");
    expect(daysAgo(then, now)).toBe(1);
    expect(daysAgoText(1)).toBe("yesterday");
  });
});

describe("utcDayDiff", () => {
  it("counts UTC midnights crossed", () => {
    expect(utcDayDiff(NOW, DEADLINE)).toBe(1);
  });
  it("is 0 inside one UTC day", () => {
    expect(utcDayDiff(new Date("2026-11-04T00:00:00Z"), new Date("2026-11-04T23:59:59Z"))).toBe(0);
  });
  it("is negative going backwards", () => {
    expect(utcDayDiff(DEADLINE, NOW)).toBe(-1);
  });
});

describe("daysAgo", () => {
  it("never goes below 0 on clock skew", () => {
    expect(daysAgo(DEADLINE, NOW)).toBe(0);
  });
});

describe("dayCount", () => {
  it("uses the singular for 1 and the absolute value", () => {
    expect(dayCount(1)).toBe("1 day");
    expect(dayCount(-3)).toBe("3 days");
  });
});

describe("untilText", () => {
  const words = { today: "Due today", ahead: "Due in" };
  it("reads today, ahead, and overdue", () => {
    expect(untilText(0, words)).toEqual({ text: "Due today", overdue: false });
    expect(untilText(2, words)).toEqual({ text: "Due in 2 days", overdue: false });
    expect(untilText(-1, words)).toEqual({ text: "1 day overdue", overdue: true });
  });
});

describe("addDays", () => {
  it("adds and subtracts exact days", () => {
    expect(addDays(NOW, 2).getTime()).toBe(NOW.getTime() + 2 * DAY_MS);
    expect(addDays(NOW, -1).getTime()).toBe(NOW.getTime() - DAY_MS);
  });
});

describe("daysAgoText", () => {
  it("reads as people say it", () => {
    expect(daysAgoText(0)).toBe("today");
    expect(daysAgoText(4)).toBe("4 days ago");
  });
});
