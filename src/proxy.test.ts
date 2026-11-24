import { NextRequest } from "next/server";
import { getRewrittenUrl, isRewrite, unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@/auth/contract";
import { toSession } from "@/auth/contract";
import { standInResponse } from "@/auth/standIn";
import { LEADER_ROUTES } from "@/core/navigation";

const { sessionFromCookies } = vi.hoisted(() => ({ sessionFromCookies: vi.fn() }));
vi.mock("@/auth/sessionFromCookies", () => ({ sessionFromCookies }));

import { config, proxy } from "./proxy";

function sessionFor(slug: string): Session {
  const result = toSession(standInResponse(slug, new Date("2026-10-31T12:00:00.000Z")));
  if (!result.ok) throw new Error(`stand-in user ${slug} is invalid`);
  return result.session;
}

const get = (path: string, init?: ConstructorParameters<typeof NextRequest>[1]) =>
  new NextRequest(`https://proposals.test${path}`, init);

beforeEach(() => {
  sessionFromCookies.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("the proxy matcher (#235)", () => {
  it("lists the same sources as LEADER_ROUTES, in order", () => {
    const sources = config.matcher.map((entry) => entry.source);
    expect(sources).toEqual([...LEADER_ROUTES]);
  });

  it.each([...LEADER_ROUTES])("runs on %s", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
  });

  it.each(["/", "/me", "/ideas/103", "/api/jobs/send-email"])("does not run on %s", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false);
  });

  it.each([{ "next-router-prefetch": "1" }, { purpose: "prefetch" }])("skips prefetches (%o)", (headers) => {
    expect(unstable_doesMiddlewareMatch({ config, url: "/queue", headers })).toBe(false);
  });
});

describe("the proxy handler (#235)", () => {
  async function outcome(read: unknown, path = "/queue") {
    sessionFromCookies.mockResolvedValue(read);
    return proxy(get(path));
  }

  it.each(["student", "dab-member", "other-position"])("rewrites %s to the hidden path", async (slug) => {
    const response = await outcome({ session: sessionFor(slug), problem: null });
    expect(isRewrite(response)).toBe(true);
    expect(getRewrittenUrl(response)).toBe("https://proposals.test/_leader-route-hidden");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rewrites a signed-out visitor to the hidden path", async () => {
    const response = await outcome({ session: null, problem: null });
    expect(isRewrite(response)).toBe(true);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it.each(["dab-chair", "csc-director", "vp"])("lets %s through", async (slug) => {
    const response = await outcome({ session: sessionFor(slug), problem: null });
    expect(isRewrite(response)).toBe(false);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it.each(["sgauth_unavailable", "invalid_session_response"])(
    "passes through on %s, so the page decides",
    async (problem) => {
      const response = await outcome({ session: null, problem });
      expect(isRewrite(response)).toBe(false);
      expect(response.headers.get("x-middleware-next")).toBe("1");
    },
  );

  it("rewrites to the hidden path when the check throws, and logs no error object", async () => {
    sessionFromCookies.mockRejectedValue(new Error("cookie=secret"));
    const response = await proxy(get("/queue"));
    expect(isRewrite(response)).toBe(true);
    expect(console.error).toHaveBeenCalledWith("proxy: leader check failed");
  });

  it("passes a POST through without reading the session", async () => {
    const response = await proxy(get("/queue", { method: "POST" }));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(sessionFromCookies).not.toHaveBeenCalled();
  });

  it("passes a path that is not a leader route through without reading the session", async () => {
    const response = await proxy(get("/me"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(sessionFromCookies).not.toHaveBeenCalled();
  });
});
