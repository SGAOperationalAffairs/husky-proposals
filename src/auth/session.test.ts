import { beforeEach, describe, expect, it, vi } from "vitest";

const jar = new Map<string, string>();
const set = vi.fn((name: string, value: string) => void jar.set(name, value));
const del = vi.fn((name: string) => void jar.delete(name));
let standIn = true;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set,
    delete: del,
  }),
}));
vi.mock("@/env", () => ({ env: () => ({ AUTH_STAND_IN: standIn }) }));

import { STAND_IN_COOKIE } from "./standIn";
import { endSession, getSession, startStandInSession } from "./session";

beforeEach(() => {
  jar.clear();
  set.mockClear();
  del.mockClear();
  standIn = true;
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

  it("ends the session by deleting the cookie", async () => {
    await endSession();
    expect(del).toHaveBeenCalledWith(STAND_IN_COOKIE);
  });
});
