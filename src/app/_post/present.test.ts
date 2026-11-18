import { describe, expect, it } from "vitest";
import type { AuthorIdea } from "@/core/viewerShapes";
import { toEditPost } from "./present";

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
