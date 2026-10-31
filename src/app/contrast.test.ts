import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrast as ratio } from "@/playground/contrast";

// Every text and background pairing in docs/DESIGN.md, "Contrast", meets WCAG AA
// (4.5:1) in light and dark mode, computed from design/tokens.css (#37).
function tokens() {
  const css = readFileSync("design/tokens.css", "utf8");
  const read = (block: string) =>
    Object.fromEntries(Array.from(block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/gi), (m) => [m[1]!, m[2]!]));
  const darkStart = css.indexOf("@media (prefers-color-scheme: dark)");
  const light = read(css.slice(0, darkStart));
  // Dark mode overrides only some tokens; the rest carry over from :root.
  return { light, dark: { ...light, ...read(css.slice(darkStart)) } };
}

const BOARDS = ["dining", "planning", "services", "green", "sust"];

// [text, background]. The waiting chip is grey-ink on a transparent background,
// so it sits on bg or surface.
const PAIRS: [string, string][] = [
  ["ink", "bg"],
  ["ink", "surface"],
  ["muted", "bg"],
  ["muted", "surface"],
  ["accent-text", "bg"],
  ["accent-text", "surface"],
  ["on-accent", "accent"],
  ["grey-ink", "grey"],
  ["sky-ink", "sky"],
  ["amber-ink", "amber"],
  ["green-ink", "green"],
  ["grey-ink", "bg"],
  ["grey-ink", "surface"],
  ["focus", "bg"],
  ["focus", "surface"],
  ...BOARDS.map((b): [string, string] => [`on-board-${b}`, `board-${b}`]),
  // An idea page's accent takes its board's color (#64): links and tab text.
  ...BOARDS.flatMap((b): [string, string][] => [
    [`board-${b}-text`, "bg"],
    [`board-${b}-text`, "surface"],
  ]),
];

describe("token contrast (#37)", () => {
  const modes = tokens();
  for (const mode of ["light", "dark"] as const) {
    it.each(PAIRS)(`${mode}: %s on %s meets 4.5:1`, (text, bg) => {
      const fg = modes[mode][text];
      const back = modes[mode][bg];
      expect(fg, `--${text} is a hex color in ${mode}`).toBeDefined();
      expect(back, `--${bg} is a hex color in ${mode}`).toBeDefined();
      expect(ratio(fg!, back!)).toBeGreaterThanOrEqual(4.5);
    });
  }
});
