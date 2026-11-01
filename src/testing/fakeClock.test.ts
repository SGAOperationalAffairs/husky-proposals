import { describe, expect, it } from "vitest";
import type { Clock } from "@/core/clock";
import { createFakeClock } from "./fakeClock";

describe("fake clock (#43)", () => {
  it("starts at the given instant", () => {
    expect(createFakeClock("2026-12-01T09:30:00.000Z").now().toISOString()).toBe("2026-12-01T09:30:00.000Z");
    expect(createFakeClock(new Date("2026-12-02T00:00:00.000Z")).now().toISOString()).toBe(
      "2026-12-02T00:00:00.000Z",
    );
  });

  it("has a fixed default start", () => {
    expect(createFakeClock().now().toISOString()).toBe("2026-11-02T14:00:00.000Z");
  });

  it("advances by exactly the amount given", () => {
    const clock = createFakeClock("2026-11-02T14:00:00.000Z");
    clock.advance({ days: 3 });
    expect(clock.now().toISOString()).toBe("2026-11-05T14:00:00.000Z");
    clock.advance({ hours: 2, minutes: 15 });
    expect(clock.now().toISOString()).toBe("2026-11-05T16:15:00.000Z");
  });

  it("goes back only with set", () => {
    const clock = createFakeClock("2026-11-02T14:00:00.000Z");
    expect(() => clock.advance({ days: -1 })).toThrow(/negative/);
    clock.set("2026-10-01T00:00:00.000Z");
    expect(clock.now().toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });

  it("hands out copies, so callers cannot move the clock", () => {
    const clock = createFakeClock("2026-11-02T14:00:00.000Z");
    clock.now().setUTCFullYear(1999);
    expect(clock.now().toISOString()).toBe("2026-11-02T14:00:00.000Z");
  });

  it("satisfies Clock", () => {
    const clock: Clock = createFakeClock();
    expect(clock.now()).toBeInstanceOf(Date);
  });
});
