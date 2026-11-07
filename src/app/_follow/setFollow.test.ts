import { describe, expect, it, vi } from "vitest";
import type { Session } from "@/auth/contract";
import { rolesFromPositions } from "@/core/positions";
import { setFollow, type FollowStore } from "./setFollow";

// The follow rules (#101), against a fake store, checking what it received.
const IDEA = "00000000-0000-4000-8000-000000000101";
const USER = "00000000-0000-4000-8000-0000000000b3";

const student: Session = {
  user: { id: USER, email: "maya@example.com", name: "Maya" },
  positions: [],
  roles: rolesFromPositions([]),
};

function fakeStore(found: { id: string } | null = { id: IDEA }) {
  return {
    findPublicIdea: vi.fn(async () => found),
    follow: vi.fn(async () => undefined),
    unfollow: vi.fn(async () => undefined),
  } satisfies FollowStore;
}

describe("setFollow (#101)", () => {
  it("refuses invalid input and names the fields", async () => {
    const store = fakeStore();
    expect(await setFollow(store, student, { ideaId: "nope", following: "yes" })).toEqual({
      ok: false,
      error: { code: "invalid", fields: ["ideaId", "following"] },
    });
    expect(store.findPublicIdea).not.toHaveBeenCalled();
  });

  it("refuses a signed-out viewer", async () => {
    const store = fakeStore();
    const result = await setFollow(store, null as unknown as Session, { ideaId: IDEA, following: true });
    expect(result).toEqual({ ok: false, error: { code: "not_allowed" } });
    expect(store.follow).not.toHaveBeenCalled();
  });

  it("gives not_found for an idea that is not public", async () => {
    const store = fakeStore(null);
    expect(await setFollow(store, student, { ideaId: IDEA, following: true })).toEqual({
      ok: false,
      error: { code: "not_found" },
    });
    expect(store.follow).not.toHaveBeenCalled();
  });

  it("follows with the session's user and unfollows by user id", async () => {
    const store = fakeStore();
    expect(await setFollow(store, student, { ideaId: IDEA, following: true })).toEqual({
      ok: true,
      following: true,
    });
    expect(store.follow).toHaveBeenCalledWith(
      { id: USER, email: "maya@example.com", displayName: "Maya" },
      IDEA,
    );
    expect(await setFollow(store, student, { ideaId: IDEA, following: false })).toEqual({
      ok: true,
      following: false,
    });
    expect(store.unfollow).toHaveBeenCalledWith(USER, IDEA);
  });

  it("a repeated follow calls the store the same way, since it sets and never toggles", async () => {
    const store = fakeStore();
    await setFollow(store, student, { ideaId: IDEA, following: true });
    await setFollow(store, student, { ideaId: IDEA, following: true });
    expect(store.follow).toHaveBeenCalledTimes(2);
    expect(store.follow.mock.calls[0]).toEqual(store.follow.mock.calls[1]);
    expect(store.unfollow).not.toHaveBeenCalled();
  });
});
