import { describe, expect, it } from "vitest";
import { acceptsEmail, userAcceptsEmail } from "./emailFilters";

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
