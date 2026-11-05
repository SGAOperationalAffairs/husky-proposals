import { describe, expect, it } from "vitest";
import { decisionMessage, DECISION_CODES } from "./messages";

// The words for every way a decision can fail (#59).
const CONTEXTS = ["decide", "take_down"] as const;

describe("decision messages (#59)", () => {
  it("has copy for every code in both contexts", () => {
    for (const code of DECISION_CODES) {
      for (const context of CONTEXTS) {
        expect(decisionMessage(code, context, undefined).text.length, `${code} ${context}`).toBeGreaterThan(
          0,
        );
      }
    }
  });

  it("refreshes the list when someone else got there first, or the post is gone", () => {
    for (const code of ["already_decided", "not_found"] as const) {
      expect(decisionMessage(code, "decide", undefined).refresh).toBe(true);
    }
    expect(decisionMessage("not_allowed", "decide", undefined).refresh).toBe(false);
  });

  it("points the reason errors at the reason field", () => {
    expect(decisionMessage("reason_required", "decide", undefined)).toMatchObject({ field: "reason" });
    expect(decisionMessage("invalid", "decide", ["reason"])).toMatchObject({ field: "reason" });
    expect(decisionMessage("invalid", "decide", ["ideaId"]).field).toBeUndefined();
  });

  it("explains a take-down on an idea that is no longer approved", () => {
    expect(decisionMessage("invalid_transition", "take_down", undefined)).toMatchObject({
      text: "This idea is no longer approved.",
      refresh: true,
    });
    expect(decisionMessage("invalid_transition", "decide", undefined).text).toBe(
      "That didn't go through. Try again.",
    );
  });

  it("tells a reviewer they cannot decide their own post", () => {
    expect(decisionMessage("own_post", "decide", undefined).text).toBe(
      "You posted this, so another reviewer has to decide it.",
    );
  });

  it("never promises anything or uses the banned words", () => {
    for (const code of DECISION_CODES) {
      for (const context of CONTEXTS) {
        const text = decisionMessage(code, context, ["reason"]).text.toLowerCase();
        for (const banned of ["petition", "vote", "slots", "will be done", "guarantee"]) {
          expect(text, `${code} ${context}`).not.toContain(banned);
        }
      }
    }
  });
});
