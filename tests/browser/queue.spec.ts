import { expect, test } from "@playwright/test";

// The SGA queue (#124). A leader's view needs the stand-in, which production builds
// leave out, so the counts and filters are covered by component tests
// (src/app/queue/QueueView.test.tsx). This file checks only what a visitor sees.

// The page streams its shell first, so the status can be 200; assert what the visitor sees (see not-found.tsx).
test("the queue is not shown to a signed-out visitor (#124)", async ({ page }) => {
  await page.goto("/queue");
  await expect(page.getByRole("tablist", { name: "Queue" })).toHaveCount(0);
});
