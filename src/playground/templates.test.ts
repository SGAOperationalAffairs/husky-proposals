import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  COLOR_KEYS,
  DEFAULT_TEMPLATE,
  SHARED_KEYS,
  TEMPLATES,
  emptyOverrides,
  settingsBlob,
} from "./templates";

// Read the :root and dark :root blocks of design/tokens.css as plain maps.
function tokensCss() {
  const css = readFileSync("design/tokens.css", "utf8");
  const read = (block: string) =>
    Object.fromEntries(
      Array.from(block.matchAll(/--([\w-]+):\s*([^;]+);/g), (m) => [m[1], m[2]!.replace(/\s+/g, " ").trim()]),
    );
  const darkStart = css.indexOf("@media (prefers-color-scheme: dark)");
  return { light: read(css.slice(0, darkStart)), dark: read(css.slice(darkStart)) };
}

describe("playground templates (#29)", () => {
  it("every template defines every token, in both modes", () => {
    for (const t of TEMPLATES) {
      expect(Object.keys(t.shared).sort(), t.id).toEqual([...SHARED_KEYS].sort());
      expect(Object.keys(t.light).sort(), t.id).toEqual([...COLOR_KEYS].sort());
      expect(Object.keys(t.dark).sort(), t.id).toEqual([...COLOR_KEYS].sort());
    }
  });

  it("Full color matches design/tokens.css, so the defaults have one source", () => {
    const css = tokensCss();
    for (const key of SHARED_KEYS) expect(css.light[key], key).toBe(DEFAULT_TEMPLATE.shared[key]);
    // accent-soft is derived on :root in tokens.css; templates set it directly.
    for (const key of COLOR_KEYS.filter((k) => k !== "accent-soft")) {
      expect(css.light[key], key).toBe(DEFAULT_TEMPLATE.light[key]);
      expect(css.dark[key] ?? css.light[key], `dark ${key}`).toBe(DEFAULT_TEMPLATE.dark[key]);
    }
  });

  it("copy settings lists only what differs from the defaults", () => {
    expect(settingsBlob(DEFAULT_TEMPLATE, emptyOverrides())).toMatchObject({
      template: "full",
      light: {},
      dark: {},
    });
    const band = TEMPLATES.find((t) => t.id === "band")!;
    const blob = settingsBlob(band, { ...emptyOverrides(), shared: { "card-radius": "8px" } });
    expect(blob.poster).toBe("band");
    expect(blob.light["--card-radius"]).toBe("8px");
    expect(blob.light["--font"]).toBeUndefined();
    expect(blob.css).toContain("--card-radius: 8px;");
  });
});
