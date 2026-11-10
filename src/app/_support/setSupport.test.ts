import { describe, expect, it, vi } from "vitest";
import type { Session } from "@/auth/contract";
import { rolesFromPositions } from "@/core/positions";
import { setSupport, type SupportableIdea, type SupportStore } from "./setSupport";

// The support rules (#94) against a fake store, checking what it received.
const NOW = new Date("2026-11-06T15:00:00.000Z");
const USER = "00000000-0000-4000-8000-000000000001";
const IDEA = "00000000-0000-4000-8000-000000000101";

const student: Session = {
  user: { id: USER, email: "maya.test@example.com", name: "Maya Test" },
  positions: [],
  roles: rolesFromPositions([]),
};

const open: SupportableIdea = { id: IDEA, number: 103, reviewStatus: "approved", status: "in_progress" };

function fakeStore(found: SupportableIdea | null, { count = 1, changed = true } = {}) {
  return {
    find: vi.fn(async () => found),
    ensureUser: vi.fn(async () => {}),
    bump: vi.fn(async () => count),
    set: vi.fn(async () => changed),
  } satisfies SupportStore;
}

describe("setSupport (#94)", () => {
  it("sets a support and refreshes both public tags", async () => {
    const store = fakeStore(open);
    const result = await setSupport(store, student, { number: 103, supported: true }, NOW);
    expect(result).toEqual({ ok: true, number: 103, supported: true, refresh: ["ideas", "idea:103"] });
    expect(store.find).toHaveBeenCalledWith(103);
    expect(store.ensureUser).toHaveBeenCalledWith({
      id: USER,
      email: "maya.test@example.com",
      displayName: "Maya Test",
    });
    expect(store.bump).toHaveBeenCalledWith(USER, NOW);
    expect(store.set).toHaveBeenCalledWith(USER, IDEA, true);
  });

  it("removes a support when asked for supported: false", async () => {
    const store = fakeStore(open);
    const result = await setSupport(store, student, { number: 103, supported: false }, NOW);
    expect(result).toMatchObject({ ok: true, supported: false });
    expect(store.set).toHaveBeenCalledWith(USER, IDEA, false);
  });

  it("a repeat tap that changes no row refreshes nothing", async () => {
    const store = fakeStore(open, { changed: false });
    expect(await setSupport(store, student, { number: 103, supported: true }, NOW)).toEqual({
      ok: true,
      number: 103,
      supported: true,
      refresh: [],
    });
  });

  it("a bad input returns invalid with the bad fields and touches no store", async () => {
    const store = fakeStore(open);
    expect(await setSupport(store, student, { number: "x" }, NOW)).toEqual({
      ok: false,
      error: { code: "invalid", fields: ["number", "supported"] },
    });
    expect(store.find).not.toHaveBeenCalled();
  });

  it("an idea that is missing or not public is not_found, with nothing counted or written", async () => {
    const store = fakeStore(null);
    expect(await setSupport(store, student, { number: 999, supported: true }, NOW)).toEqual({
      ok: false,
      error: { code: "not_found" },
    });
    expect(store.bump).not.toHaveBeenCalled();
    expect(store.set).not.toHaveBeenCalled();
  });

  it("a delivered idea is closed, with nothing written", async () => {
    const store = fakeStore({ ...open, status: "delivered" });
    expect(await setSupport(store, student, { number: 103, supported: true }, NOW)).toEqual({
      ok: false,
      error: { code: "closed" },
    });
    expect(store.set).not.toHaveBeenCalled();
  });

  it("the 60th change in a minute goes through and the 61st is rate_limited with no write", async () => {
    const sixtieth = fakeStore(open, { count: 60 });
    expect(await setSupport(sixtieth, student, { number: 103, supported: true }, NOW)).toMatchObject({
      ok: true,
    });

    const sixtyFirst = fakeStore(open, { count: 61 });
    expect(await setSupport(sixtyFirst, student, { number: 103, supported: true }, NOW)).toEqual({
      ok: false,
      error: { code: "rate_limited" },
    });
    expect(sixtyFirst.bump).toHaveBeenCalledTimes(1);
    expect(sixtyFirst.set).not.toHaveBeenCalled();
  });
});
