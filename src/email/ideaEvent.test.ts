import { describe, expect, it } from "vitest";
import {
  IDEA_EVENT_PRIORITY,
  ideaEventDedupeKey,
  ideaEventKey,
  ideaEventPayloadSchema,
  renderIdeaEventEmail,
  type IdeaEvent,
  type IdeaEventPayload,
} from "./ideaEvent";

const changedAt = new Date("2026-11-02T14:00:00.000Z");
const statusEvent: IdeaEvent = {
  kind: "status",
  ideaId: "00000000-0000-4000-8000-000000000001",
  status: "in_progress",
  waitingReason: null,
  changedAt,
};
const updateEvent: IdeaEvent = {
  kind: "update",
  ideaId: "00000000-0000-4000-8000-000000000001",
  updateId: "00000000-0000-4000-8000-000000000002",
  body: "We met with Dining Services today.",
};
const userId = "00000000-0000-4000-8000-000000000003";
const siteUrl = "https://proposals.example.com";

const statusPayload: IdeaEventPayload = {
  ideaNumber: 103,
  ideaTitle: "More vegan options",
  boardId: "DAB",
  event: { kind: "status", status: "in_progress", waitingReason: null },
};

describe("idea event emails (#101)", () => {
  it("keys a status change by idea and time, and an update by its id", () => {
    expect(ideaEventKey(statusEvent)).toBe(`status:${statusEvent.ideaId}:${changedAt.getTime()}`);
    expect(ideaEventKey(updateEvent)).toBe(`update:${updateEvent.updateId}`);
  });

  it("builds one dedupe key per event and follower", () => {
    expect(ideaEventDedupeKey(updateEvent, userId)).toBe(
      `idea_event:update:${updateEvent.updateId}:${userId}`,
    );
    expect(ideaEventDedupeKey(statusEvent, userId)).not.toBe(ideaEventDedupeKey(statusEvent, "other"));
  });

  it("sends idea events at priority 3", () => {
    expect(IDEA_EVENT_PRIORITY).toBe(3);
  });

  it("accepts a valid payload and rejects an author id or any extra key", () => {
    expect(ideaEventPayloadSchema.safeParse(statusPayload).success).toBe(true);
    expect(ideaEventPayloadSchema.safeParse({ ...statusPayload, authorId: userId }).success).toBe(false);
    expect(
      ideaEventPayloadSchema.safeParse({
        ...statusPayload,
        event: { ...statusPayload.event, authorId: userId },
      }).success,
    ).toBe(false);
  });

  it("renders a status change", () => {
    const message = renderIdeaEventEmail(statusPayload, "a@example.com", siteUrl);
    expect(message.to).toBe("a@example.com");
    expect(message.subject).toBe("Proposal #103: In progress");
    expect(message.text).toContain("More vegan options");
    expect(message.text).toContain('The Dining Advisory Board moved this idea to "In progress".');
    expect(message.text).not.toContain("Why it is on hold");
    expect(message.text).toContain(`See where it stands: ${siteUrl}/ideas/103`);
    expect(message.text).toContain("You get this email because you follow this idea.");
  });

  it("ends with a link to the notification settings (#211)", () => {
    for (const event of [statusPayload.event, { kind: "update" as const, body: "A note." }]) {
      const text = renderIdeaEventEmail({ ...statusPayload, event }, "a@example.com", siteUrl).text;
      expect(text.endsWith(`Change which emails you get: ${siteUrl}/me/notifications`)).toBe(true);
    }
  });

  it("renders a waiting change with its reason", () => {
    const message = renderIdeaEventEmail(
      {
        ...statusPayload,
        event: { kind: "status", status: "waiting", waitingReason: "Waiting on the dining contract." },
      },
      "a@example.com",
      siteUrl,
    );
    expect(message.subject).toBe("Proposal #103: On hold");
    expect(message.text).toContain("Why it is on hold: Waiting on the dining contract.");
  });

  it("renders a closed change with its reason (#237)", () => {
    const closedEvent = {
      kind: "status" as const,
      status: "closed" as const,
      waitingReason: null,
      closedReason: "Facilities is not adding new outdoor power this year",
    };
    const payload = { ...statusPayload, event: closedEvent };
    expect(ideaEventPayloadSchema.safeParse(payload).success).toBe(true);
    // A reviewer or author key is still refused by the strict schema.
    expect(
      ideaEventPayloadSchema.safeParse({ ...payload, event: { ...closedEvent, reviewerId: userId } }).success,
    ).toBe(false);
    expect(
      ideaEventPayloadSchema.safeParse({ ...payload, event: { ...closedEvent, authorId: userId } }).success,
    ).toBe(false);

    const message = renderIdeaEventEmail(payload, "a@example.com", siteUrl);
    expect(message.subject).toBe("Proposal #103: Closed");
    expect(message.text).toContain('The Dining Advisory Board moved this idea to "Closed".');
    expect(message.text).toContain("Why it is closed: Facilities is not adding new outdoor power this year");
  });

  it("still parses a status payload queued before closedReason existed (#237)", () => {
    expect(statusPayload.event).not.toHaveProperty("closedReason");
    expect(ideaEventPayloadSchema.safeParse(statusPayload).success).toBe(true);
  });

  it("renders an update", () => {
    const message = renderIdeaEventEmail(
      { ...statusPayload, event: { kind: "update", body: "We met with Dining Services today." } },
      "a@example.com",
      siteUrl,
    );
    expect(message.subject).toBe("Proposal #103: new update");
    expect(message.text).toContain("The Dining Advisory Board posted an update:");
    expect(message.text).toContain("We met with Dining Services today.");
    expect(message.text).toContain(`${siteUrl}/ideas/103`);
  });

  it("never says petition", () => {
    const text = renderIdeaEventEmail(statusPayload, "a@example.com", siteUrl).text;
    expect(text.toLowerCase()).not.toContain("petition");
  });
});
