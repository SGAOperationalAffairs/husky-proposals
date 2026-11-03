import { describe, expect, it } from "vitest";
import { IDEAS_TAG, ideaTag } from "./cacheTags";

describe("public cache tags (#58)", () => {
  it("names the list tag and one tag per idea number", () => {
    expect(IDEAS_TAG).toBe("ideas");
    expect(ideaTag(103)).toBe("idea:103");
  });
});
