import { expect, test } from "@playwright/test";

// Pages to scan. Add each new route here as it lands.
const PAGES = ["/", "/in-progress", "/ideas/103"];

test("the style playground is not in a production build (#29)", async ({ page }) => {
  const response = await page.goto("/playground");
  expect(response?.status()).toBe(404);
});

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
    // Corners only: border widths are a convention by role, not a guarded rule (#33).
    test(`${path} uses only token radii`, async ({ page }) => {
      await page.goto(path);
      const problems = await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement);
        const token = (name: string) => root.getPropertyValue(name).trim();
        const px = (value: string) => (value === "0" || value === "" ? "0px" : value);
        const radii = new Set(
          ["--card-radius", "--field-radius", "--button-radius", "--chip-radius"].map((n) => px(token(n))),
        );
        radii.add("0px");
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
        }
        return Array.from(new Set(found));
      });
      expect(problems).toEqual([]);
    });
  }
});

// Everything a student can click shows the pointer, even before it does
// anything (E6 wires Support), so the page never feels broken.
test.describe("clickable things show the pointer", () => {
  for (const path of PAGES) {
    test(`${path}: every link, button, and dropdown has cursor: pointer`, async ({ page }) => {
      await page.goto(path);
      const problems = await page.evaluate(() => {
        const clickable =
          'a[href], button, select, summary, [role="button"], [role="tab"], input[type="submit"]';
        return Array.from(document.querySelectorAll<HTMLElement>(clickable))
          .filter((el) => el.getBoundingClientRect().width > 0 && !el.matches(":disabled"))
          .filter((el) => getComputedStyle(el).cursor !== "pointer")
          .map((el) => `${el.tagName.toLowerCase()} "${(el.textContent ?? "").trim().slice(0, 30)}"`);
      });
      expect(problems).toEqual([]);
    });
  }
});
