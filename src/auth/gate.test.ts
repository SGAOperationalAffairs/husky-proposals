import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "./contract";

const ORIGIN = "https://dev.proposals.northeasternsga.com";
let current: Session | null = null;
let pickerUrl: string | null = "/stand-in?next=%2F";
const signInUrl = vi.fn<(next: string, origin: string) => string | null>((next) =>
  pickerUrl === null ? null : `/stand-in?next=${encodeURIComponent(next)}`,
);

class RedirectError extends Error {
  constructor(readonly to: string) {
    super(`redirect:${to}`);
  }
}

vi.mock("./session", () => ({
  getSession: async () => current,
  signInUrl: (next: string, origin: string) => signInUrl(next, origin),
}));
class NotFoundError extends Error {}

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new RedirectError(to);
  },
  notFound: () => {
    throw new NotFoundError("not-found");
  },
}));

import { toSession } from "./contract";
import { standInResponse } from "./standIn";
import { requireLeader, requireSignedIn, signInDestination, withSession } from "./gate";

function sessionFor(slug: string): Session {
  const result = toSession(standInResponse(slug, new Date("2026-10-31T12:00:00.000Z")));
  if (!result.ok) throw new Error(`stand-in user ${slug} is invalid`);
  return result.session;
}

beforeEach(() => {
  current = null;
  pickerUrl = "/stand-in?next=%2F";
  signInUrl.mockClear();
});

describe("sign-in gate (#93)", () => {
  describe("requireSignedIn, the redirected page", () => {
    it("redirects a signed-out request to sign-in, returning to the page", async () => {
      await expect(requireSignedIn("/post")).rejects.toMatchObject({ to: "/sign-in?next=%2Fpost" });
    });

    it("returns the session without redirecting when signed in", async () => {
      current = sessionFor("student");
      await expect(requireSignedIn("/post")).resolves.toBe(current);
    });

    it("falls back to the home page for an unsafe path", async () => {
      await expect(requireSignedIn("//evil.com")).rejects.toMatchObject({ to: "/sign-in?next=%2F" });
    });
  });

  describe("requireLeader, the leader page (#156)", () => {
    it("gives not-found to a signed-out visitor", async () => {
      await expect(requireLeader()).rejects.toBeInstanceOf(NotFoundError);
    });

    it.each(["student", "dab-member", "other-position"])("gives not-found to %s", async (slug) => {
      current = sessionFor(slug);
      await expect(requireLeader()).rejects.toBeInstanceOf(NotFoundError);
    });

    it.each(["dab-chair", "csc-director", "vp"])("returns the session for %s", async (slug) => {
      current = sessionFor(slug);
      await expect(requireLeader()).resolves.toBe(current);
    });
  });

  describe("withSession, the rejected action", () => {
    it("returns signed_out and never runs the action without a session", async () => {
      const body = vi.fn(async () => "done");
      const action = withSession(body);
      expect(await action()).toEqual({ ok: false, error: { code: "signed_out" } });
      expect(body).not.toHaveBeenCalled();
    });

    it("passes the session and arguments through and returns the result unchanged", async () => {
      current = sessionFor("student");
      const body = vi.fn(async (_session: Session, a: number, b: string) => ({ a, b }));
      const action = withSession(body);
      expect(await action(1, "x")).toEqual({ a: 1, b: "x" });
      expect(body).toHaveBeenCalledWith(current, 1, "x");
    });

    it("lets an error thrown by the action propagate", async () => {
      current = sessionFor("student");
      const action = withSession(async () => {
        throw new Error("boom");
      });
      await expect(action()).rejects.toThrow("boom");
    });

    it("checks the session on every call", async () => {
      const action = withSession(async () => "done");
      expect(await action()).toEqual({ ok: false, error: { code: "signed_out" } });
      current = sessionFor("student");
      expect(await action()).toBe("done");
    });
  });

  describe("signInDestination, what /sign-in does", () => {
    it("sends a signed-in visitor straight to next", async () => {
      current = sessionFor("student");
      expect(await signInDestination("/in-progress", ORIGIN)).toBe("/in-progress");
    });

    it("sends a signed-in visitor home when next is missing or hostile", async () => {
      current = sessionFor("student");
      expect(await signInDestination(undefined, ORIGIN)).toBe("/");
      expect(await signInDestination("//evil.com", ORIGIN)).toBe("/");
    });

    it("sends a signed-out visitor to the picker when the stand-in is on", async () => {
      expect(await signInDestination("/post", ORIGIN)).toBe("/stand-in?next=%2Fpost");
    });

    it("gives null when nothing can sign you in", async () => {
      pickerUrl = null;
      expect(await signInDestination("/post", ORIGIN)).toBeNull();
    });

    it("falls back to / for a hostile next when signed out", async () => {
      expect(await signInDestination("https://evil.com", ORIGIN)).toBe("/stand-in?next=%2F");
      expect(signInUrl).toHaveBeenCalledWith("/", ORIGIN);
    });

    it("passes the request origin on and returns an absolute SGAuth URL unchanged (#177)", async () => {
      const sgauthUrl =
        "https://dev.auth.northeasternsga.com/login?redirect=https%3A%2F%2Fexample.test%2Fpost";
      signInUrl.mockReturnValueOnce(sgauthUrl);
      expect(await signInDestination("/post", ORIGIN)).toBe(sgauthUrl);
      expect(signInUrl).toHaveBeenCalledWith("/post", ORIGIN);
    });
  });
});
