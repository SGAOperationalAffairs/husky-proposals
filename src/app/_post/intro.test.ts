import { describe, expect, it } from "vitest";
import { POST_INTRO } from "./intro";

describe("POST_INTRO", () => {
  for (const [length, text] of Object.entries(POST_INTRO)) {
    it(`the ${length} intro promises no action and uses no em dashes`, () => {
      expect(text).not.toMatch(/—/);
      expect(text).not.toMatch(/petition|will be approved|will be built|will be fixed|we will/i);
      expect(text).toMatch(/reviewed before it shows/);
    });
  }

  it("says support helps SGA decide, in both lengths", () => {
    expect(POST_INTRO.long).toMatch(/Support helps SGA decide/);
  });

  it("the short version is shorter than the long one", () => {
    expect(POST_INTRO.short.length).toBeLessThan(POST_INTRO.long.length / 2);
  });
});
