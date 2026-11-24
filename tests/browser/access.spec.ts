import { expect, test } from "@playwright/test";
import { STAND_IN_COOKIE } from "@/auth/standIn";
import { LEADER_ROUTES } from "@/core/navigation";

// Who gets which HTTP status on the leader routes (#235). The proxy answers before
// anything renders, so the status is the check, not the page text. This runs in the
// leader-access project, against a server started with the stand-in on.

const NOT_LEADERS = [
  ["a signed-out visitor", null],
  ["a student", "student"],
  ["a board member who is not a lead", "dab-member"],
  ["someone in an unrelated position", "other-position"],
] as const;

const LEADERS = [
  ["a board chair", "dab-chair"],
  ["a director", "csc-director"],
  ["the VP of Campus Affairs", "vp"],
] as const;

const cookieFor = (slug: string | null): Record<string, string> =>
  slug === null ? {} : { cookie: `${STAND_IN_COOKIE}=${slug}` };

test.describe("leader routes return 404 to non-leaders (#235)", () => {
  for (const path of LEADER_ROUTES) {
    for (const [who, slug] of NOT_LEADERS) {
      test(`${path} is 404 for ${who}`, async ({ request }) => {
        const response = await request.get(path, { headers: cookieFor(slug), maxRedirects: 0 });
        expect(response.status()).toBe(404);
        expect(response.headers()["cache-control"]).toContain("no-store");
      });
    }

    for (const [who, slug] of LEADERS) {
      test(`${path} is 200 for ${who}`, async ({ request }) => {
        const response = await request.get(path, { headers: cookieFor(slug), maxRedirects: 0 });
        expect(response.status()).toBe(200);
      });
    }
  }
});
