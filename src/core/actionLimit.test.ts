import { describe, expect, it } from "vitest";
import { ACTION_LIMIT, checkActionCount, windowStart } from "./actionLimit";

describe("action limit (#94)", () => {
  it("windowStart truncates to the UTC minute", () => {
    expect(windowStart(new Date("2026-11-06T15:04:59.999Z"))).toEqual(new Date("2026-11-06T15:04:00.000Z"));
    expect(windowStart(new Date("2026-11-06T15:05:00.000Z"))).toEqual(new Date("2026-11-06T15:05:00.000Z"));
  });

  it("the limit is 60 changes a minute: 60 passes and 61 does not", () => {
    expect(ACTION_LIMIT).toBe(60);
    expect(checkActionCount(1)).toEqual({ ok: true });
    expect(checkActionCount(60)).toEqual({ ok: true });
    expect(checkActionCount(61)).toEqual({ ok: false, error: { code: "rate_limited" } });
  });
});
