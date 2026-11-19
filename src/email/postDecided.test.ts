import { describe, expect, it } from "vitest";
import {
  decisionKindOf,
  POST_DECIDED_PRIORITY,
  postDecidedDedupeKey,
  postDecidedPayloadSchema,
  renderPostDecidedEmail,
  type PostDecidedEvent,
  type PostDecidedPayload,
} from "./postDecided";

const ideaId = "00000000-0000-4000-8000-000000000001";
const reviewId = "00000000-0000-4000-8000-000000000002";
const siteUrl = "https://proposals.example.com";
const decidedAt = new Date("2026-11-02T14:00:00.000Z");

const event: PostDecidedEvent = { ideaId, reviewId, decision: "approved", reason: null, decidedAt };

const base = {
  ideaId,
  ideaNumber: 103,
  ideaTitle: "More vegan options",
  boardId: "DAB",
  isAnonymous: false,
} as const;

const approved: PostDecidedPayload = { ...base, event: { kind: "approved" } };
const declined: PostDecidedPayload = {
  ...base,
  ideaNumber: null,
  event: { kind: "declined", reason: "This repeats an open idea. Support that one instead." },
};
const takenDown: PostDecidedPayload = {
  ...base,
  event: { kind: "taken_down", reason: "It names a person." },
};

describe("emails about your own post (#211): decisions", () => {
  it("sends at priority 1, keyed by the review", () => {
    expect(POST_DECIDED_PRIORITY).toBe(1);
    expect(postDecidedDedupeKey(event)).toBe(`post_decided:${reviewId}`);
    expect(postDecidedDedupeKey({ ...event, reviewId: "other" })).not.toBe(postDecidedDedupeKey(event));
  });

  it("names the decision from the review's kind and decision", () => {
    expect(decisionKindOf({ kind: "review", decision: "approved" })).toBe("approved");
    expect(decisionKindOf({ kind: "review", decision: "declined" })).toBe("declined");
    expect(decisionKindOf({ kind: "take_down", decision: "declined" })).toBe("taken_down");
  });

  it("accepts the three payloads", () => {
    for (const payload of [approved, declined, takenDown]) {
      expect(postDecidedPayloadSchema.safeParse(payload).success).toBe(true);
    }
  });

  it("rejects an author id at the top level and inside the event", () => {
    const userId = "00000000-0000-4000-8000-000000000009";
    expect(postDecidedPayloadSchema.safeParse({ ...approved, authorId: userId }).success).toBe(false);
    expect(
      postDecidedPayloadSchema.safeParse({ ...approved, event: { kind: "approved", authorId: userId } })
        .success,
    ).toBe(false);
    expect(
      postDecidedPayloadSchema.safeParse({ ...declined, event: { ...declined.event, reviewerId: userId } })
        .success,
    ).toBe(false);
  });

  it("rejects a decline or take-down with an empty reason", () => {
    expect(
      postDecidedPayloadSchema.safeParse({ ...declined, event: { kind: "declined", reason: "" } }).success,
    ).toBe(false);
    expect(
      postDecidedPayloadSchema.safeParse({ ...takenDown, event: { kind: "taken_down", reason: "" } }).success,
    ).toBe(false);
  });

  it("rejects an approval or take-down with no number, but allows a decline with none", () => {
    expect(postDecidedPayloadSchema.safeParse({ ...approved, ideaNumber: null }).success).toBe(false);
    expect(postDecidedPayloadSchema.safeParse({ ...takenDown, ideaNumber: null }).success).toBe(false);
    expect(postDecidedPayloadSchema.safeParse(declined).success).toBe(true);
  });

  it("renders an approval", () => {
    const message = renderPostDecidedEmail(approved, "a@example.com", siteUrl);
    expect(message.to).toBe("a@example.com");
    expect(message.subject).toBe("Your post is approved: Proposal #103");
    expect(message.text).toContain("More vegan options");
    expect(message.text).toContain(
      "The Dining Advisory Board approved your post. It is now on the ideas list as #103.",
    );
    expect(message.text).toContain("Support helps SGA decide what to work on.");
    expect(message.text).toContain(`See your idea: ${siteUrl}/ideas/103`);
  });

  it("renders a decline with the reason and the resubmit link", () => {
    const message = renderPostDecidedEmail(declined, "a@example.com", siteUrl);
    expect(message.subject).toBe("Your post was not approved: More vegan options");
    expect(message.text).toContain("The Dining Advisory Board reviewed your post and did not approve it.");
    expect(message.text).toContain(
      "Why it was not approved:\nThis repeats an open idea. Support that one instead.",
    );
    expect(message.text).toContain("send it for review again:");
    expect(message.text).toContain(`${siteUrl}/me/ideas/${ideaId}/edit`);
  });

  it("renders a take-down with the reason and the edit link", () => {
    const message = renderPostDecidedEmail(takenDown, "a@example.com", siteUrl);
    expect(message.subject).toBe("Proposal #103 was taken down");
    expect(message.text).toContain("The Dining Advisory Board took your idea off the ideas list.");
    expect(message.text).toContain("Why it was taken down:\nIt names a person.");
    expect(message.text).toContain(`${siteUrl}/me/ideas/${ideaId}/edit`);
  });

  it("says why it was sent and links the notification settings, last", () => {
    for (const payload of [approved, declined, takenDown]) {
      const text = renderPostDecidedEmail(payload, "a@example.com", siteUrl).text;
      expect(
        text.endsWith(
          "\n\nYou get this email because you posted this idea.\n" +
            `Change which emails you get: ${siteUrl}/me/notifications`,
        ),
      ).toBe(true);
    }
  });

  it("tells an anonymous author that other students do not see their name, and only then", () => {
    const line = "Other students do not see your name.";
    const anonymous = renderPostDecidedEmail({ ...approved, isAnonymous: true }, "a@example.com", siteUrl);
    expect(anonymous.text).toContain(line);
    expect(renderPostDecidedEmail(approved, "a@example.com", siteUrl).text).not.toContain(line);
    expect(
      renderPostDecidedEmail({ ...declined, isAnonymous: true }, "a@example.com", siteUrl).text,
    ).not.toContain(line);
  });

  it("never says petition or vote, and never uses an em dash", () => {
    for (const payload of [approved, declined, takenDown]) {
      const { subject, text } = renderPostDecidedEmail(payload, "a@example.com", siteUrl);
      expect(`${subject}\n${text}`).not.toMatch(/petition|vote|—/i);
    }
  });
});
