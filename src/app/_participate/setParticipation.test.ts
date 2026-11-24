import { describe, expect, it, vi } from "vitest";
import type { Session } from "@/auth/contract";
import { rolesFromPositions } from "@/core/positions";
import { setParticipation, type ParticipableIdea, type ParticipationStore } from "./setParticipation";

// The "I'll participate" rules (#95) against a fake store, checking what it received.
const NOW = new Date("2026-11-06T15:00:00.000Z");
const USER = "00000000-0000-4000-8000-000000000001";
const IDEA = "00000000-0000-4000-8000-000000000101";

const student: Session = {
  user: { id: USER, email: "maya.test@example.com", name: "Maya Test" },
  positions: [],
  roles: rolesFromPositions([]),
};

const open: ParticipableIdea = { id: IDEA, number: 103, reviewStatus: "approved", status: "in_progress" };

function fakeStore(found: ParticipableIdea | null, { count = 1, changed = true } = {}) {
  return {
    find: vi.fn(async () => found),
    ensureUser: vi.fn(async () => {}),
    bump: vi.fn(async () => count),
    set: vi.fn(async () => changed),
  } satisfies ParticipationStore;
}

describe("setParticipation (#95)", () => {
  it("sets a participation and refreshes both public tags", async () => {
    const store = fakeStore(open);
    const result = await setParticipation(store, student, { number: 103, participating: true }, NOW);
    expect(result).toEqual({ ok: true, number: 103, participating: true, refresh: ["ideas", "idea:103"] });
    expect(store.find).toHaveBeenCalledWith(103);
    expect(store.ensureUser).toHaveBeenCalledWith({
      id: USER,
      email: "maya.test@example.com",
      displayName: "Maya Test",
    });
    expect(store.bump).toHaveBeenCalledWith(USER, NOW);
    expect(store.set).toHaveBeenCalledWith(USER, IDEA, true);
  });

  it("withdraws when asked for participating: false", async () => {
    const store = fakeStore(open);
    const result = await setParticipation(store, student, { number: 103, participating: false }, NOW);
    expect(result).toMatchObject({ ok: true, participating: false });
    expect(store.set).toHaveBeenCalledWith(USER, IDEA, false);
  });

  it("a repeat that changes no row refreshes nothing", async () => {
    const store = fakeStore(open, { changed: false });
    expect(await setParticipation(store, student, { number: 103, participating: true }, NOW)).toEqual({
      ok: true,
      number: 103,
      participating: true,
      refresh: [],
    });
  });

  it("a bad input returns invalid with the bad fields and touches no store", async () => {
    const store = fakeStore(open);
    expect(await setParticipation(store, student, { number: "x" }, NOW)).toEqual({
      ok: false,
      error: { code: "invalid", fields: ["number", "participating"] },
    });
    expect(store.find).not.toHaveBeenCalled();
  });

  it("an idea that is missing or not public is not_found, with nothing counted or written", async () => {
    const store = fakeStore(null);
    expect(await setParticipation(store, student, { number: 999, participating: true }, NOW)).toEqual({
      ok: false,
      error: { code: "not_found" },
    });
    expect(store.bump).not.toHaveBeenCalled();
    expect(store.set).not.toHaveBeenCalled();
  });

  it("offering on a delivered or closed idea is closed, with nothing counted or written", async () => {
    for (const status of ["delivered", "closed"] as const) {
      const store = fakeStore({ ...open, status });
      expect(await setParticipation(store, student, { number: 103, participating: true }, NOW)).toEqual({
        ok: false,
        error: { code: "closed" },
      });
      expect(store.bump).not.toHaveBeenCalled();
      expect(store.set).not.toHaveBeenCalled();
    }
  });

  it("withdrawing on a delivered or closed idea succeeds", async () => {
    for (const status of ["delivered", "closed"] as const) {
      const store = fakeStore({ ...open, status });
      expect(
        await setParticipation(store, student, { number: 103, participating: false }, NOW),
      ).toMatchObject({
        ok: true,
        participating: false,
      });
      expect(store.set).toHaveBeenCalledWith(USER, IDEA, false);
    }
  });

  it("the 60th change in a minute goes through and the 61st is rate_limited with no write", async () => {
    const sixtieth = fakeStore(open, { count: 60 });
    expect(
      await setParticipation(sixtieth, student, { number: 103, participating: true }, NOW),
    ).toMatchObject({ ok: true });

    const sixtyFirst = fakeStore(open, { count: 61 });
    expect(await setParticipation(sixtyFirst, student, { number: 103, participating: true }, NOW)).toEqual({
      ok: false,
      error: { code: "rate_limited" },
    });
    expect(sixtyFirst.bump).toHaveBeenCalledTimes(1);
    expect(sixtyFirst.set).not.toHaveBeenCalled();
  });

  it("a repeat that changes nothing still counts toward the limit", async () => {
    const store = fakeStore(open, { changed: false });
    await setParticipation(store, student, { number: 103, participating: true }, NOW);
    expect(store.bump).toHaveBeenCalledTimes(1);
  });
});
