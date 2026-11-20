import { describe, expect, it } from "vitest";
import { signUnsubscribeToken, unsubscribeUrl, verifyUnsubscribeToken } from "./unsubscribeToken";

const SECRET = "k".repeat(40);
const userId = "00000000-0000-4000-8000-0000000000a1";
const otherId = "00000000-0000-4000-8000-0000000000a2";

describe("unsubscribe tokens (#212)", () => {
  it("round-trips the student and the type", () => {
    const token = signUnsubscribeToken(SECRET, "digest", userId);
    expect(verifyUnsubscribeToken(SECRET, token)).toEqual({ userId, type: "digest" });
  });

  it("gives the same token every time, so a resent link is the same link", () => {
    expect(signUnsubscribeToken(SECRET, "digest", userId)).toBe(
      signUnsubscribeToken(SECRET, "digest", userId),
    );
  });

  it("refuses a changed user id, type, or signature", () => {
    const token = signUnsubscribeToken(SECRET, "digest", userId);
    const [type, , signature] = token.split(".") as [string, string, string];
    expect(verifyUnsubscribeToken(SECRET, `${type}.${otherId}.${signature}`)).toBeNull();
    expect(verifyUnsubscribeToken(SECRET, `idea_event.${userId}.${signature}`)).toBeNull();
    const flipped = signature.startsWith("A") ? `B${signature.slice(1)}` : `A${signature.slice(1)}`;
    expect(verifyUnsubscribeToken(SECRET, `${type}.${userId}.${flipped}`)).toBeNull();
  });

  it("refuses a token signed with another secret", () => {
    const token = signUnsubscribeToken("z".repeat(40), "digest", userId);
    expect(verifyUnsubscribeToken(SECRET, token)).toBeNull();
  });

  it("refuses a type a student cannot set, even with a good signature", () => {
    const forged = signUnsubscribeToken(SECRET, "digest", userId).replace("digest", "reviewer_reminder");
    expect(verifyUnsubscribeToken(SECRET, forged)).toBeNull();
  });

  it("refuses junk without throwing", () => {
    for (const junk of ["", ".", "digest", "digest.x", "digest.x.y", `digest.${userId}.`, "a.b.c.d", "%%%"]) {
      expect(verifyUnsubscribeToken(SECRET, junk), junk).toBeNull();
    }
  });

  it("builds a link on the site with the token encoded", () => {
    const token = signUnsubscribeToken(SECRET, "digest", userId);
    const url = unsubscribeUrl("https://proposals.example.com", token);
    expect(url.startsWith("https://proposals.example.com/unsubscribe?t=")).toBe(true);
    expect(verifyUnsubscribeToken(SECRET, new URL(url).searchParams.get("t") ?? "")).toEqual({
      userId,
      type: "digest",
    });
  });
});
