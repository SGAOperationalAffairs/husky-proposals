import { expect, test } from "@playwright/test";

test.describe("ideas list (#61)", () => {
  test("shows the wall of posters signed out", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Ideas for campus" })).toBeVisible();
    await expect(page.locator("article.poster").first()).toBeVisible();
  });

  test("a board chip filters the wall and marks itself chosen", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Boards" })
      .getByRole("link", { name: "Green Initiatives" })
      .click();
    await expect(page).toHaveURL(/board=GIB/);
    const chip = page.getByRole("link", { name: "Green Initiatives" });
    await expect(chip).toHaveAttribute("aria-current", "true");
    const posters = page.locator("article.poster");
    await expect(posters.first()).toBeVisible();
    for (const poster of await posters.all()) await expect(poster).toHaveAttribute("data-board", "green");
  });

  test("changing the status filter applies it without a button", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Status").selectOption("waiting");
    await expect(page).toHaveURL(/status=waiting/);
    await expect(page.getByRole("status")).toHaveText("1 idea");
  });

  test("a search with no match says what to try", async ({ page }) => {
    await page.goto("/?q=zeppelin");
    await expect(page.getByText("No ideas match. Try a different search or another board.")).toBeVisible();
  });
});

test.describe("idea page (#62)", () => {
  test("Learn more opens the idea's own page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Learn more about proposal 131" }).click();
    await expect(page).toHaveURL(/\/ideas\/131$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "A late-night dining option on weeknights",
    );
    await expect(page.getByText("Posted by Jordan P., 40 days ago")).toBeVisible();
  });

  test("an anonymous post shows no name", async ({ page }) => {
    await page.goto("/ideas/151");
    await expect(page.getByText("Posted by a student, 18 days ago")).toBeVisible();
  });

  test("a waiting idea says why", async ({ page }) => {
    await page.goto("/ideas/140");
    await expect(
      page.getByText("On hold. Waiting on university partners. It stays on the list and keeps its support."),
    ).toBeVisible();
  });

  // The shell streams first, so the status is 200 (see not-found.tsx); assert what students see.
  test("unknown or malformed numbers say no idea has that number", async ({ page }) => {
    for (const path of ["/ideas/9999", "/ideas/abc"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: "No idea with that number" }), path).toBeVisible();
    }
  });
});
