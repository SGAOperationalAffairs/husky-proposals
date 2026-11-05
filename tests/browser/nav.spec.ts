import { expect, test } from "@playwright/test";

// The header tabs (#156). A visitor sees only Ideas, and the leader pages do not
// show for them. The tabs load after the page, so each check waits for them.

test("a visitor sees only the Ideas tab (#156)", async ({ page }) => {
  await page.goto("/");
  const pages = page.getByRole("navigation", { name: "Pages" });
  await expect(pages.getByRole("link")).toHaveCount(1);
  await expect(pages.getByRole("link", { name: "Ideas" })).toHaveAttribute("aria-current", "page");
});

test("a visitor gets no leader or personal page (#156)", async ({ page }) => {
  for (const path of ["/people", "/updates", "/me"]) {
    await page.goto(path);
    await expect(page.getByText("Coming soon", { exact: false })).toHaveCount(0);
  }
});
