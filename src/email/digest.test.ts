import { describe, expect, it } from "vitest";
import { DIGEST_BODY_LIMIT } from "@/core/digest";
import {
  DIGEST_PRIORITY,
  digestDedupeKey,
  digestPayloadSchema,
  renderDigestEmail,
  type DigestPayload,
} from "./digest";
import { signUnsubscribeToken, verifyUnsubscribeToken } from "./unsubscribeToken";

const SITE = "https://proposals.example.com";
const SECRET = "k".repeat(40);
const userId = "00000000-0000-4000-8000-0000000000a1";
const token = signUnsubscribeToken(SECRET, "digest", userId);

const payload: DigestPayload = {
  unsubscribeToken: token,
  totalUpdates: 2,
  moreIdeas: 0,
  ideas: [
    {
      ideaNumber: 103,
      ideaTitle: "More vegan options",
      boardId: "DAB",
      moreUpdates: 0,
      updates: [
        { kind: "board", body: "We met with Dining Services today.", postedAt: "2026-11-16T15:00:00.000Z" },
        { kind: "system", body: "Started work on this idea.", postedAt: "2026-11-12T15:00:00.000Z" },
      ],
    },
  ],
};

describe("weekly digest email (#212)", () => {
  it("is priority 3, with one dedupe key per student per day", () => {
    expect(DIGEST_PRIORITY).toBe(3);
    expect(digestDedupeKey(userId, "2026-11-16")).toBe(`digest:${userId}:2026-11-16`);
    expect(digestDedupeKey(userId, "2026-11-17")).not.toBe(digestDedupeKey(userId, "2026-11-16"));
  });

  it("accepts a valid payload and rejects an author id or any extra key", () => {
    expect(digestPayloadSchema.safeParse(payload).success).toBe(true);
    expect(digestPayloadSchema.safeParse({ ...payload, authorId: userId }).success).toBe(false);
    expect(digestPayloadSchema.safeParse({ ...payload, email: "a@example.com" }).success).toBe(false);
    const [idea] = payload.ideas;
    expect(
      digestPayloadSchema.safeParse({ ...payload, ideas: [{ ...idea, authorId: userId }] }).success,
    ).toBe(false);
    expect(
      digestPayloadSchema.safeParse({
        ...payload,
        ideas: [{ ...idea, updates: [{ ...idea!.updates[0], authorId: userId }] }],
      }).success,
    ).toBe(false);
  });

  it("refuses an empty digest", () => {
    expect(digestPayloadSchema.safeParse({ ...payload, ideas: [] }).success).toBe(false);
  });

  it("renders the subject for many updates and for one", () => {
    expect(renderDigestEmail(payload, "a@example.com", SITE).subject).toBe(
      "Your weekly digest: 2 updates on ideas you follow",
    );
    expect(renderDigestEmail({ ...payload, totalUpdates: 1 }, "a@example.com", SITE).subject).toBe(
      "Your weekly digest: 1 update on ideas you follow",
    );
  });

  it("renders each idea with its board, its updates newest first with New York dates, and a link", () => {
    const message = renderDigestEmail(payload, "a@example.com", SITE);
    expect(message.to).toBe("a@example.com");
    expect(message.text.split("\n")).toEqual([
      "Here is what changed on ideas you follow since your last digest.",
      "",
      "Proposal #103: More vegan options",
      "Dining Advisory Board",
      "Mon, Nov 16: We met with Dining Services today.",
      "Thu, Nov 12: Started work on this idea.",
      `See where it stands: ${SITE}/ideas/103`,
      "",
      "You get this weekly digest because you follow these ideas.",
      expect.stringMatching(/^Stop the weekly digest: https:\/\/proposals\.example\.com\/unsubscribe\?t=/),
      `Change which emails you get: ${SITE}/me/notifications`,
    ]);
  });

  it("dates by the New York day, not the UTC day", () => {
    // 02:00 UTC on the 17th is 9 p.m. on the 16th in Boston.
    const late = {
      ...payload,
      ideas: [
        {
          ...payload.ideas[0]!,
          updates: [{ kind: "board" as const, body: "Late note.", postedAt: "2026-11-17T02:00:00.000Z" }],
        },
      ],
    };
    expect(renderDigestEmail(late, "a@example.com", SITE).text).toContain("Mon, Nov 16: Late note.");
  });

  it("puts a working unsubscribe link in the footer", () => {
    const text = renderDigestEmail(payload, "a@example.com", SITE).text;
    const link = /Stop the weekly digest: (\S+)/.exec(text)?.[1] ?? "";
    expect(verifyUnsubscribeToken(SECRET, new URL(link).searchParams.get("t") ?? "")).toEqual({
      userId,
      type: "digest",
    });
    expect(text.endsWith(`Change which emails you get: ${SITE}/me/notifications`)).toBe(true);
  });

  it("trims a long update to the limit with an ellipsis", () => {
    const long = "x".repeat(DIGEST_BODY_LIMIT + 50);
    const text = renderDigestEmail(
      {
        ...payload,
        ideas: [
          {
            ...payload.ideas[0]!,
            updates: [{ kind: "board", body: long, postedAt: "2026-11-16T15:00:00.000Z" }],
          },
        ],
      },
      "a@example.com",
      SITE,
    ).text;
    const line = text.split("\n").find((entry) => entry.startsWith("Mon, Nov 16: ")) ?? "";
    expect(line).toBe(`Mon, Nov 16: ${"x".repeat(DIGEST_BODY_LIMIT - 3)}...`);
  });

  it("says how many updates and ideas were left out", () => {
    const text = renderDigestEmail(
      { ...payload, moreIdeas: 3, ideas: [{ ...payload.ideas[0]!, moreUpdates: 2 }] },
      "a@example.com",
      SITE,
    ).text;
    expect(text).toContain("And 2 more updates.");
    expect(text).toContain("And 3 more ideas with news.");
    const one = renderDigestEmail(
      { ...payload, moreIdeas: 1, ideas: [{ ...payload.ideas[0]!, moreUpdates: 1 }] },
      "a@example.com",
      SITE,
    ).text;
    expect(one).toContain("And 1 more update.");
    expect(one).toContain("And 1 more idea with news.");
  });

  it("names no one, and does not repeat the student's address in the text", () => {
    const text = renderDigestEmail(payload, "private.student@example.com", SITE).text;
    expect(text).not.toContain("private.student@example.com");
  });

  it("never says petition and has no em dash", () => {
    const { subject, text } = renderDigestEmail(payload, "a@example.com", SITE);
    for (const copy of [subject, text]) {
      expect(copy.toLowerCase()).not.toContain("petition");
      expect(copy).not.toContain("—");
    }
  });
});
