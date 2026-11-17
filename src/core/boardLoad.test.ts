import { describe, expect, it } from "vitest";
import { boardLoad, startHeadsUp } from "./boardLoad";

describe("board load (#98)", () => {
  describe("boardLoad", () => {
    it("counts one per idea and two for a large one", () => {
      expect(boardLoad([])).toBe(0);
      expect(boardLoad(["small", "medium"])).toBe(2);
      expect(boardLoad(["large"])).toBe(2);
      expect(boardLoad(["large", "small"])).toBe(3);
    });

    it("counts an unknown or missing scale as one", () => {
      expect(boardLoad([null, "huge"])).toBe(2);
    });
  });

  describe("startHeadsUp", () => {
    it("is null while the new idea fits the guideline", () => {
      expect(startHeadsUp({ inProgressScales: [], guideline: 2, scale: "large" })).toBeNull();
      expect(startHeadsUp({ inProgressScales: ["small"], guideline: 2, scale: "small" })).toBeNull();
    });

    it("warns once the new idea would pass the guideline, naming how many are in progress", () => {
      expect(startHeadsUp({ inProgressScales: ["small", "medium"], guideline: 2, scale: "small" })).toEqual({
        inProgress: 2,
        guideline: 2,
      });
    });

    it("counts a large new idea as two", () => {
      expect(startHeadsUp({ inProgressScales: ["small"], guideline: 2, scale: "large" })).toEqual({
        inProgress: 1,
        guideline: 2,
      });
    });

    it("counts a large idea already in progress as two", () => {
      expect(startHeadsUp({ inProgressScales: ["large"], guideline: 2, scale: "small" })).toEqual({
        inProgress: 1,
        guideline: 2,
      });
    });

    it("reports the number of ideas, not the load", () => {
      const result = startHeadsUp({ inProgressScales: ["large", "small"], guideline: 2, scale: "small" });
      expect(result).toEqual({ inProgress: 2, guideline: 2 });
    });
  });
});
