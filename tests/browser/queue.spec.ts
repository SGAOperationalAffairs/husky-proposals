import { expect, test } from "@playwright/test";

// The SGA queue (#124). A leader's view needs the stand-in, which production builds
// leave out, so the counts and filters are covered by component tests
// (src/app/queue/QueueView.test.tsx). This file checks only what a visitor sees.

// The page streams its shell first, so the status can be 200 (notFound() runs after
// the shell is out); assert what the visitor sees instead (#158).
test("the queue is not shown to a signed-out visitor (#124)", async ({ page }) => {
  await page.goto("/queue");
  await expect(page.getByRole("tablist", { name: "Queue" })).toHaveCount(0);
});

// Nothing that names the page may sit in the static shell (#158). The raw response
// covers the streamed HTML and the inline RSC payload, not only what renders.
test("the queue page does not name itself to a signed-out visitor (#158)", async ({ page }) => {
  await page.goto("/queue");
  await expect(page.getByRole("heading", { name: "SGA queue" })).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("SGA queue");

  const response = await page.request.get("/queue");
  expect(await response.text()).not.toContain("SGA queue");
});
