import { describe, expect, it } from "vitest";
import type { UpdatableIdea } from "@/db/updatesList";
import { toUpdateRow } from "./present";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-12-01T15:00:00.000Z");
const iso = (daysAgo: number) => new Date(NOW.getTime() - daysAgo * DAY).toISOString();

const record = (overrides: Partial<UpdatableIdea> = {}): UpdatableIdea => ({
  id: "idea-1",
  number: 103,
  title: "Later dining hours on Sundays",
  boardId: "DAB",
  statusChangedAt: iso(60),
  cadenceDays: 30,
  supportCount: 58,
  followerCount: 31,
  isStale: true,
  lastUpdateAt: iso(34),
  updates: [
    { id: "u2", kind: "check_in", body: "Still working, no news.", createdAt: iso(34) },
    { id: "u1", kind: "board", body: "Met with dining services.", createdAt: iso(60) },
  ],
  ...overrides,
});

describe("toUpdateRow (#130)", () => {
  it("carries the idea, its board, and its numbers", () => {
    expect(toUpdateRow(record(), NOW)).toMatchObject({
      id: "idea-1",
      number: 103,
      title: "Later dining hours on Sundays",
      board: "DAB",
      cadenceDays: 30,
      followerCount: 31,
      supportCount: 58,
    });
  });

  it("flags an idea past its cadence, with the days overdue in words", () => {
    // Counting from the check-in 34 days ago, due 4 days ago.
    const row = toUpdateRow(record(), NOW);
    expect(row).toMatchObject({ due: true, dueText: "4 days overdue" });
    expect(row.dueAt).toBe(new Date(NOW.getTime() - 4 * DAY).toISOString());
  });

  it("shows how long is left when the idea is not due", () => {
    const row = toUpdateRow(
      record({
        isStale: false,
        updates: [{ id: "u3", kind: "board", body: "Quote came back.", createdAt: iso(9) }],
      }),
      NOW,
    );
    expect(row).toMatchObject({ due: false, dueText: "Due in 21 days" });
  });

  it("the view's flag decides, and a system update does not move the due date", () => {
    const row = toUpdateRow(
      record({
        isStale: true,
        statusChangedAt: iso(40),
        updates: [{ id: "u9", kind: "system", body: "Moved board.", createdAt: iso(1) }],
      }),
      NOW,
    );
    expect(row).toMatchObject({ due: true, dueText: "10 days overdue" });
    expect(row.last).toEqual({ text: "Moved board.", daysAgo: 1 });
  });

  it("the last update is the newest of any kind, with its age in days", () => {
    expect(toUpdateRow(record(), NOW).last).toEqual({ text: "Still working, no news.", daysAgo: 34 });
    expect(toUpdateRow(record({ updates: [] }), NOW).last).toBeNull();
  });

  it("the past list is every update, newest first, as the idea page lists them", () => {
    expect(toUpdateRow(record(), NOW).past).toEqual([
      { id: "u2", daysAgo: 34, text: "Still working, no news." },
      { id: "u1", daysAgo: 60, text: "Met with dining services." },
    ]);
  });

  it("carries no author field anywhere", () => {
    const row = toUpdateRow(record(), NOW);
    expect(JSON.stringify(row)).not.toMatch(/author/i);
  });
});
