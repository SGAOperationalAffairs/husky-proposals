import { expect, test } from "@playwright/test";

// The People page (#243). A leader's view needs the stand-in, which production builds leave out,
// so the enabled and hidden states of Message selected are covered by component tests
// (src/app/_people/PeopleView.test.tsx). This file checks only what a visitor sees.

test("a signed-out visitor sees no message link or copy button on /people (#243)", async ({ page }) => {
  await page.goto("/people");
  await expect(page.getByText("Message selected")).toHaveCount(0);
  await expect(page.getByText("Copy addresses")).toHaveCount(0);
  await expect(page.getByText("Opens your own email app")).toHaveCount(0);
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);

  const response = await page.request.get("/people");
  const html = await response.text();
  expect(html).not.toContain("Message selected");
  expect(html).not.toContain("Copy addresses");
});
