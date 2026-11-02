import { describe, expect, it } from "vitest";
import { BOARDS, BOARD_CODES } from "./boards";

// What each category is about (wording to be confirmed by SGA). Pinned here, so a
// change to it is a deliberate one.
describe("board descriptions", () => {
  it("gives every category its one-line description", () => {
    expect(BOARD_CODES.map((code) => [BOARDS[code].category, BOARDS[code].description])).toEqual([
      ["Dining", "Meals, dining halls, and food on campus."],
      ["Campus Planning", "Buildings, outdoor spaces, and how campus is laid out."],
      ["Campus Services", "Everyday services on campus, like facilities, mail, and IT."],
      ["Green Initiatives", "Projects that make campus greener, like energy, water, and waste."],
      ["Sustainability", "Long-term goals for sustainability and climate on campus."],
    ]);
  });
});
