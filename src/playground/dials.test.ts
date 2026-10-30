import { describe, expect, it } from "vitest";
import { applyDials, DIALS, INITIAL_DIALS } from "./dials";
import { DEFAULT_TEMPLATE, SHARED_KEYS, emptyOverrides } from "./templates";

describe("playground dials (#29)", () => {
  it("start at the design/tokens.css defaults, so untouched dials copy nothing", () => {
    const o = applyDials(emptyOverrides(), INITIAL_DIALS);
    for (const [key, value] of Object.entries(o.shared)) {
      expect(value, key).toBe(DEFAULT_TEMPLATE.shared[key as keyof typeof DEFAULT_TEMPLATE.shared]);
    }
    expect(o.light).toEqual({});
    expect(o.dark).toEqual({});
  });

  it("only set tokens that exist", () => {
    for (const dial of DIALS)
      for (const choice of Object.values(dial.options))
        for (const key of Object.keys(choice.shared ?? {})) expect(SHARED_KEYS).toContain(key);
  });

  it("apply board colors to light and dark alike", () => {
    const o = applyDials(emptyOverrides(), { ...INITIAL_DIALS, boards: "Soft" });
    expect(o.light["on-board-dining"]).toBe("#111111");
    expect(o.dark["on-board-dining"]).toBe("#111111");
  });
});
