import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@/auth/contract";

const ORIGIN = "https://dev.proposals.northeasternsga.com";
const SGAUTH_LOGIN =
  "https://dev.auth.northeasternsga.com/login?redirect=https%3A%2F%2Fdev.proposals.northeasternsga.com%2Fpost";

let current: Session | null = null;
let mode: "stand-in" | "sgauth" | "none" = "stand-in";
const signInUrl = vi.fn<(next: string, origin: string) => string | null>((next) => {
  if (mode === "none") return null;
  if (mode === "sgauth") return SGAUTH_LOGIN;
  return `/stand-in?next=${encodeURIComponent(next)}`;
});

// The gate is real, so a hostile next is cleaned by safeNextPath as it is in production.
vi.mock("@/auth/session", () => ({
  getSession: async () => current,
  signInUrl: (next: string, origin: string) => signInUrl(next, origin),
}));

import { toSession } from "@/auth/contract";
import { standInResponse } from "@/auth/standIn";
import { GET } from "./route";

function sessionFor(slug: string): Session {
  const result = toSession(standInResponse(slug, new Date("2026-10-31T12:00:00.000Z")));
  if (!result.ok) throw new Error(`stand-in user ${slug} is invalid`);
  return result.session;
}

const request = (search: string) => new NextRequest(`${ORIGIN}/sign-in${search}`);

beforeEach(() => {
  current = null;
  mode = "stand-in";
  signInUrl.mockClear();
});

describe("GET /sign-in (#177)", () => {
  it("redirects a signed-in visitor to next, with no HTML body (the stuck page)", async () => {
    current = sessionFor("student");
    const response = await GET(request("?next=/post"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`${ORIGIN}/post`);
    expect(await response.text()).toBe("");
  });

  it("redirects a signed-out visitor to the stand-in picker", async () => {
    const response = await GET(request("?next=/post"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`${ORIGIN}/stand-in?next=%2Fpost`);
  });

  it("redirects a signed-out visitor to SGAuth's login, passing the request origin", async () => {
    mode = "sgauth";
    const response = await GET(request("?next=/post"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(SGAUTH_LOGIN);
    expect(signInUrl).toHaveBeenCalledWith("/post", ORIGIN);
  });

  it("redirects to the closed page when nothing can sign you in, an unregistered origin included", async () => {
    mode = "none";
    const response = await GET(request("?next=/post"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`${ORIGIN}/sign-in/closed`);
  });

  it.each(["?next=//evil.com", "?next=https://evil.com", "?next=/a&next=/b", ""])(
    "goes to / for the hostile or missing next %j",
    async (search) => {
      current = sessionFor("student");
      const response = await GET(request(search));
      expect(response.headers.get("location")).toBe(`${ORIGIN}/`);
    },
  );

  it.each([
    ["signed in", "student"],
    ["signed out", null],
  ])("is never cached, %s", async (_label, slug) => {
    current = slug ? sessionFor(slug) : null;
    const response = await GET(request("?next=/post"));
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
