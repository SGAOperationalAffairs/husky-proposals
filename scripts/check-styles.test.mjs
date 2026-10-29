import { describe, expect, it } from "vitest";
import { findViolations } from "./check-styles.mjs";

const rulesHit = (source) => findViolations(source).map((v) => `${v.rule}: ${v.text}`);

describe("style guard (#26)", () => {
  it("allows token classes", () => {
    const source = `<div className="accent-rule rounded-card rounded-t-chip rounded-none border border-line bg-surface p-6">x</div>`;
    expect(rulesHit(source)).toEqual([]);
  });

  it("rejects arbitrary values and properties, including with variants", () => {
    expect(rulesHit(`<div className="p-[13px] hover:bg-[#fff] [border-width:3px]" />`)).toEqual([
      "arbitrary Tailwind value: p-[13px]",
      "arbitrary Tailwind value: hover:bg-[#fff]",
      "arbitrary Tailwind property: [border-width:3px]",
    ]);
  });

  it("rejects radius classes that are not tokens, including bare rounded", () => {
    expect(rulesHit(`<div className="rounded-lg rounded md:rounded-full" />`)).toEqual([
      "radius class that is not a token: rounded-lg",
      "radius class that is not a token: rounded",
      "radius class that is not a token: md:rounded-full",
    ]);
  });

  it("rejects shadows and hex colors", () => {
    expect(rulesHit(`<div className="shadow-md" />\nconst c = "#C8102E";`)).toEqual([
      "shadow class: shadow-md",
      'hex color: "#C8102E',
    ]);
  });

  it("ignores prose outside class strings", () => {
    expect(rulesHit(`// a shadow of doubt, rounded numbers, and 3 pending posts`)).toEqual([]);
  });
});
