import { expect, test } from "@playwright/test";

// The on-screen error floater (#191). The browser tests run with APP_ENV=test, which
// shows it. A thrown server action is covered by unit tests until one can be reached
// signed out here, so these check what the browser itself throws.

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  // The floater mounts after the page, once its request-time gate has run.
  await page.waitForLoadState("networkidle");
});

const throwLater = (page: import("@playwright/test").Page, message: string) =>
  page.evaluate((text) => {
    setTimeout(() => {
      throw new Error(text);
    });
  }, message);

// The panel also holds a screen-reader-only live region that repeats each message inside a
// longer sentence, so a text lookup must match the whole text, or it finds two elements.
const text = (panel: import("@playwright/test").Locator, value: string) =>
  panel.getByText(value, { exact: true });

test("an uncaught exception shows in the panel, and a repeat collapses (#191)", async ({ page }) => {
  // Not a failure of the page under test: the thrown error is the test input.
  page.on("pageerror", () => {});
  await throwLater(page, "check one");
  const panel = page.getByRole("region", { name: "Errors on this page" });
  await expect(panel).toBeVisible();
  await expect(text(panel, "Browser")).toBeVisible();
  await expect(text(panel, "check one")).toBeVisible();
  await throwLater(page, "check one");
  await expect(text(panel, "2 times")).toBeVisible();
});

test("a rejected promise adds a second entry (#191)", async ({ page }) => {
  page.on("pageerror", () => {});
  await throwLater(page, "check one");
  await page.evaluate(() => {
    void Promise.reject(new Error("check two"));
  });
  const panel = page.getByRole("region", { name: "Errors on this page" });
  await expect(text(panel, "check one")).toBeVisible();
  await expect(text(panel, "check two")).toBeVisible();
});

test("dismiss and Clear all work by keyboard (#191)", async ({ page }) => {
  page.on("pageerror", () => {});
  await throwLater(page, "check one");
  await page.evaluate(() => {
    void Promise.reject(new Error("check two"));
  });
  const panel = page.getByRole("region", { name: "Errors on this page" });
  await expect(text(panel, "check two")).toBeVisible();

  await panel.getByRole("button", { name: "Dismiss this error" }).first().focus();
  await page.keyboard.press("Enter");
  await expect(text(panel, "check two")).toHaveCount(0);
  await expect(text(panel, "check one")).toBeVisible();

  await panel.getByRole("button", { name: "Clear all" }).focus();
  await page.keyboard.press("Enter");
  await expect(panel).toHaveCount(0);
});
