import { describe, expect, it } from "vitest";
import type { LeaderIdea } from "@/core/viewerShapes";
import { toApprovedRow, toLeaderPanel, toReviewRow } from "./present";

// Mapping leader rows to plain client data (#59). Fixed clock, invented people.
const NOW = new Date("2026-11-05T15:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

function leaderIdea(overrides: Partial<LeaderIdea> = {}): LeaderIdea {
  return {
    id: "00000000-0000-7000-8000-000000000001",
    number: null,
    title: "A quiet study room",
    description: "Set aside one corner.",
    fullText: "First paragraph.\n\nSecond paragraph.",
    category: "dining",
    boardId: "DAB",
    location: "Stetson East",
    scale: "small",
    costBand: "under_1k",
    timeHorizon: "this_semester",
    status: null,
    waitingReason: null,
    fromSga: false,
    authorName: "Maya Test",
    submittedAt: new Date(NOW.getTime() - 2 * DAY),
    approvedAt: null,
    statusChangedAt: null,
    deliveredAt: null,
    reviewStatus: "pending",
    isAnonymous: false,
    author: { id: "u1", displayName: "Maya Test", email: "maya.test@example.com" },
    authorHidden: false,
    supporters: null,
    ...overrides,
  };
}
const dueAt = new Date(NOW.getTime() + 2 * DAY);

describe("toReviewRow (#59)", () => {
  it("maps text, facts, dates, and a named poster", () => {
    const row = toReviewRow({ idea: leaderIdea(), dueAt }, NOW);
    expect(row).toMatchObject({
      title: "A quiet study room",
      paragraphs: ["First paragraph.", "Second paragraph."],
      sentText: "Sent 2 days ago",
      due: { text: "Due in 2 days", overdue: false },
      isAnonymous: false,
      poster: { kind: "named", name: "Maya Test", email: "maya.test@example.com" },
    });
    expect(row.facts).toEqual([
      { term: "Scale", value: "Small" },
      { term: "Rough cost", value: "Under $1k" },
      { term: "Timing", value: "This semester" },
      { term: "Where", value: "Stetson East" },
    ]);
  });

  it("falls back to Not sure for empty facts and to no paragraphs without a full text", () => {
    const row = toReviewRow(
      {
        idea: leaderIdea({ scale: null, costBand: null, timeHorizon: null, location: null, fullText: null }),
        dueAt,
      },
      NOW,
    );
    expect(row.facts.map((f) => f.value)).toEqual(["Not sure", "Not sure", "Not sure", "Not sure"]);
    expect(row.paragraphs).toEqual([]);
  });

  it("shows an anonymous poster to a viewer who may see the name", () => {
    const row = toReviewRow({ idea: leaderIdea({ isAnonymous: true }), dueAt }, NOW);
    expect(row.isAnonymous).toBe(true);
    expect(row.poster.kind).toBe("anonymous_visible");
  });

  it("never carries a name or email for a hidden anonymous author", () => {
    const row = toReviewRow(
      { idea: leaderIdea({ isAnonymous: true, author: null, authorHidden: true }), dueAt },
      NOW,
    );
    expect(row.poster).toEqual({ kind: "anonymous_hidden" });
    expect(Object.keys(row.poster)).toEqual(["kind"]);
    expect(JSON.stringify(row)).not.toContain("example.com");
    expect(JSON.stringify(row)).not.toContain("Maya");
  });

  it("maps a deleted account", () => {
    const row = toReviewRow({ idea: leaderIdea({ author: null }), dueAt }, NOW);
    expect(row.poster).toEqual({ kind: "deleted" });
  });

  it("says a post sent today was sent today", () => {
    const row = toReviewRow({ idea: leaderIdea({ submittedAt: NOW }), dueAt }, NOW);
    expect(row.sentText).toBe("Sent today");
  });
});

describe("toApprovedRow (#59)", () => {
  it("carries the number and when it was approved", () => {
    const row = toApprovedRow(
      { idea: leaderIdea({ number: 157, approvedAt: new Date(NOW.getTime() - 3 * DAY) }) },
      NOW,
    );
    expect(row).toEqual({
      id: "00000000-0000-7000-8000-000000000001",
      number: 157,
      title: "A quiet study room",
      boardId: "DAB",
      approvedText: "Approved 3 days ago",
    });
  });
});

describe("toLeaderPanel (#59)", () => {
  it("shows the reviewer tag and take-down only to a reviewer of the idea's board", () => {
    const idea = leaderIdea({ number: 157 });
    expect(toLeaderPanel({ idea, mayTakeDown: true }, ["DAB"])).toMatchObject({
      ideaId: idea.id,
      number: 157,
      boardId: "DAB",
      mayTakeDown: true,
      reviewerLabel: "You review Dining",
      poster: { kind: "named" },
    });
  });

  it("has no reviewer label when the viewer cannot take it down", () => {
    const panel = toLeaderPanel({ idea: leaderIdea({ number: 157 }), mayTakeDown: false }, ["DAB"]);
    expect(panel.reviewerLabel).toBeNull();
  });
});
