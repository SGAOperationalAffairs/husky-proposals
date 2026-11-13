import { describe, expect, it } from "vitest";
import { statusMessage, STATUS_CODES } from "./messages";

// The words for every way a status change can fail (#98).
describe("status messages (#98)", () => {
  it("has copy for every code", () => {
    for (const code of STATUS_CODES) {
      expect(statusMessage(code, undefined).text.length, code).toBeGreaterThan(0);
    }
  });

  it("says the same thing when someone else changed the status first", () => {
    const text = "Someone already changed this idea's status. The page now shows where it stands.";
    for (const code of ["already_changed", "invalid_transition", "same_status"] as const) {
      expect(statusMessage(code, undefined)).toEqual({ text, refresh: true });
    }
  });

  it("refreshes the page when the idea changed or is gone, and only then", () => {
    for (const code of ["already_changed", "invalid_transition", "same_status", "not_found"] as const) {
      expect(statusMessage(code, undefined).refresh, code).toBe(true);
    }
    for (const code of ["not_allowed", "signed_out", "cross_origin", "unexpected", "invalid"] as const) {
      expect(statusMessage(code, undefined).refresh, code).toBe(false);
    }
  });

  it("names who may change a board's status", () => {
    expect(statusMessage("not_allowed", undefined).text).toBe(
      "Only this board's chair or director, or the VP, can change its status.",
    );
  });

  it("points a missing reason at the reason field", () => {
    expect(statusMessage("waiting_reason_required", undefined)).toMatchObject({
      text: "Pick a reason students will see.",
      field: "reason",
    });
    expect(statusMessage("invalid", ["reason"])).toMatchObject({ field: "reason" });
    expect(statusMessage("invalid", ["ideaId"]).field).toBeUndefined();
  });

  it("uses the plain try-again line for anything unexpected", () => {
    for (const code of ["invalid", "cross_origin", "unexpected"] as const) {
      expect(statusMessage(code, ["ideaId"]).text).toBe("That didn't go through. Try again.");
    }
  });

  it("never promises anything, uses the banned words, or uses an em dash", () => {
    for (const code of STATUS_CODES) {
      const text = statusMessage(code, ["reason"]).text.toLowerCase();
      for (const banned of ["petition", "vote", "slots", "will be done", "guarantee", "—"]) {
        expect(text, code).not.toContain(banned);
      }
    }
  });
});
