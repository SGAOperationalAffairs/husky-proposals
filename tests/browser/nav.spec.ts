import { expect, test } from "@playwright/test";

// The header tabs (#156). A visitor sees only Ideas, and the leader pages do not
// show for them. The tabs load after the page, so each check waits for them.
// Signed-in viewers (a student, a board member who is not a lead) need the
// stand-in, which production builds leave out, so who may open a leader page is
// covered by requireLeader's unit tests (src/auth/gate.test.ts).

test("a visitor sees only the Ideas tab (#156)", async ({ page }) => {
  await page.goto("/");
  const pages = page.getByRole("navigation", { name: "Pages" });
  await expect(pages.getByRole("link")).toHaveCount(1);
  await expect(pages.getByRole("link", { name: "Ideas" })).toHaveAttribute("aria-current", "page");
});

// My ideas is a student page, not a leader page: a signed-out visitor is sent to sign-in
// (requireSignedIn), so the check is that no part of the page shows, not not-found (#193).
test("/me sends a visitor to sign-in and shows nothing of the page (#193)", async ({ page }) => {
  await page.goto("/me");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fme/);
  await expect(page.getByRole("heading", { name: "My ideas", exact: true })).toHaveCount(0);
  const pages = page.getByRole("navigation", { name: "Pages" });
  await expect(pages.getByRole("link", { name: "My ideas", exact: true })).toHaveCount(0);
});

// The page streams its shell first, so the status can be 200 (see queue.spec.ts);
// assert that nothing of the page shows once the check has run.
for (const [path, title] of [
  ["/people", "People"],
  ["/updates", "Updates"],
] as const) {
  test(`${path} shows a visitor nothing of the page (#156)`, async ({ page }) => {
    await page.goto(path);
    // The not-found page is what the check ends in, so wait for it before asserting absence.
    await expect(page.getByText("This page could not be found")).toBeVisible();
    await expect(page.getByRole("heading", { name: title, exact: true })).toHaveCount(0);
    await expect(page.getByText("Coming soon", { exact: false })).toHaveCount(0);
    const pages = page.getByRole("navigation", { name: "Pages" });
    await expect(pages.getByRole("link", { name: title, exact: true })).toHaveCount(0);
  });
}
