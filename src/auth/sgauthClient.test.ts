import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeClock } from "@/testing/fakeClock";
import { standInResponse } from "./standIn";
import { createSgauthClient, type SgauthConfig } from "./sgauthClient";

const CONFIG: SgauthConfig = { url: "https://auth-dev.northeasternsga.com", cookieName: "sgauth_session" };
const COOKIE = "tok-abc123_DEF.456";

const clock = createFakeClock();

function validBody() {
  return standInResponse("dab-chair", clock.now());
}

// standInResponse returns unknown on purpose; the invalid cases need its fields.
function validShape() {
  return validBody() as { user: Record<string, unknown>; positions: unknown };
}

function withUser(patch: Record<string, unknown>) {
  const body = validShape();
  return { ...body, user: { ...body.user, ...patch } };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

type FetchFn = (url: URL, init: RequestInit) => Promise<Response>;

function setup(
  config: SgauthConfig = CONFIG,
  respond: () => Promise<Response> = async () => jsonResponse(validBody()),
) {
  const fetchFake = vi.fn<FetchFn>(() => respond());
  const client = createSgauthClient({ config, fetch: fetchFake as unknown as typeof fetch, clock });
  return { client, fetchFake };
}

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
});

describe("SGAuth session client (#176)", () => {
  describe("responses", () => {
    it("returns a session with roles for a valid 200 body", async () => {
      const { client } = setup();
      const result = await client.getSession(COOKIE, "student");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.session.roles.leads).toEqual(["DAB"]);
        expect(result.session.user.name).toBe("Sam Rivera");
      }
    });

    it.each([
      ["a missing user id", () => withUser({ id: undefined })],
      ["a non-UUID user id", () => withUser({ id: "nope" })],
      ["positions that are not an array", () => ({ ...validShape(), positions: "chair" })],
    ])("returns invalid_session_response for %s", async (_label, makeBody) => {
      const { client } = setup(CONFIG, async () => jsonResponse(makeBody()));
      expect(await client.getSession(COOKIE, "student")).toEqual({
        ok: false,
        error: { code: "invalid_session_response" },
      });
    });

    it("returns invalid_session_response when a 200 body is not JSON", async () => {
      const { client } = setup(CONFIG, async () => new Response("<html>oops</html>", { status: 200 }));
      expect(await client.getSession(COOKIE, "student")).toEqual({
        ok: false,
        error: { code: "invalid_session_response" },
      });
    });

    it("returns signed_out for a 401", async () => {
      const { client } = setup(CONFIG, async () => new Response("{}", { status: 401 }));
      expect(await client.getSession(COOKIE, "student")).toEqual({
        ok: false,
        error: { code: "signed_out" },
      });
    });

    it.each([
      ["a 500", async () => new Response("boom", { status: 500 })],
      [
        "a 302 redirect",
        async () => new Response(null, { status: 302, headers: { location: "https://x.test/" } }),
      ],
      [
        "a thrown network error",
        async () => {
          throw new TypeError("fetch failed");
        },
      ],
      [
        "an aborted fetch",
        async () => {
          throw new DOMException("The operation timed out.", "TimeoutError");
        },
      ],
    ])("returns sgauth_unavailable for %s", async (_label, respond) => {
      const { client } = setup(CONFIG, respond);
      expect(await client.getSession(COOKIE, "student")).toEqual({
        ok: false,
        error: { code: "sgauth_unavailable" },
      });
      expect(await client.getSession(COOKIE, "leader")).toEqual({
        ok: false,
        error: { code: "sgauth_unavailable" },
      });
    });
  });

  describe("cookie guard", () => {
    it.each([
      ["undefined", undefined],
      ["empty", ""],
      ["a semicolon", "a=1; other=2"],
      ["a comma", "a,b"],
      ["whitespace", "a b"],
      ["a control character", "a\r\nSet-Cookie: x"],
      ["non-ASCII", "tök"],
    ])("returns signed_out with no request for %s", async (_label, value) => {
      const { client, fetchFake } = setup();
      expect(await client.getSession(value, "student")).toEqual({ ok: false, error: { code: "signed_out" } });
      expect(fetchFake).not.toHaveBeenCalled();
    });
  });

  describe("request", () => {
    it.each([
      ["https://auth-dev.northeasternsga.com", "https://auth-dev.northeasternsga.com/api/sgauth/session"],
      ["http://auth.sga.localhost:3000/", "http://auth.sga.localhost:3000/api/sgauth/session"],
    ])("goes to the configured host %s", async (url, expected) => {
      const { client, fetchFake } = setup({ url, cookieName: "sgauth_session" });
      await client.getSession(COOKIE, "student");
      const [calledUrl, init] = fetchFake.mock.calls[0]!;
      expect(String(calledUrl)).toBe(expected);
      expect(init.method).toBe("GET");
      expect(init.cache).toBe("no-store");
      expect(init.redirect).toBe("manual");
      expect(init.signal).toBeInstanceOf(AbortSignal);
    });

    it("forwards only the SGAuth cookie, named from config", async () => {
      const { client, fetchFake } = setup({ url: CONFIG.url, cookieName: "custom_cookie" });
      await client.getSession(COOKIE, "student");
      const headers = fetchFake.mock.calls[0]![1].headers as Record<string, string>;
      expect(headers.Cookie).toBe(`custom_cookie=${COOKIE}`);
    });
  });

  describe("cache", () => {
    it("serves a student from cache for 60 seconds, then asks again", async () => {
      const { client, fetchFake } = setup();
      await client.getSession(COOKIE, "student");
      await client.getSession(COOKIE, "student");
      expect(fetchFake).toHaveBeenCalledTimes(1);
      clock.advance({ minutes: 1 });
      await client.getSession(COOKIE, "student");
      expect(fetchFake).toHaveBeenCalledTimes(2);
    });

    it("never reads the cache for a leader, and fails closed on error", async () => {
      let failing = false;
      const { client, fetchFake } = setup(CONFIG, async () => {
        if (failing) throw new TypeError("fetch failed");
        return jsonResponse(validBody());
      });
      expect((await client.getSession(COOKIE, "student")).ok).toBe(true);
      failing = true;
      expect(await client.getSession(COOKIE, "leader")).toEqual({
        ok: false,
        error: { code: "sgauth_unavailable" },
      });
      expect(fetchFake).toHaveBeenCalledTimes(2);
    });

    it("evicts the entry on a failed call, so no stale answer follows", async () => {
      let failing = false;
      const { client, fetchFake } = setup(CONFIG, async () => {
        if (failing) throw new TypeError("fetch failed");
        return jsonResponse(validBody());
      });
      await client.getSession(COOKIE, "student");
      failing = true;
      await client.getSession(COOKIE, "leader");
      await client.getSession(COOKIE, "student");
      expect(fetchFake).toHaveBeenCalledTimes(3);
    });

    it("lets a successful leader call warm the cache for a student", async () => {
      const { client, fetchFake } = setup();
      await client.getSession(COOKIE, "leader");
      await client.getSession(COOKIE, "student");
      expect(fetchFake).toHaveBeenCalledTimes(1);
    });

    it("never caches a failed call", async () => {
      let failing = true;
      const { client } = setup(CONFIG, async () => {
        if (failing) throw new TypeError("fetch failed");
        return jsonResponse(validBody());
      });
      expect((await client.getSession(COOKIE, "student")).ok).toBe(false);
      failing = false;
      expect((await client.getSession(COOKIE, "student")).ok).toBe(true);
    });

    it("does not share a cache between clients or between cookies", async () => {
      const first = setup();
      const second = setup();
      await first.client.getSession(COOKIE, "student");
      await second.client.getSession(COOKIE, "student");
      expect(first.fetchFake).toHaveBeenCalledTimes(1);
      expect(second.fetchFake).toHaveBeenCalledTimes(1);
      await first.client.getSession("other-cookie", "student");
      expect(first.fetchFake).toHaveBeenCalledTimes(2);
    });
  });

  describe("logging", () => {
    it("logs only the code for sgauth_unavailable", async () => {
      const { client } = setup(CONFIG, async () => {
        throw new TypeError(`fetch failed for ${COOKIE}`);
      });
      await client.getSession(COOKIE, "student");
      expect(errorSpy).toHaveBeenCalledTimes(1);
      const logged = JSON.stringify(errorSpy.mock.calls);
      expect(logged).toContain("sgauth_unavailable");
      expect(logged).not.toContain(COOKIE);
    });

    it("logs only the code for invalid_session_response, never the body", async () => {
      const { client } = setup(
        CONFIG,
        async () => new Response("distinctive-body-text-9137", { status: 200 }),
      );
      await client.getSession(COOKIE, "student");
      expect(errorSpy).toHaveBeenCalledTimes(1);
      const logged = JSON.stringify(errorSpy.mock.calls);
      expect(logged).toContain("invalid_session_response");
      expect(logged).not.toContain("distinctive-body-text-9137");
      expect(logged).not.toContain(COOKIE);
    });

    it("logs nothing for signed_out", async () => {
      const { client } = setup(CONFIG, async () => new Response("{}", { status: 401 }));
      await client.getSession(COOKIE, "student");
      await client.getSession(undefined, "student");
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });
});
