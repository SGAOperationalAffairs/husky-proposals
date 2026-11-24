import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "./contract";

let standIn = true;
let sgauth = false;

const SGAUTH_URL = "https://dev.auth.northeasternsga.com";
const SGAUTH_COOKIE_NAME = "__Secure-sgauth-dev.session_token";

const { clientGetSession, createClient } = vi.hoisted(() => {
  const clientGetSession = vi.fn();
  const createClient = vi.fn<(options: unknown) => { getSession: typeof clientGetSession }>(() => ({
    getSession: clientGetSession,
  }));
  return { clientGetSession, createClient };
});

vi.mock("@/env", () => ({
  env: () => ({ AUTH_STAND_IN: standIn, AUTH_SGAUTH: sgauth, SGAUTH_URL, SGAUTH_COOKIE_NAME }),
}));
vi.mock("./sgauthClient", () => ({ createSgauthClient: createClient }));

import { toSession } from "./contract";
import { STAND_IN_COOKIE, standInResponse } from "./standIn";
import { sessionFromCookies } from "./sessionFromCookies";

function sessionFor(slug: string): Session {
  const result = toSession(standInResponse(slug, new Date("2026-10-31T12:00:00.000Z")));
  if (!result.ok) throw new Error(`stand-in user ${slug} is invalid`);
  return result.session;
}

const reader = (cookies: Record<string, string>) => (name: string) => cookies[name];

beforeEach(() => {
  clientGetSession.mockReset();
  standIn = true;
  sgauth = false;
});

describe("sessionFromCookies, stand-in (#235)", () => {
  it("returns the stand-in user for a valid cookie", async () => {
    const read = await sessionFromCookies(reader({ [STAND_IN_COOKIE]: "dab-chair" }), "leader");
    expect(read.problem).toBeNull();
    expect(read.session?.user.name).toBe("Sam Rivera");
  });

  it("is signed out for no cookie or an unknown one", async () => {
    expect(await sessionFromCookies(reader({}), "leader")).toEqual({ session: null, problem: null });
    expect(await sessionFromCookies(reader({ [STAND_IN_COOKIE]: "nobody" }), "leader")).toEqual({
      session: null,
      problem: null,
    });
  });

  it("is signed out when the stand-in is off, even with a valid cookie", async () => {
    standIn = false;
    expect(await sessionFromCookies(reader({ [STAND_IN_COOKIE]: "vp" }), "leader")).toEqual({
      session: null,
      problem: null,
    });
  });
});

describe("sessionFromCookies, SGAuth (#235)", () => {
  beforeEach(() => {
    standIn = false;
    sgauth = true;
  });

  it("forwards the SGAuth cookie with the purpose it was given", async () => {
    const session = sessionFor("dab-chair");
    clientGetSession.mockResolvedValue({ ok: true, session });
    const read = await sessionFromCookies(reader({ [SGAUTH_COOKIE_NAME]: "token-value" }), "student");
    expect(read).toEqual({ session, problem: null });
    expect(clientGetSession).toHaveBeenCalledWith("token-value", "student");
  });

  it.each([
    ["signed_out", null],
    ["sgauth_unavailable", "sgauth_unavailable"],
    ["invalid_session_response", "invalid_session_response"],
  ])("maps a client failure of %s to the problem %s", async (code, problem) => {
    clientGetSession.mockResolvedValue({ ok: false, error: { code } });
    const read = await sessionFromCookies(reader({ [SGAUTH_COOKIE_NAME]: "token-value" }), "leader");
    expect(read).toEqual({ session: null, problem });
  });

  it("ignores the stand-in cookie", async () => {
    clientGetSession.mockResolvedValue({ ok: false, error: { code: "signed_out" } });
    const read = await sessionFromCookies(reader({ [STAND_IN_COOKIE]: "vp" }), "leader");
    expect(read.session).toBeNull();
    expect(clientGetSession).toHaveBeenCalledWith(undefined, "leader");
  });
});
