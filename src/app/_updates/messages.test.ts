import { describe, expect, it } from "vitest";
import { UPDATE_CODES, updateMessage } from "./messages";

describe("update messages (#130)", () => {
  it("every code has copy that is not empty", () => {
    for (const code of UPDATE_CODES) {
      expect(updateMessage(code, undefined).text.length).toBeGreaterThan(0);
    }
  });

  it("an invalid body says what to fix, on the body field", () => {
    expect(updateMessage("invalid", ["body"])).toEqual({
      text: "Write the update students will read, up to 1,000 characters.",
      field: "body",
      refresh: false,
    });
  });

  it("an invalid result for anything else says Try again, with no field", () => {
    expect(updateMessage("invalid", ["ideaId"])).toEqual({
      text: "That didn't go through. Try again.",
      refresh: false,
    });
  });

  it("a leftover placeholder shows on the body field", () => {
    expect(updateMessage("body_placeholder", undefined)).toEqual({
      text: "Replace the parts in [brackets] before you post.",
      field: "body",
      refresh: false,
    });
  });

  it("only a stale list refreshes the page", () => {
    const refreshing = UPDATE_CODES.filter((code) => updateMessage(code, undefined).refresh);
    expect(refreshing.sort()).toEqual(["not_found", "not_in_progress"]);
    expect(updateMessage("not_in_progress", undefined).text).toBe(
      "This idea is no longer in progress. The list now shows where it stands.",
    );
  });

  it("the other expected failures use the plan's words", () => {
    expect(updateMessage("not_allowed", undefined).text).toBe(
      "Only this board's chair or director, or the VP, can post updates on its ideas.",
    );
    expect(updateMessage("signed_out", undefined).text).toBe(
      "You're signed out. Sign in again to post an update.",
    );
  });
});
