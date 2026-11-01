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

test.describe("in progress list (#63)", () => {
  test("the header links switch lists and mark the current one", async ({ page }) => {
    await page.goto("/");
    const lists = page.getByRole("navigation", { name: "Lists" });
    await expect(lists.getByRole("link", { name: "Ideas" })).toHaveAttribute("aria-current", "page");
    await lists.getByRole("link", { name: "In progress" }).click();
    await expect(page).toHaveURL(/\/in-progress$/);
    await expect(page.getByRole("heading", { level: 1, name: "In progress" })).toBeVisible();
    await expect(lists.getByRole("link", { name: "In progress" })).toHaveAttribute("aria-current", "page");
  });

  test("shows only ideas in progress or delivered, and no status filter", async ({ page }) => {
    await page.goto("/in-progress");
    await expect(page.getByLabel("Status")).toHaveCount(0);
    const posters = page.locator("article.poster");
    await expect(posters.first()).toBeVisible();
    for (const poster of await posters.all()) {
      await expect(poster).toContainText(/In progress|Delivered/);
    }
  });

  test("a board chip keeps you on In progress", async ({ page }) => {
    await page.goto("/in-progress");
    await page
      .getByRole("navigation", { name: "Boards" })
      .getByRole("link", { name: "Campus Services" })
      .click();
    await expect(page).toHaveURL(/\/in-progress\?board=CSC$/);
    await expect(page.getByText("A late shuttle on Friday nights")).toBeVisible();
  });
});

test.describe("filtering in place (#61)", () => {
  // Wait until the page is interactive. Before that, the form submits the
  // no-JavaScript way, a full reload, which is the intended fallback.
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("a search keeps focus in the search field and the page where it was", async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, 400));
    const search = page.getByLabel("Search", { exact: true });
    await search.fill("dining");
    await search.press("Enter");
    await expect(page).toHaveURL(/q=dining/);
    await expect(page.getByRole("status")).not.toHaveText("8 ideas");
    await expect(search).toBeFocused();
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });

  test("a sort change keeps focus on the dropdown and the page where it was", async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, 400));
    const sort = page.getByLabel("Sort by");
    // selectOption does not focus the dropdown; a person's click or Tab does.
    await sort.focus();
    await sort.selectOption("newest");
    await expect(page).toHaveURL(/sort=newest/);
    await expect(sort).toBeFocused();
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });

  test("Back puts the fields back in step with the list", async ({ page }) => {
    await page.getByLabel("Status").selectOption("waiting");
    await expect(page).toHaveURL(/status=waiting/);
    await page.goBack();
    await expect(page).not.toHaveURL(/status=/);
    await expect(page.getByLabel("Status")).toHaveValue("");
  });
});

test("the search field and its button share one edge (#61)", async ({ page }) => {
  await page.goto("/");
  const edges = await page.evaluate(() => {
    const field = document.querySelector<HTMLElement>('input[name="q"]')!;
    const button = Array.from(document.querySelectorAll("button")).find((b) => b.textContent === "Search")!;
    return {
      fieldRight: getComputedStyle(field).borderRightWidth,
      buttonLeft: getComputedStyle(button).borderLeftWidth,
      gap: Math.round(button.getBoundingClientRect().left - field.getBoundingClientRect().right),
    };
  });
  expect(edges).toEqual({ fieldRight: "0px", buttonLeft: "2px", gap: 0 });
});

test("filtering redraws the cards without asking the server (#61)", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const requests: string[] = [];
  // Links prefetch other pages (idea pages, the In progress tab), sometimes
  // late; those are not this list, so only requests for "/" count.
  page.on("request", (r) => {
    const thisList = new URL(r.url()).pathname === "/";
    if ((r.resourceType() === "fetch" || r.resourceType() === "document") && thisList) requests.push(r.url());
  });
  await page.getByRole("navigation", { name: "Boards" }).getByRole("link", { name: "Dining" }).click();
  await expect(page).toHaveURL(/board=DAB/);
  await page.getByLabel("Sort by").selectOption("newest");
  await expect(page).toHaveURL(/sort=newest/);
  const search = page.getByLabel("Search", { exact: true });
  await search.fill("late");
  await search.press("Enter");
  await expect(page.getByRole("status")).toHaveText("1 idea");
  expect(requests, requests.join(", ")).toEqual([]);
});

test.describe("page transitions (#73)", () => {
  // Record the durations of the view transition animations the browser runs.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { vtDurations: number[]; vtRunning: number };
      w.vtDurations = [];
      w.vtRunning = 0;
      const start = document.startViewTransition?.bind(document);
      if (!start) return;
      document.startViewTransition = ((arg: Parameters<typeof start>[0]) => {
        const vt = start(arg);
        w.vtRunning++;
        vt.finished.finally(() => w.vtRunning--).catch(() => {});
        vt.ready
          .then(() => {
            for (const a of document.getAnimations()) {
              const target = (a.effect as KeyframeEffect | null)?.pseudoElement ?? "";
              if (target.startsWith("::view-transition")) {
                w.vtDurations.push(Number(a.effect?.getComputedTiming().duration ?? 0));
              }
            }
          })
          .catch(() => {});
        return vt;
      }) as typeof document.startViewTransition;
    });
  });

  const openIdea = async (page: import("@playwright/test").Page) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Learn more about proposal 131" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "A late-night dining option on weeknights",
    );
    return page.evaluate(() => (window as unknown as { vtDurations: number[] }).vtDurations);
  };

  test("opening an idea rises into place at the token's duration", async ({ page }) => {
    test.skip(!(await page.evaluate(() => "startViewTransition" in document)), "no view transitions here");
    const durations = await openIdea(page);
    // React also runs zero-length passes for parts that did not change, so
    // check the rise runs at --motion-page and nothing runs longer.
    expect(durations).toContain(240);
    expect(Math.max(...durations)).toBe(240);
  });

  test("switching tabs rises too, and a filter change does not animate", async ({ page }) => {
    test.skip(!(await page.evaluate(() => "startViewTransition" in document)), "no view transitions here");
    await page.goto("/");
    await page.getByRole("navigation", { name: "Lists" }).getByRole("link", { name: "In progress" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "In progress" })).toBeVisible();
    const vt = () => page.evaluate(() => (window as unknown as { vtDurations: number[] }).vtDurations);
    expect(await vt()).toContain(240);
    // The cards rise in after the page does; let both finish before the sort.
    await expect(page.locator("article.poster").filter({ visible: true }).first()).toBeVisible();
    await page.waitForFunction(() => (window as unknown as { vtRunning: number }).vtRunning === 0);
    const before = (await vt()).length;
    // Next keeps the Ideas page in the DOM, hidden, for Back; use the visible one.
    await page.getByLabel("Sort by").filter({ visible: true }).selectOption("newest");
    await expect(page).toHaveURL(/sort=newest/);
    expect((await vt()).slice(before)).toEqual([]);
  });

  // Instant: the browser may still create the animations, at 0 or 0.01ms.
  test("with reduced motion, opening an idea and filtering are instant", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const d of await openIdea(page)) expect(d).toBeLessThanOrEqual(0.01);
    await page.goto("/");
    await page.getByLabel("Status").selectOption("waiting");
    await expect(page.getByRole("status")).toHaveText("1 idea");
    // WebKit keeps finished animations in the list, so check none takes time.
    const slow = await page.evaluate(() =>
      document.getAnimations().filter((a) => Number(a.effect?.getComputedTiming().duration ?? 0) > 0.01),
    );
    expect(slow).toHaveLength(0);
  });
});

test.describe("share (#64)", () => {
  test("the share dialog has the link, the poster, and the flyer with its QR code", async ({ page }) => {
    await page.goto("/ideas/103");
    await page.getByRole("button", { name: "Share", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Share this idea" });
    await expect(dialog.getByLabel("Link to this idea")).toHaveValue(/\/ideas\/103$/);
    await dialog.getByRole("tab", { name: "Flyer" }).click();
    await expect(
      dialog.getByRole("img", { name: /^QR code for http:\/\/localhost:\d+\/ideas\/103$/ }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("the poster is a portrait PNG, and an unknown idea has none", async ({ request }) => {
    const poster = await request.get("/ideas/103/poster");
    expect(poster.status()).toBe(200);
    expect(poster.headers()["content-type"]).toBe("image/png");
    const png = await poster.body();
    // Width and height sit at bytes 16 to 24 of a PNG's header.
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1080, 1350]);
    expect((await request.get("/ideas/9999/poster")).status()).toBe(404);
  });

  test("the flyer page shows the idea and a print button", async ({ page }) => {
    await page.goto("/ideas/103/flyer");
    await expect(page.getByRole("heading", { name: "A student-hosted food pantry" })).toBeVisible();
    await expect(page.getByRole("img", { name: /^QR code for .*\/ideas\/103$/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Print flyer" })).toBeVisible();
  });
});

test("an idea page asks before I'll participate counts (#67)", async ({ page }) => {
  await page.goto("/ideas/131");
  const hand = page.getByRole("button", { name: "I'll participate", pressed: false });
  await hand.click();
  const dialog = page.getByRole("dialog", { name: /^Help with #/ });
  await dialog.getByRole("button", { name: "I'll participate" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Participating", pressed: true })).toBeFocused();
});

test("the wall's hand icon asks before I'll participate counts (#67)", async ({ page }) => {
  await page.goto("/");
  const card = page.locator("article.poster").filter({ hasText: "#131" });
  await card.getByRole("button", { name: "I'll participate" }).click();
  const dialog = page.getByRole("dialog", { name: /^Help with #/ });
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  await expect(card.getByRole("button", { name: "I'll participate" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await card.getByRole("button", { name: "I'll participate" }).click();
  await page
    .getByRole("dialog", { name: /^Help with #/ })
    .getByRole("button", { name: "I'll participate" })
    .click();
  await expect(card.getByRole("button", { name: "I'll participate" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test.describe("toasts (#67)", () => {
  test("support says so in a toast, and Undo takes it back", async ({ page }) => {
    await page.goto("/");
    const card = page.locator("article.poster").filter({ hasText: "#131" });
    const support = card.getByRole("button", { name: "Support" });
    await support.click();
    await expect(page.getByText("You support #131.")).toBeVisible();
    await expect(support).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(support).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByText("You support #131.")).toBeHidden();
  });

  test("a burst of taps keeps one toast per idea, and at most three show", async ({ page }) => {
    await page.goto("/");
    const hearts = page.locator("article.poster").getByRole("button", { name: "Support" });
    for (const i of [0, 0, 0, 1, 2, 3, 4]) await hearts.nth(i).click();
    await expect(page.locator(".toast:not([data-limited])")).toHaveCount(3);
  });

  test("copying the link from the share dialog shows a toast in front of it", async ({ page }) => {
    await page.goto("/ideas/103");
    await page.getByRole("button", { name: "Share", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Copy link" }).click();
    // Headless browsers may block the clipboard; either way the toast says what happened.
    await expect(page.getByText(/^(Link copied\.|Could not copy\.)$/)).toBeVisible();
  });
});
