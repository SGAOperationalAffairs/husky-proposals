import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "./contract";

const jar = new Map<string, string>();
const set = vi.fn((name: string, value: string) => void jar.set(name, value));
const del = vi.fn((name: string) => void jar.delete(name));
let standIn = true;
let sgauth = false;

const DEV_ORIGIN = "https://dev.proposals.northeasternsga.com";
const SGAUTH_URL = "https://dev.auth.northeasternsga.com";
const SGAUTH_COOKIE_NAME = "__Secure-sgauth-dev.session_token";

const { clientGetSession, createClient } = vi.hoisted(() => {
  const clientGetSession = vi.fn();
  const createClient = vi.fn<(options: unknown) => { getSession: typeof clientGetSession }>(() => ({
    getSession: clientGetSession,
  }));
  return { clientGetSession, createClient };
});

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set,
    delete: del,
  }),
}));
vi.mock("@/env", () => ({
  env: () => ({ AUTH_STAND_IN: standIn, AUTH_SGAUTH: sgauth, SGAUTH_URL, SGAUTH_COOKIE_NAME }),
}));
vi.mock("./sgauthClient", () => ({ createSgauthClient: createClient }));

import { toSession } from "./contract";
import { STAND_IN_COOKIE, standInResponse } from "./standIn";
import { canSignIn, endSession, getSession, signInUrl, signOutUrl, startStandInSession } from "./session";

function sessionFor(slug: string): Session {
  const result = toSession(standInResponse(slug, new Date("2026-10-31T12:00:00.000Z")));
  if (!result.ok) throw new Error(`stand-in user ${slug} is invalid`);
  return result.session;
}

beforeEach(() => {
  jar.clear();
  set.mockClear();
  del.mockClear();
  clientGetSession.mockReset();
  standIn = true;
  sgauth = false;
});

describe("session module (#45)", () => {
  it("returns the stand-in user for a valid cookie", async () => {
    jar.set(STAND_IN_COOKIE, "dab-chair");
    const session = await getSession();
    expect(session?.user.name).toBe("Sam Rivera");
    expect(session?.roles.leads).toEqual(["DAB"]);
  });

  it("returns null for an unknown cookie or no cookie", async () => {
    expect(await getSession()).toBeNull();
    jar.set(STAND_IN_COOKIE, "nobody");
    expect(await getSession()).toBeNull();
  });

  it("returns null when the stand-in is off, even with a valid cookie", async () => {
    standIn = false;
    jar.set(STAND_IN_COOKIE, "vp");
    expect(await getSession()).toBeNull();
  });

  it("refuses to start a session when the stand-in is off and sets nothing", async () => {
    standIn = false;
    expect(await startStandInSession("vp")).toEqual({ ok: false, error: { code: "stand_in_off" } });
    expect(set).not.toHaveBeenCalled();
  });

  it("sets an httpOnly, lax, session-length cookie when on", async () => {
    expect(await startStandInSession("vp")).toEqual({ ok: true });
    expect(set).toHaveBeenCalledWith(STAND_IN_COOKIE, "vp", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  });

  it("ends the session by deleting only the stand-in cookie", async () => {
    await endSession();
    expect(del).toHaveBeenCalledTimes(1);
    expect(del).toHaveBeenCalledWith(STAND_IN_COOKIE);
  });

  it("starts sign-in at the stand-in picker, carrying next encoded (#93)", () => {
    expect(signInUrl("/ideas/103?x=1", "http://localhost:3000")).toBe(
      "/stand-in?next=%2Fideas%2F103%3Fx%3D1",
    );
  });

  it("has nowhere to start sign-in when the stand-in is off (#93)", () => {
    standIn = false;
    expect(signInUrl("/post", "http://localhost:3000")).toBeNull();
  });
});

describe("SGAuth session (#177)", () => {
  beforeEach(() => {
    standIn = false;
    sgauth = true;
  });

  it("builds the client from the SGAuth settings in env", async () => {
    clientGetSession.mockResolvedValue({ ok: false, error: { code: "signed_out" } });
    await getSession();
    expect(createClient).toHaveBeenCalledWith({
      config: { url: SGAUTH_URL, cookieName: SGAUTH_COOKIE_NAME },
    });
  });

  it("forwards the SGAuth cookie with the leader purpose and returns the session", async () => {
    const session = sessionFor("dab-chair");
    clientGetSession.mockResolvedValue({ ok: true, session });
    jar.set(SGAUTH_COOKIE_NAME, "token-value");
    await expect(getSession()).resolves.toBe(session);
    expect(clientGetSession).toHaveBeenCalledWith("token-value", "leader");
  });

  it.each(["signed_out", "sgauth_unavailable", "invalid_session_response"])(
    "returns null when the client fails with %s",
    async (code) => {
      clientGetSession.mockResolvedValue({ ok: false, error: { code } });
      jar.set(SGAUTH_COOKIE_NAME, "token-value");
      expect(await getSession()).toBeNull();
    },
  );

  it("ignores the stand-in cookie", async () => {
    clientGetSession.mockResolvedValue({ ok: false, error: { code: "signed_out" } });
    jar.set(STAND_IN_COOKIE, "vp");
    expect(await getSession()).toBeNull();
    expect(clientGetSession).toHaveBeenCalledWith(undefined, "leader");
  });

  it("sends sign-in to SGAuth's login, returning to the page", () => {
    expect(signInUrl("/ideas/103?x=1", DEV_ORIGIN)).toBe(
      `${SGAUTH_URL}/login?redirect=https%3A%2F%2Fdev.proposals.northeasternsga.com%2Fideas%2F103%3Fx%3D1`,
    );
  });

  it.each([
    "https://husky-proposals-abc.vercel.app",
    "http://dev.proposals.northeasternsga.com",
    "https://evil.com",
  ])("has no sign-in from the unregistered origin %s", (origin) => {
    expect(signInUrl("/post", origin)).toBeNull();
  });

  it("falls back to the home page when the return address is over 2048 characters", () => {
    expect(signInUrl(`/ideas/${"a".repeat(2100)}`, DEV_ORIGIN)).toBe(
      `${SGAUTH_URL}/login?redirect=https%3A%2F%2Fdev.proposals.northeasternsga.com%2F`,
    );
  });

  it("links sign-out to SGAuth's logout, returning home", () => {
    expect(signOutUrl(DEV_ORIGIN)).toBe(
      `${SGAUTH_URL}/logout?redirect=https%3A%2F%2Fdev.proposals.northeasternsga.com%2F`,
    );
  });

  it("has no sign-out link from an unregistered origin", () => {
    expect(signOutUrl("https://husky-proposals-abc.vercel.app")).toBeNull();
  });

  it("has no sign-out link when SGAuth is off", () => {
    sgauth = false;
    expect(signOutUrl(DEV_ORIGIN)).toBeNull();
  });

  it("ends no cookie of SGAuth's: sign-out is SGAuth's own", async () => {
    await endSession();
    expect(del).not.toHaveBeenCalledWith(SGAUTH_COOKIE_NAME);
  });
});

describe("canSignIn (#177)", () => {
  it.each([
    [true, false, true],
    [false, true, true],
    [false, false, false],
  ])("stand-in %s, SGAuth %s gives %s", (standInOn, sgauthOn, expected) => {
    standIn = standInOn;
    sgauth = sgauthOn;
    expect(canSignIn()).toBe(expected);
  });
});
