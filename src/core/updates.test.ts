import { describe, expect, it } from "vitest";
import {
  CHECK_IN_BODY,
  UPDATE_BODY_MAX,
  UPDATE_TEMPLATES,
  cadenceDueAt,
  cadenceFlag,
  hasPlaceholder,
  nextDueText,
  postUpdateInputSchema,
} from "./updates";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-12-01T15:00:00.000Z");
const daysBefore = (days: number) => new Date(NOW.getTime() - days * DAY);
const IDEA = "00000000-0000-4000-8000-000000000101";

describe("update templates and body rules (#130)", () => {
  it("keeps the playground's templates, with an empty Write my own", () => {
    expect(UPDATE_TEMPLATES.map((t) => t.id)).toEqual(["formed", "met", "mile", "late", "custom"]);
    expect(UPDATE_TEMPLATES.find((t) => t.id === "custom")?.text).toBe("");
  });

  it("the check-in body is the exact string the fixtures already use", () => {
    expect(CHECK_IN_BODY).toBe("Still working, no news.");
    expect(UPDATE_BODY_MAX).toBe(1000);
  });

  it("finds a leftover [bracket] placeholder, and only that", () => {
    expect(hasPlaceholder("We agreed on next steps: [add the steps].")).toBe(true);
    expect(hasPlaceholder("Moved to [date]")).toBe(true);
    expect(hasPlaceholder("The committee met on Tuesday.")).toBe(false);
    expect(hasPlaceholder("An open [ bracket and a closed ] one")).toBe(true);
    expect(hasPlaceholder("Only a closing ] here")).toBe(false);
  });

  it("every template with a bracket is caught, so none posts unedited", () => {
    for (const t of UPDATE_TEMPLATES) {
      expect(hasPlaceholder(t.text)).toBe(t.text.includes("["));
    }
  });
});

describe("postUpdateInputSchema (#130)", () => {
  it("takes a board update with a body and a check-in with none", () => {
    expect(postUpdateInputSchema.safeParse({ ideaId: IDEA, kind: "board", body: "Hello" }).success).toBe(
      true,
    );
    expect(postUpdateInputSchema.safeParse({ ideaId: IDEA, kind: "check_in" }).success).toBe(true);
  });

  it("refuses a system update, a bad id, and a non-string body", () => {
    expect(postUpdateInputSchema.safeParse({ ideaId: IDEA, kind: "system", body: "x" }).success).toBe(false);
    expect(postUpdateInputSchema.safeParse({ ideaId: "nope", kind: "board", body: "x" }).success).toBe(false);
    expect(postUpdateInputSchema.safeParse({ ideaId: IDEA, kind: "board", body: 4 }).success).toBe(false);
  });
});

describe("cadenceDueAt (#130)", () => {
  it("counts from the start of work when there is no update", () => {
    const due = cadenceDueAt({ statusChangedAt: daysBefore(10), updates: [], cadenceDays: 30 });
    expect(due).toEqual(new Date(daysBefore(10).getTime() + 30 * DAY));
  });

  it("counts from the newest board or check-in update, when it is later", () => {
    const due = cadenceDueAt({
      statusChangedAt: daysBefore(40),
      updates: [
        { kind: "board", createdAt: daysBefore(20) },
        { kind: "check_in", createdAt: daysBefore(5) },
      ],
      cadenceDays: 30,
    });
    expect(due).toEqual(new Date(daysBefore(5).getTime() + 30 * DAY));
  });

  it("ignores system updates, as idea_stats does", () => {
    const due = cadenceDueAt({
      statusChangedAt: daysBefore(40),
      updates: [{ kind: "system", createdAt: daysBefore(1) }],
      cadenceDays: 30,
    });
    expect(due).toEqual(new Date(daysBefore(40).getTime() + 30 * DAY));
  });

  it("uses the start of work when it is later than an old update", () => {
    const due = cadenceDueAt({
      statusChangedAt: daysBefore(3),
      updates: [{ kind: "board", createdAt: daysBefore(50) }],
      cadenceDays: 14,
    });
    expect(due).toEqual(new Date(daysBefore(3).getTime() + 14 * DAY));
  });

  it("has no date with no counting activity at all", () => {
    expect(cadenceDueAt({ statusChangedAt: null, updates: [], cadenceDays: 30 })).toBeNull();
  });
});

describe("cadenceFlag (#130)", () => {
  it("says how many days are left while the idea is not due", () => {
    expect(cadenceFlag(new Date(NOW.getTime() + 5 * DAY), false, NOW)).toEqual({
      text: "Due in 5 days",
      due: false,
    });
  });

  it("says how many days overdue, in words", () => {
    expect(cadenceFlag(daysBefore(3), true, NOW)).toEqual({ text: "3 days overdue", due: true });
    expect(cadenceFlag(daysBefore(1), true, NOW)).toEqual({ text: "1 day overdue", due: true });
  });

  it("the view's flag decides: stale on the due day reads Due today", () => {
    expect(cadenceFlag(new Date(NOW.getTime() - 60_000), true, NOW)).toEqual({
      text: "Due today",
      due: true,
    });
  });

  it("stale with no date reads Due today", () => {
    expect(cadenceFlag(null, true, NOW)).toEqual({ text: "Due today", due: true });
    expect(cadenceFlag(null, false, NOW)).toEqual({ text: "Due today", due: false });
  });
});

describe("nextDueText (#130)", () => {
  it("names when the next update is due", () => {
    expect(nextDueText(30, NOW)).toBe("Next one due in 30 days.");
    expect(nextDueText(1, NOW)).toBe("Next one due in 1 day.");
  });
});
