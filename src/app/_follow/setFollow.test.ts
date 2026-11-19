import { describe, expect, it, vi } from "vitest";
import type { Session } from "@/auth/contract";
import { rolesFromPositions } from "@/core/positions";
import { setFollow, type FollowStore, type FollowableIdea } from "./setFollow";

// The follow rules (#101), against a fake store, checking what it received.
// Follow shares support's checks (#255): an open idea only, and the abuse limit.
const IDEA = "00000000-0000-4000-8000-000000000101";
const USER = "00000000-0000-4000-8000-0000000000b3";
const NOW = new Date("2026-11-18T14:30:00Z");

const student: Session = {
  user: { id: USER, email: "maya@example.com", name: "Maya" },
  positions: [],
  roles: rolesFromPositions([]),
};

const OPEN: FollowableIdea = { id: IDEA, reviewStatus: "approved", status: "collecting_support" };

function fakeStore(found: FollowableIdea | null = OPEN, count = 1) {
  return {
    findPublicIdea: vi.fn(async () => found),
    ensureUser: vi.fn(async () => undefined),
    bump: vi.fn(async () => count),
    follow: vi.fn(async () => undefined),
    unfollow: vi.fn(async () => undefined),
  } satisfies FollowStore;
}

describe("setFollow (#101)", () => {
  it("refuses invalid input and names the fields", async () => {
    const store = fakeStore();
    expect(await setFollow(store, student, { ideaId: "nope", following: "yes" }, NOW)).toEqual({
      ok: false,
      error: { code: "invalid", fields: ["ideaId", "following"] },
    });
    expect(store.findPublicIdea).not.toHaveBeenCalled();
  });

  it("refuses a signed-out viewer", async () => {
    const store = fakeStore();
    const result = await setFollow(store, null as unknown as Session, { ideaId: IDEA, following: true }, NOW);
    expect(result).toEqual({ ok: false, error: { code: "not_allowed" } });
    expect(store.follow).not.toHaveBeenCalled();
  });

  it("gives not_found for an idea that is not public", async () => {
    const store = fakeStore(null);
    expect(await setFollow(store, student, { ideaId: IDEA, following: true }, NOW)).toEqual({
      ok: false,
      error: { code: "not_found" },
    });
    expect(store.follow).not.toHaveBeenCalled();
  });

  it("follows with the session's user and unfollows by user id", async () => {
    const store = fakeStore();
    expect(await setFollow(store, student, { ideaId: IDEA, following: true }, NOW)).toEqual({
      ok: true,
      following: true,
    });
    expect(store.ensureUser).toHaveBeenCalledWith({
      id: USER,
      email: "maya@example.com",
      displayName: "Maya",
    });
    expect(store.follow).toHaveBeenCalledWith(USER, IDEA);
    expect(await setFollow(store, student, { ideaId: IDEA, following: false }, NOW)).toEqual({
      ok: true,
      following: false,
    });
    expect(store.unfollow).toHaveBeenCalledWith(USER, IDEA);
  });

  it("a repeated follow calls the store the same way, since it sets and never toggles", async () => {
    const store = fakeStore();
    await setFollow(store, student, { ideaId: IDEA, following: true }, NOW);
    await setFollow(store, student, { ideaId: IDEA, following: true }, NOW);
    expect(store.follow).toHaveBeenCalledTimes(2);
    expect(store.follow.mock.calls[0]).toEqual(store.follow.mock.calls[1]);
    expect(store.unfollow).not.toHaveBeenCalled();
  });

  it("refuses to follow a closed idea, and writes nothing", async () => {
    const store = fakeStore({ ...OPEN, status: "closed" });
    expect(await setFollow(store, student, { ideaId: IDEA, following: true }, NOW)).toEqual({
      ok: false,
      error: { code: "closed" },
    });
    expect(store.follow).not.toHaveBeenCalled();
    expect(store.bump).not.toHaveBeenCalled();
  });

  it("refuses to follow a delivered idea", async () => {
    const store = fakeStore({ ...OPEN, status: "delivered" });
    expect(await setFollow(store, student, { ideaId: IDEA, following: true }, NOW)).toEqual({
      ok: false,
      error: { code: "closed" },
    });
    expect(store.follow).not.toHaveBeenCalled();
  });

  it("still lets a student unfollow a closed idea", async () => {
    const store = fakeStore({ ...OPEN, status: "closed" });
    expect(await setFollow(store, student, { ideaId: IDEA, following: false }, NOW)).toEqual({
      ok: true,
      following: false,
    });
    expect(store.unfollow).toHaveBeenCalledWith(USER, IDEA);
  });

  it("counts every attempt past the idea check toward the limit, and refuses when over", async () => {
    const store = fakeStore(OPEN, 61);
    expect(await setFollow(store, student, { ideaId: IDEA, following: true }, NOW)).toEqual({
      ok: false,
      error: { code: "rate_limited" },
    });
    expect(store.bump).toHaveBeenCalledWith(USER, NOW);
    expect(store.follow).not.toHaveBeenCalled();
  });

  it("creates the user row before it counts the attempt, since the count references the user", async () => {
    const order: string[] = [];
    const store = fakeStore();
    store.ensureUser.mockImplementation(async () => {
      order.push("ensureUser");
    });
    store.bump.mockImplementation(async () => {
      order.push("bump");
      return 1;
    });
    await setFollow(store, student, { ideaId: IDEA, following: true }, NOW);
    expect(order).toEqual(["ensureUser", "bump"]);
  });
});
