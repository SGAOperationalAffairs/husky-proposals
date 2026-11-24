import { describe, expect, it } from "vitest";
import {
  buildDigest,
  DIGEST_MAX_IDEAS,
  DIGEST_MAX_UPDATES_PER_IDEA,
  digestDay,
  digestWeekday,
  digestWindow,
  type DigestUpdate,
} from "./digest";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const DAY = 24 * 60 * 60 * 1000;

// Monday, November 16, 2026, 13:00 UTC: the digest run's time.
const NOW = new Date("2026-11-16T13:00:00.000Z");
const DAY_START = new Date("2026-11-16T00:00:00.000Z");

describe("digest weekday (#212)", () => {
  it("is stable: pinned values, so a change to the hash fails here", () => {
    expect([
      digestWeekday(id(1)),
      digestWeekday("5f0c1a7e-2b4d-4c8e-9a31-7d6e0b12c3f4"),
      digestWeekday("ffffffff-ffff-4fff-8fff-ffffffffffff"),
    ]).toEqual([2, 3, 1]);
  });

  it("gives the same day on every call, and ignores the case of the id", () => {
    const upper = "5F0C1A7E-2B4D-4C8E-9A31-7D6E0B12C3F4";
    expect(digestWeekday(upper)).toBe(digestWeekday(upper.toLowerCase()));
    expect(digestWeekday(id(7))).toBe(digestWeekday(id(7)));
  });

  it("spreads 1,500 sequential-looking ids across the week with no day holding more than 280", () => {
    const counts = Array.from({ length: 7 }, () => 0);
    for (let n = 1; n <= 1500; n += 1) counts[digestWeekday(id(n))]! += 1;
    for (const count of counts) {
      expect(count).toBeGreaterThanOrEqual(150);
      expect(count).toBeLessThanOrEqual(280);
    }
  });
});

describe("digest day and window (#212)", () => {
  it("takes the UTC date, at 13:00 and at 23:59", () => {
    expect(digestDay(NOW)).toEqual({ weekday: 1, dayStart: DAY_START, key: "2026-11-16" });
    expect(digestDay(new Date("2026-11-16T23:59:59.999Z")).dayStart).toEqual(DAY_START);
  });

  it("starts at the last digest, and defaults to a week for a first digest", () => {
    const last = new Date(DAY_START.getTime() - 7 * DAY);
    expect(digestWindow(last, DAY_START)).toEqual({ from: last, to: DAY_START });
    expect(digestWindow(null, DAY_START)).toEqual({
      from: new Date(DAY_START.getTime() - 7 * DAY),
      to: DAY_START,
    });
  });

  it("clamps a months-old last digest to 14 days", () => {
    const old = new Date(DAY_START.getTime() - 90 * DAY);
    expect(digestWindow(old, DAY_START).from).toEqual(new Date(DAY_START.getTime() - 14 * DAY));
  });

  it("is empty when the last digest was today", () => {
    expect(digestWindow(DAY_START, DAY_START)).toEqual({ from: DAY_START, to: DAY_START });
  });
});

const window = { from: new Date(DAY_START.getTime() - 7 * DAY), to: DAY_START };

function update(ideaN: number, hoursBeforeEnd: number, overrides: Partial<DigestUpdate> = {}): DigestUpdate {
  return {
    ideaId: id(ideaN),
    ideaNumber: 100 + ideaN,
    ideaTitle: `Idea ${ideaN}`,
    boardId: "DAB",
    kind: "board",
    body: `Update on idea ${ideaN}, ${hoursBeforeEnd} hours before the window ends.`,
    createdAt: new Date(DAY_START.getTime() - hoursBeforeEnd * 60 * 60 * 1000),
    ...overrides,
  };
}

describe("buildDigest (#212)", () => {
  it("returns null with no updates", () => {
    expect(buildDigest([], window)).toBeNull();
  });

  it("returns null when every update is before the window or at or after its end", () => {
    const before = update(1, 7 * 24 + 1);
    const atFrom = update(2, 7 * 24);
    const atTo = update(3, 0);
    const after = update(4, -5);
    expect(buildDigest([before, after, atTo], window)).toBeNull();
    // `from` is inclusive and `to` is not.
    expect(buildDigest([atFrom], window)?.totalUpdates).toBe(1);
  });

  it("groups by idea, newest idea first, and each idea's updates newest first", () => {
    const digest = buildDigest([update(1, 50), update(2, 5), update(1, 30), update(3, 20)], window);
    expect(digest?.ideas.map((idea) => idea.ideaNumber)).toEqual([102, 103, 101]);
    expect(digest?.ideas[2]?.updates.map((entry) => entry.postedAt)).toEqual([
      update(1, 30).createdAt,
      update(1, 50).createdAt,
    ]);
    expect(digest?.totalUpdates).toBe(4);
    expect(digest?.moreIdeas).toBe(0);
    expect(digest?.ideas.every((idea) => idea.moreUpdates === 0)).toBe(true);
  });

  it("keeps 3 updates per idea and counts the rest", () => {
    const many = [1, 2, 3, 4, 5].map((hours) => update(1, hours));
    const digest = buildDigest(many, window);
    expect(DIGEST_MAX_UPDATES_PER_IDEA).toBe(3);
    expect(digest?.ideas[0]?.updates).toHaveLength(3);
    expect(digest?.ideas[0]?.moreUpdates).toBe(2);
    expect(digest?.totalUpdates).toBe(5);
  });

  it("keeps 10 ideas, the ones with the newest news, and counts the rest", () => {
    const many = Array.from({ length: 13 }, (_, index) => update(index + 1, index + 1));
    const digest = buildDigest(many, window);
    expect(DIGEST_MAX_IDEAS).toBe(10);
    expect(digest?.ideas).toHaveLength(10);
    expect(digest?.ideas[0]?.ideaNumber).toBe(101);
    expect(digest?.moreIdeas).toBe(3);
    expect(digest?.totalUpdates).toBe(13);
  });

  it("carries the idea's board and each update's kind", () => {
    const digest = buildDigest([update(1, 2, { boardId: "GIB", kind: "check_in" })], window);
    expect(digest?.ideas[0]?.boardId).toBe("GIB");
    expect(digest?.ideas[0]?.updates[0]?.kind).toBe("check_in");
  });
});
