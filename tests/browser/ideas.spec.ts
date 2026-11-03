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

test.describe("one list with picked-up ideas (#55)", () => {
  test("the status filter finds ideas a board has picked up", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Status").selectOption("in_progress");
    await expect(page).toHaveURL(/status=in_progress/);
    const posters = page.locator("article.poster");
    await expect(posters.first()).toBeVisible();
    // Retrying, so a redraw in progress cannot pass or fail the check by accident.
    await expect(posters.filter({ hasNotText: "In progress" })).toHaveCount(0);
    await expect(posters.filter({ hasText: "In progress" }).first()).toBeVisible();
  });

  test("the header has no list tabs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Lists" })).toHaveCount(0);
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
    // Wait until React has hydrated the form. Before that, Enter is not wired to the
    // search, and the test failed on WebKit iPhone in CI (#149).
    await page.waitForFunction(() => {
      const form = document.querySelector('input[name="q"]')?.closest("form");
      return !!form && Object.keys(form).some((k) => k.startsWith("__reactProps"));
    });
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
  // Links prefetch other pages (idea pages), sometimes late; those are not
  // this list, so only requests for "/" count.
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

  test("a filter change does not animate", async ({ page }) => {
    test.skip(!(await page.evaluate(() => "startViewTransition" in document)), "no view transitions here");
    await page.goto("/");
    const vt = () => page.evaluate(() => (window as unknown as { vtDurations: number[] }).vtDurations);
    // The cards rise in on arrival; let that finish before the sort.
    await expect(page.locator("article.poster").filter({ visible: true }).first()).toBeVisible();
    await page.waitForFunction(() => (window as unknown as { vtRunning: number }).vtRunning === 0);
    const before = (await vt()).length;
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

test.describe("poster arrival (#84)", () => {
  // The posters' animation timing, read from computed styles. Computed styles
  // resolve at once, unlike document.getAnimations(), which can be empty while
  // a busy browser has not yet run the animations.
  const timings = (page: import("@playwright/test").Page) =>
    page.locator("article.poster").evaluateAll((els) =>
      els.map((el) => {
        const s = getComputedStyle(el);
        return {
          arriving: el.classList.contains("poster-arrive"),
          name: s.animationName,
          delay: parseFloat(s.animationDelay),
          duration: parseFloat(s.animationDuration),
          opacity: s.opacity,
        };
      }),
    );

  test("with reduced motion, every poster appears at once", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const posters = page.locator("article.poster");
    await expect(posters.first()).toBeVisible();
    expect(await posters.count()).toBeGreaterThan(1);
    // The server marks the first arrival's posters, so the rise is in the page.
    // Reduced motion cuts each rise to 0.01ms with no delay, and the class can
    // already be gone once it ends, so accept either a finished rise or none.
    const html = await (await page.request.get("/")).text();
    expect(html).toContain("poster-arrive");
    for (const t of await timings(page)) {
      expect(t.name === "rise" || t.name === "none", JSON.stringify(t)).toBe(true);
      expect(t.delay, JSON.stringify(t)).toBeLessThanOrEqual(0);
      expect(t.duration, JSON.stringify(t)).toBeLessThanOrEqual(0.001);
    }
    // The opacity is full at once, not after a fade.
    await expect.poll(() => posters.first().evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  });

  test("without reduced motion, posters rise one after another", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("article.poster").first()).toBeVisible();
    const delays = (await timings(page)).map((t) => t.delay);
    expect(new Set(delays).size, delays.join(", ")).toBeGreaterThan(1);
    expect(Math.min(...delays)).toBe(0);
  });

  test("the rise moves and fades only, so the layout does not shift while cards arrive", async ({ page }) => {
    await page.goto("/");
    const properties = await page.evaluate(() => {
      const props = new Set<string>();
      for (const sheet of Array.from(document.styleSheets)) {
        for (const rule of Array.from(sheet.cssRules)) {
          if (rule instanceof CSSKeyframesRule && rule.name === "rise") {
            for (const frame of Array.from(rule.cssRules)) {
              for (const p of Array.from((frame as CSSKeyframeRule).style)) props.add(p);
            }
          }
        }
      }
      return [...props].sort();
    });
    expect(properties).toEqual(["opacity", "transform"]);
  });

  // Slow the browser's animation clock (Chromium only, over CDP), so the first
  // arrival is still running when the filter changes. Cards the filter takes
  // away never finish their rise, and must not rise again when the filter
  // brings them back.
  test("a filter during the arrival does not rise the cards it brings back", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "slowing animations needs the Chrome DevTools protocol");
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Animation.enable");
    await cdp.send("Animation.setPlaybackRate", { playbackRate: 0.02 });
    await page.goto("/");
    const posters = page.locator("article.poster");
    await expect(posters.first()).toBeVisible();
    expect(await page.locator(".poster-arrive").count()).toBeGreaterThan(0);
    // Before hydration a chip click is a full page load, which starts a new
    // arrival. React marks the nodes it hydrates with __reactProps keys, so wait
    // for that on a chip, then each click filters in place.
    const hydrated = () =>
      page.waitForFunction(() =>
        Object.keys(document.querySelector('nav[aria-label="Boards"] a') ?? {}).some((k) =>
          k.startsWith("__reactProps"),
        ),
      );
    const nav = page.getByRole("navigation", { name: "Boards" });
    await hydrated();
    // A dispatched click, not a mouse click: under the slowed clock the page is
    // still easing in, so the chip moves and a click would miss it. React
    // handles the event the same way (a plain left click, no modifiers).
    await nav.getByRole("link", { name: "Dining" }).dispatchEvent("click");
    await expect(page).toHaveURL(/board=DAB/);
    await nav.getByRole("link", { name: "All boards" }).dispatchEvent("click");
    await expect(page).not.toHaveURL(/board=/);
    // Every card on the wall, including those brought back, is at rest.
    for (const t of await timings(page)) {
      expect(t.arriving, JSON.stringify(t)).toBe(false);
      expect(t.name, JSON.stringify(t)).toBe("none");
    }
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
