import { describe, expect, it } from "vitest";
import {
  acceptsEmail,
  followerPreferenceWhere,
  preferenceAllowsFollowerEmail,
  userAcceptsEmail,
} from "./emailFilters";

const stoppedAt = new Date("2026-11-02T14:00:00.000Z");

describe("may we send this type (#211)", () => {
  it("accepts a user who has turned nothing off", () => {
    expect(userAcceptsEmail({ emailStoppedAt: null, emailOptOuts: [] }, "post_decided")).toBe(true);
  });

  it("refuses only the type the user turned off", () => {
    const user = { emailStoppedAt: null, emailOptOuts: [{ type: "post_decided" as const }] };
    expect(userAcceptsEmail(user, "post_decided")).toBe(false);
    expect(userAcceptsEmail(user, "post_status")).toBe(true);
  });

  it("refuses every type for a stopped account, whatever the toggles say", () => {
    const user = { emailStoppedAt: stoppedAt, emailOptOuts: [] };
    for (const type of ["post_decided", "post_status", "digest", "idea_event"] as const) {
      expect(userAcceptsEmail(user, type), type).toBe(false);
    }
  });

  it("builds the same rule as a query filter", () => {
    expect(acceptsEmail("digest")).toEqual({
      emailStoppedAt: null,
      emailOptOuts: { none: { type: "digest" } },
    });
  });
});

describe("may we send a follower email (#257)", () => {
  const on = { unsubscribedAt: null, bouncedAt: null, digestFrequency: "weekly" as const };

  it("accepts a follower with no preference row or a clean one", () => {
    expect(preferenceAllowsFollowerEmail(null)).toBe(true);
    expect(preferenceAllowsFollowerEmail(on)).toBe(true);
    expect(preferenceAllowsFollowerEmail({ ...on, digestFrequency: "as_it_happens" })).toBe(true);
  });

  it("refuses an unsubscribed, bounced, or digest-off follower", () => {
    expect(preferenceAllowsFollowerEmail({ ...on, unsubscribedAt: stoppedAt })).toBe(false);
    expect(preferenceAllowsFollowerEmail({ ...on, bouncedAt: stoppedAt })).toBe(false);
    expect(preferenceAllowsFollowerEmail({ ...on, digestFrequency: "off" })).toBe(false);
  });

  it("builds the same rule as a query filter", () => {
    expect(followerPreferenceWhere).toEqual({
      OR: [
        { emailPreference: null },
        { emailPreference: { unsubscribedAt: null, bouncedAt: null, digestFrequency: { not: "off" } } },
      ],
    });
  });
});
