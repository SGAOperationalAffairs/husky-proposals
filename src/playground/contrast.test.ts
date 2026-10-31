import { describe, expect, it } from "vitest";
import { contrast, contrastVerdict } from "./contrast";

describe("contrast readout for the board color pickers (#61)", () => {
  it("computes WCAG ratios", () => {
    expect(contrast("#ffffff", "#000000")).toBeCloseTo(21, 5);
    expect(contrast("#ffffff", "#d04800")).toBeCloseTo(4.56, 2);
  });

  it("says plainly what a ratio allows", () => {
    expect(contrastVerdict(4.56)).toBe("passes AA");
    expect(contrastVerdict(3.9)).toBe("headlines only; small text fails AA");
    expect(contrastVerdict(2.5)).toBe("fails AA");
  });
});
