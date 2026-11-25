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
    review: { decision: "declined", kind: "review", reason: "This repeats an open idea." },
    edit: null,
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
      sentBack: false,
      edit: null,
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
    expect(
      toEditPost(idea({ review: { decision: "approved", kind: "review", reason: null } })).reason,
    ).toBeNull();
    expect(toEditPost(idea({ review: null })).reason).toBeNull();
  });

  it("flags a declined post whose latest review is a send-back (#286)", () => {
    const sentBack = idea({
      review: { decision: "declined", kind: "send_back", reason: "Add the cost and the place." },
    });
    expect(toEditPost(sentBack)).toMatchObject({
      reviewStatus: "declined",
      reason: "Add the cost and the place.",
      sentBack: true,
    });
    // A resubmitted post is pending, so the old send-back no longer shows.
    expect(toEditPost({ ...sentBack, reviewStatus: "pending" })).toMatchObject({
      reason: null,
      sentBack: false,
    });
  });

  it("returns the reason of a taken-down post, and it was not sent back (#286)", () => {
    const takenDown = idea({
      reviewStatus: "taken_down",
      review: { decision: "declined", kind: "take_down", reason: "It names a person." },
    });
    expect(toEditPost(takenDown)).toMatchObject({
      reviewStatus: "taken_down",
      reason: "It names a person.",
      sentBack: false,
    });
  });

  it("treats an old take-down that left the post declined as not sent back", () => {
    // Dev rows from before #286: declined with kind take_down. They read as a plain decline.
    const old = idea({ review: { decision: "declined", kind: "take_down", reason: "Old." } });
    expect(toEditPost(old)).toMatchObject({ reason: "Old.", sentBack: false });
  });

  it("is plain data with no reviewer field and no dates", () => {
    const data = toEditPost(idea());
    expect(Object.keys(data).sort()).toEqual(
      ["board", "edit", "ideaId", "number", "reason", "reviewStatus", "sentBack", "values"].sort(),
    );
    expect(JSON.parse(JSON.stringify(data))).toEqual(data);
  });

  describe("an edit to an approved post (#295)", () => {
    const editValues = {
      title: "Bike repair stand and pump",
      description: "A stand, a pump, and tools.",
      fullText: "Flat tires end rides. A stand with a pump and tools by the garage fixes that for everyone.",
      category: "green_initiatives" as const,
      location: null,
      scale: "medium" as const,
      costBand: null,
      timeHorizon: null,
      isAnonymous: false,
    };
    const approved = { reviewStatus: "approved" as const, number: 120, review: null };

    it("a waiting edit carries its state, and the form values are the edit's", () => {
      const data = toEditPost(
        idea({ ...approved, edit: { state: "pending", reason: null, values: editValues } }),
      );
      expect(data.edit).toEqual({ state: "pending", reason: null });
      expect(data.values).toMatchObject({
        title: "Bike repair stand and pump",
        scale: "medium",
        anonymous: false,
      });
    });

    it("a declined edit carries the reason, and the form holds the declined words", () => {
      const data = toEditPost(
        idea({ ...approved, edit: { state: "declined", reason: "Say where.", values: editValues } }),
      );
      expect(data.edit).toEqual({ state: "declined", reason: "Say where." });
      expect(data.values.title).toBe("Bike repair stand and pump");
      expect(data.reason).toBeNull();
    });

    it("with no edit, the form starts from the approved version", () => {
      const data = toEditPost(idea(approved));
      expect(data.edit).toBeNull();
      expect(data.values.title).toBe("Bike repair stand by the garage");
    });
  });
});
