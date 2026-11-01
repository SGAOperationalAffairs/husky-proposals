import { describe, expect, it } from "vitest";
import { ARRIVAL_CAP, arrivalSteps } from "./arrival";

// The posters on the wall rise in one after another when it first arrives
// (#84). Only the first ARRIVAL_CAP posters get their own step, so a long wall
// settles as quickly as a short one.
describe("arrivalSteps", () => {
  it("steps each poster by its place in reading order", () => {
    const steps = arrivalSteps([101, 102, 103]);
    expect([...steps.entries()]).toEqual([
      [101, 0],
      [102, 1],
      [103, 2],
    ]);
  });

  it("holds every poster past the cap at the last step", () => {
    const numbers = Array.from({ length: ARRIVAL_CAP + 4 }, (_, i) => 200 + i);
    const steps = arrivalSteps(numbers);
    expect(steps.get(numbers[ARRIVAL_CAP - 1] as number)).toBe(ARRIVAL_CAP - 1);
    for (const n of numbers.slice(ARRIVAL_CAP)) {
      expect(steps.get(n)).toBe(ARRIVAL_CAP - 1);
    }
  });

  it("returns nothing for an empty wall", () => {
    expect(arrivalSteps([]).size).toBe(0);
  });
});
