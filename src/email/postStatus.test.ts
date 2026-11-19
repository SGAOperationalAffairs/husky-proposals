import { describe, expect, it } from "vitest";
import {
  POST_STATUS_PRIORITY,
  postStatusDedupeKey,
  postStatusPayloadSchema,
  renderPostStatusEmail,
  type PostStatusEvent,
  type PostStatusPayload,
} from "./postStatus";

const ideaId = "00000000-0000-4000-8000-000000000001";
const siteUrl = "https://proposals.example.com";
const changedAt = new Date("2026-11-02T14:00:00.000Z");

const event: PostStatusEvent = {
  kind: "status",
  ideaId,
  status: "in_progress",
  waitingReason: null,
  changedAt,
};

const payload: PostStatusPayload = {
  ideaNumber: 103,
  ideaTitle: "More vegan options",
  boardId: "DAB",
  status: "in_progress",
  waitingReason: null,
};

describe("emails about your own post (#211): status changes", () => {
  it("sends at priority 1, keyed by idea and time", () => {
    expect(POST_STATUS_PRIORITY).toBe(1);
    expect(postStatusDedupeKey(event)).toBe(`post_status:${ideaId}:${changedAt.getTime()}`);
    expect(postStatusDedupeKey({ ...event, changedAt: new Date(changedAt.getTime() + 1) })).not.toBe(
      postStatusDedupeKey(event),
    );
  });

  it("accepts a valid payload and rejects an author id or any extra key", () => {
    expect(postStatusPayloadSchema.safeParse(payload).success).toBe(true);
    expect(postStatusPayloadSchema.safeParse({ ...payload, authorId: "x" }).success).toBe(false);
    expect(postStatusPayloadSchema.safeParse({ ...payload, status: "pending" }).success).toBe(false);
    expect(postStatusPayloadSchema.safeParse({ ...payload, ideaNumber: null }).success).toBe(false);
  });

  it("renders a status change", () => {
    const message = renderPostStatusEmail(payload, "a@example.com", siteUrl);
    expect(message.to).toBe("a@example.com");
    expect(message.subject).toBe("Proposal #103: In progress");
    expect(message.text).toContain("More vegan options");
    expect(message.text).toContain('The Dining Advisory Board moved your idea to "In progress".');
    expect(message.text).not.toContain("Why it is on hold");
    expect(message.text).toContain(`See where it stands: ${siteUrl}/ideas/103`);
  });

  it("renders a hold with its reason", () => {
    const message = renderPostStatusEmail(
      { ...payload, status: "waiting", waitingReason: "Waiting on the dining contract." },
      "a@example.com",
      siteUrl,
    );
    expect(message.subject).toBe("Proposal #103: On hold");
    expect(message.text).toContain("Why it is on hold: Waiting on the dining contract.");
  });

  it("says why it was sent and links the notification settings, last", () => {
    const text = renderPostStatusEmail(payload, "a@example.com", siteUrl).text;
    expect(
      text.endsWith(
        "\n\nYou get this email because you posted this idea.\n" +
          `Change which emails you get: ${siteUrl}/me/notifications`,
      ),
    ).toBe(true);
  });

  it("never says petition or vote, and never uses an em dash", () => {
    const { subject, text } = renderPostStatusEmail(payload, "a@example.com", siteUrl);
    expect(`${subject}\n${text}`).not.toMatch(/petition|vote|—/i);
  });
});
