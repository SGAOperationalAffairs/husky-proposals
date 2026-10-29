import { expect, test } from "@playwright/test";

// Pages to scan. Add each new route here as it lands.
const PAGES = ["/"];

test.describe("public, but not searchable (PRD D18)", () => {
  for (const path of PAGES) {
    test(`${path} sends noindex as a header and a meta tag`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.headers()["x-robots-tag"]).toBe("noindex");
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    });
  }
});

// Computed-style guard (#20): agents drift into one-off values wherever nothing
// checks. Every visible element's corners and borders must come from the
// tokens in design/tokens.css. Read the allowed values from the page itself.
test.describe("styles come from the tokens", () => {
  for (const path of PAGES) {
    test(`${path} uses only token radii and border widths`, async ({ page }) => {
      await page.goto(path);
      const problems = await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement);
        const token = (name: string) => root.getPropertyValue(name).trim();
        const px = (value: string) => (value === "0" || value === "" ? "0px" : value);
        const radii = new Set(
          ["--card-radius", "--field-radius", "--button-radius", "--chip-radius"].map((n) => px(token(n))),
        );
        radii.add("0px");
        const borders = new Set(["0px", px(token("--border")), px(token("--accent-rule"))]);
        const found: string[] = [];
        for (const el of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
          const box = el.getBoundingClientRect();
          if (box.width === 0 || box.height === 0) continue;
          const s = getComputedStyle(el);
          const tag = `${el.tagName.toLowerCase()}${el.className ? "." + String(el.className).split(" ").join(".") : ""}`;
          for (const corner of [
            s.borderTopLeftRadius,
            s.borderTopRightRadius,
            s.borderBottomRightRadius,
            s.borderBottomLeftRadius,
          ]) {
            if (!radii.has(corner)) found.push(`${tag}: radius ${corner}`);
          }
          for (const width of [
            s.borderTopWidth,
            s.borderRightWidth,
            s.borderBottomWidth,
            s.borderLeftWidth,
          ]) {
            if (!borders.has(width)) found.push(`${tag}: border ${width}`);
          }
        }
        return Array.from(new Set(found));
      });
      expect(problems).toEqual([]);
    });
  }
});
