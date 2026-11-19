import { describe, expect, it } from "vitest";
import type { AuthorIdea } from "@/core/viewerShapes";
import type { IdeaCardData } from "@/components/IdeaCard";
import { toEditPost, toSimilarIdeas } from "./present";

// Public wall cards as the few fields the similar-ideas check needs (#55).
describe("toSimilarIdeas (#55)", () => {
  const card: IdeaCardData = {
    number: 103,
    title: "A late-night dining option on weeknights",
    description: "Something open after 10.",
    location: "Stetson East",
    board: "DAB",
    status: "collecting_support",
    fromSga: true,
    updatedDaysAgo: 2,
    supportCount: 41,
    willingCount: 6,
  };

  it("keeps the number, title, category, and status, and nothing else", () => {
    expect(toSimilarIdeas([card])).toEqual([
      { number: 103, title: card.title, category: "dining", status: "collecting_support" },
    ]);
  });

  it("maps each board to its category", () => {
    expect(toSimilarIdeas([{ ...card, board: "GIB" }])[0]?.category).toBe("green_initiatives");
  });

  it("is plain data", () => {
    const data = toSimilarIdeas([card]);
    expect(JSON.parse(JSON.stringify(data))).toEqual(data);
  });
});

// The author's post as plain data for the edit page (#128).
const NOW = new Date("2026-11-10T12:00:00Z");

function idea(overrides: Partial<AuthorIdea> = {}): AuthorIdea {
  return {
    id: "6f9c0f5e-2b1d-4a63-9a53-0d3f9b2f1c10",
    number: null,
    title: "Bike repair stand by the garage",
    description: "A stand with a pump and basic tools.",
    fullText: "Flat tires end rides. A stand with a pump and tools by the garage fixes that for everyone.",
    category: "green_initiatives",
    boardId: "GIB",
    location: "Huntington garage",
    scale: "large",
    costBand: "under_1k",
    timeHorizon: "this_semester",
    status: null,
    waitingReason: null,
    closedReason: null,
    fromSga: false,
    authorName: "Priya Test",
    submittedAt: NOW,
    approvedAt: null,
    statusChangedAt: null,
    deliveredAt: null,
    reviewStatus: "declined",
    isAnonymous: true,
    review: { decision: "declined", reason: "This repeats an open idea." },
    ...overrides,
  };
}

describe("toEditPost (#128)", () => {
  it("maps the post to the form's values, the board, and the reason", () => {
    const data = toEditPost(idea());
    expect(data).toEqual({
      ideaId: "6f9c0f5e-2b1d-4a63-9a53-0d3f9b2f1c10",
      board: "GIB",
      number: null,
      reviewStatus: "declined",
      reason: "This repeats an open idea.",
      values: {
        title: "Bike repair stand by the garage",
        summary: "A stand with a pump and basic tools.",
        details: "Flat tires end rides. A stand with a pump and tools by the garage fixes that for everyone.",
        category: "green_initiatives",
        location: "Huntington garage",
        scale: "large",
        costBand: "under_1k",
        timeHorizon: "this_semester",
        anonymous: true,
      },
    });
  });

  it("turns null fields into the form's empty and Not sure values", () => {
    const { values } = toEditPost(
      idea({ fullText: null, location: null, scale: null, costBand: null, timeHorizon: null }),
    );
    expect(values).toMatchObject({ details: "", location: "", scale: "", costBand: "", timeHorizon: "" });
  });

  it("has no reason for a pending post whose latest review is an old decline", () => {
    expect(toEditPost(idea({ reviewStatus: "pending" })).reason).toBeNull();
  });

  it("has no reason when the latest review is not a decline, or there is none", () => {
    expect(toEditPost(idea({ review: { decision: "approved", reason: null } })).reason).toBeNull();
    expect(toEditPost(idea({ review: null })).reason).toBeNull();
  });

  it("is plain data with no reviewer field and no dates", () => {
    const data = toEditPost(idea());
    expect(Object.keys(data).sort()).toEqual(
      ["board", "ideaId", "number", "reason", "reviewStatus", "values"].sort(),
    );
    expect(JSON.parse(JSON.stringify(data))).toEqual(data);
  });
});
