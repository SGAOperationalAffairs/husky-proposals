import { describe, expect, it } from "vitest";
import { shorten, tokenValue } from "./posterImage";

describe("poster image helpers (#64)", () => {
  const css =
    ":root {\n  --board-green: #2e7d32;\n}\n@media (prefers-color-scheme: dark) {\n  :root {\n    --board-green: #3a9a3f;\n  }\n}";

  it("reads a token's light-mode value", () => {
    expect(tokenValue(css, "board-green")).toBe("#2e7d32");
    expect(() => tokenValue(css, "board-nope")).toThrow(/--board-nope/);
  });

  it("cuts long text at a word", () => {
    expect(shorten("short", 10)).toBe("short");
    expect(shorten("a free place to pick up groceries", 14)).toBe("a free place...");
  });
});
