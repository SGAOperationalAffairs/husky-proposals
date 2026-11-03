import { describe, expect, it } from "vitest";
import { COST_LABELS, SCALE_LABELS, TIME_LABELS } from "./ideaFacts";
import { prismaEnum } from "./testing/prismaEnum";

describe("idea fact labels (#60)", () => {
  it("have one label for every IdeaScale, CostBand, and TimeHorizon value", () => {
    expect(Object.keys(SCALE_LABELS).sort()).toEqual(prismaEnum("IdeaScale").sort());
    expect(Object.keys(COST_LABELS).sort()).toEqual(prismaEnum("CostBand").sort());
    expect(Object.keys(TIME_LABELS).sort()).toEqual(prismaEnum("TimeHorizon").sort());
  });

  it("use the post form's words", () => {
    expect(COST_LABELS.over_5k).toBe("$5k or more");
    expect(SCALE_LABELS.large).toBe("Large");
    expect(TIME_LABELS.within_a_year).toBe("Within a year");
  });
});
