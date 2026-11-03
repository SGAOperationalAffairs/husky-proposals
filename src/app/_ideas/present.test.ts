import { describe, expect, it } from "vitest";
import type { PublicIdeaRecord } from "@/db/publicIdeas";
import { toCard, toPage } from "./present";

const NOW = new Date("2026-11-20T12:00:00.000Z");
const daysBefore = (days: number, extraHours = 0) =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000 - extraHours * 60 * 60 * 1000).toISOString();

function record(
  overrides: Partial<PublicIdeaRecord["idea"]> = {},
  rest: Partial<PublicIdeaRecord> = {},
): PublicIdeaRecord {
  return {
    idea: {
      id: "00000000-0000-4000-8000-000000000001",
      number: 103,
      title: "A student-hosted food pantry",
      description: "A free place to pick up groceries.",
      fullText: null,
      category: "dining",
      boardId: "DAB",
      location: null,
      scale: null,
      costBand: null,
      timeHorizon: null,
      status: "in_progress",
      waitingReason: null,
      fromSga: false,
      authorName: "Maya Test",
      submittedAt: daysBefore(60),
      approvedAt: daysBefore(50),
      statusChangedAt: daysBefore(14),
      deliveredAt: null,
      ...overrides,
    },
    stats: { supportCount: 2, willingCount: 1, rankInBoard: 1, lastUpdateAt: daysBefore(2) },
    ...rest,
  };
}

describe("presenting a public idea (#60)", () => {
  it("counts whole days since the latest activity, floored", () => {
    expect(toCard(record(), NOW).updatedDaysAgo).toBe(2);
    expect(
      toCard(record({}, { stats: { ...record().stats, lastUpdateAt: daysBefore(2, 23) } }), NOW)
        .updatedDaysAgo,
    ).toBe(2);
  });

  it("uses the latest of the last update, the status change, and the approval", () => {
    const stats = { ...record().stats, lastUpdateAt: null };
    expect(toCard(record({}, { stats }), NOW).updatedDaysAgo).toBe(14);
    expect(toCard(record({ statusChangedAt: null }, { stats }), NOW).updatedDaysAgo).toBe(50);
  });

  it("never goes negative when a clock runs behind", () => {
    const stats = { ...record().stats, lastUpdateAt: new Date(NOW.getTime() + 60_000).toISOString() };
    expect(toCard(record({}, { stats }), NOW).updatedDaysAgo).toBe(0);
  });

  it("takes the support and willing counts from the stats", () => {
    const card = toCard(record(), NOW);
    expect(card).toMatchObject({
      number: 103,
      board: "DAB",
      status: "in_progress",
      supportCount: 2,
      willingCount: 1,
    });
  });

  it("names the author only when the post has a name, so the key is absent otherwise", () => {
    expect(toPage(record(), NOW).author).toBe("Maya Test");
    expect("author" in toPage(record({ authorName: null }), NOW)).toBe(false);
  });

  it("counts days since the post was submitted", () => {
    expect(toPage(record(), NOW).proposedDaysAgo).toBe(60);
  });

  it("splits the full text into paragraphs, falling back to the summary", () => {
    expect(toPage(record({ fullText: "One.\n\nTwo.\n\n\nThree." }), NOW).about).toEqual([
      "One.",
      "Two.",
      "Three.",
    ]);
    expect(toPage(record(), NOW).about).toEqual(["A free place to pick up groceries."]);
  });

  it("writes scale, cost, and timing with the core labels, and leaves unknown ones out", () => {
    const page = toPage(record({ scale: "large", costBand: "over_5k", timeHorizon: "within_a_year" }), NOW);
    expect(page).toMatchObject({ scale: "Large", cost: "$5k or more", timing: "Within a year" });
    const bare = toPage(record(), NOW);
    expect(bare.scale).toBeUndefined();
    expect(bare.cost).toBeUndefined();
    expect(bare.timing).toBeUndefined();
  });

  it("gives a reason only to a waiting idea", () => {
    expect(
      toPage(record({ status: "waiting", waitingReason: "Waiting on a survey." }), NOW).waitingReason,
    ).toBe("Waiting on a survey.");
    expect(toPage(record({ waitingReason: "Stale text." }), NOW).waitingReason).toBeUndefined();
  });

  it("turns updates into days ago and text", () => {
    const page = toPage(
      record(
        {},
        {
          updates: [
            { kind: "board", body: "Began drafting.", createdAt: daysBefore(2) },
            { kind: "check_in", body: "Still working, no news.", createdAt: daysBefore(9) },
          ],
        },
      ),
      NOW,
    );
    expect(page.updates).toEqual([
      { daysAgo: 2, text: "Began drafting." },
      { daysAgo: 9, text: "Still working, no news." },
    ]);
  });

  it("writes the rank as a position among the board's ranked ideas, or none once delivered", () => {
    expect(toPage(record({}, { rankOf: 2 }), NOW).rank).toEqual({ position: 1, of: 2, board: "Dining" });
    const delivered = record({ status: "delivered" }, { stats: { ...record().stats, rankInBoard: null } });
    expect(toPage(delivered, NOW).rank).toBeUndefined();
  });
});
