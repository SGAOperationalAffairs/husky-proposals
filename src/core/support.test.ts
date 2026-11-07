import { describe, expect, it } from "vitest";
import { checkSupportable, supportInputSchema } from "./support";

describe("support rules (#94)", () => {
  describe("supportInputSchema", () => {
    it("takes a public number and a yes or no", () => {
      expect(supportInputSchema.safeParse({ number: 103, supported: true }).success).toBe(true);
      expect(supportInputSchema.safeParse({ number: 103, supported: false }).success).toBe(true);
    });

    it("refuses a bad number or a missing choice, so it never toggles", () => {
      for (const bad of [
        { number: 0, supported: true },
        { number: -1, supported: true },
        { number: 1.5, supported: true },
        { number: "103", supported: true },
        { number: 103 },
        { number: 103, supported: "yes" },
        {},
      ]) {
        expect(supportInputSchema.safeParse(bad).success).toBe(false);
      }
    });
  });

  describe("checkSupportable", () => {
    it("an approved idea that is not delivered takes support", () => {
      for (const status of ["collecting_support", "under_review", "in_progress", "waiting"] as const) {
        expect(checkSupportable({ reviewStatus: "approved", status })).toEqual({ ok: true });
      }
    });

    it("a delivered idea is closed", () => {
      expect(checkSupportable({ reviewStatus: "approved", status: "delivered" })).toEqual({
        ok: false,
        error: { code: "closed" },
      });
    });

    it("a post that is not approved is closed", () => {
      for (const reviewStatus of ["pending", "declined", "withdrawn"] as const) {
        expect(checkSupportable({ reviewStatus, status: "collecting_support" })).toEqual({
          ok: false,
          error: { code: "closed" },
        });
      }
    });
  });
});
