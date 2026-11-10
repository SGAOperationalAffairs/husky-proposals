import { describe, expect, it, vi } from "vitest";
import type { Session } from "@/auth/contract";
import { rolesFromPositions } from "@/core/positions";
import { resubmitPost, withdrawPost, type OwnPostStore, type OwnPostTarget } from "./ownPost";

// The author's resubmit and withdraw rules (#56), against a fake store.
const NOW = new Date("2026-11-04T15:00:00.000Z");
const IDEA = "00000000-0000-4000-8000-000000000101";
const AUTHOR = "00000000-0000-4000-8000-0000000000a1";
const STRANGER = "00000000-0000-4000-8000-0000000000a2";

function sessionFor(id: string): Session {
  return {
    user: { id, email: `${id}@example.com`, name: `User ${id}` },
    positions: [],
    roles: rolesFromPositions([]),
  };
}
const author = sessionFor(AUTHOR);
const stranger = sessionFor(STRANGER);

function target(overrides: Partial<OwnPostTarget> = {}): OwnPostTarget {
  return { id: IDEA, authorId: AUTHOR, reviewStatus: "declined", latestVersion: 1, ...overrides };
}

function fakeStore(found: OwnPostTarget | null, options: { pending?: number; changed?: boolean } = {}) {
  return {
    find: vi.fn(async () => found),
    countPending: vi.fn(async () => options.pending ?? 0),
    resubmit: vi.fn(async () => options.changed ?? true),
    withdraw: vi.fn(async () => options.changed ?? true),
  } satisfies OwnPostStore;
}

const edit = {
  ideaId: IDEA,
  title: "Later dining hours",
  summary: "The dining hall closes early on Sundays.",
  category: "green_initiatives",
};

describe("resubmitPost (#56)", () => {
  it("the author resubmits a declined post: version + 1, pending, and the board from the category", async () => {
    const store = fakeStore(target({ latestVersion: 2 }));
    expect(await resubmitPost(store, author, edit, NOW)).toEqual({ ok: true, id: IDEA, version: 3 });
    expect(store.resubmit).toHaveBeenCalledWith({
      ideaId: IDEA,
      from: "declined",
      patch: expect.objectContaining({
        title: "Later dining hours",
        description: "The dining hall closes early on Sundays.",
        boardId: "GIB",
        reviewStatus: "pending",
        submittedAt: NOW,
      }),
      revision: expect.objectContaining({ version: 3, category: "green_initiatives", submittedAt: NOW }),
    });
  });

  it("a non-author gets not_found, with no write and no pending count read", async () => {
    const store = fakeStore(target());
    expect(await resubmitPost(store, stranger, edit, NOW)).toEqual({
      ok: false,
      error: { code: "not_found" },
    });
    expect(store.countPending).not.toHaveBeenCalled();
    expect(store.resubmit).not.toHaveBeenCalled();
  });

  it("a missing post and a deleted author both get not_found", async () => {
    expect(await resubmitPost(fakeStore(null), author, edit, NOW)).toEqual({
      ok: false,
      error: { code: "not_found" },
    });
    const orphan = fakeStore(target({ authorId: null }));
    expect(await resubmitPost(orphan, author, edit, NOW)).toEqual({
      ok: false,
      error: { code: "not_found" },
    });
  });

  it("an approved post is not editable", async () => {
    const store = fakeStore(target({ reviewStatus: "approved" }));
    expect(await resubmitPost(store, author, edit, NOW)).toEqual({
      ok: false,
      error: { code: "not_editable" },
    });
    expect(store.resubmit).not.toHaveBeenCalled();
  });

  it("a pending post cannot be resubmitted", async () => {
    const store = fakeStore(target({ reviewStatus: "pending" }));
    expect(await resubmitPost(store, author, edit, NOW)).toMatchObject({
      ok: false,
      error: { code: "invalid_transition", from: "pending" },
    });
  });

  it("3 posts already pending is the pending limit", async () => {
    const store = fakeStore(target(), { pending: 3 });
    expect(await resubmitPost(store, author, edit, NOW)).toEqual({
      ok: false,
      error: { code: "pending_limit", limit: 3 },
    });
    expect(store.resubmit).not.toHaveBeenCalled();
  });

  it("bad input names the fields and reads nothing", async () => {
    const store = fakeStore(target());
    const result = await resubmitPost(store, author, { ...edit, title: "", ideaId: "nope" }, NOW);
    expect(result).toMatchObject({ ok: false, error: { code: "invalid" } });
    if (!result.ok && result.error.code === "invalid") {
      expect(result.error.fields.sort()).toEqual(["ideaId", "title"]);
    }
    expect(store.find).not.toHaveBeenCalled();
  });

  it("a guard miss is already_changed", async () => {
    const store = fakeStore(target(), { changed: false });
    expect(await resubmitPost(store, author, edit, NOW)).toEqual({
      ok: false,
      error: { code: "already_changed" },
    });
  });
});

describe("withdrawPost (#56)", () => {
  it.each(["pending", "declined"] as const)("the author withdraws a %s post", async (reviewStatus) => {
    const store = fakeStore(target({ reviewStatus }));
    expect(await withdrawPost(store, author, { ideaId: IDEA })).toEqual({ ok: true, id: IDEA });
    expect(store.withdraw).toHaveBeenCalledWith({ ideaId: IDEA, from: reviewStatus });
  });

  it("a non-author gets not_found and nothing is written", async () => {
    const store = fakeStore(target({ reviewStatus: "pending" }));
    expect(await withdrawPost(store, stranger, { ideaId: IDEA })).toEqual({
      ok: false,
      error: { code: "not_found" },
    });
    expect(store.withdraw).not.toHaveBeenCalled();
  });

  it.each(["approved", "withdrawn"] as const)("a %s post is an invalid transition", async (reviewStatus) => {
    const store = fakeStore(target({ reviewStatus }));
    expect(await withdrawPost(store, author, { ideaId: IDEA })).toMatchObject({
      ok: false,
      error: { code: "invalid_transition", from: reviewStatus, event: "withdraw" },
    });
    expect(store.withdraw).not.toHaveBeenCalled();
  });

  it("bad input is invalid, and a guard miss is already_changed", async () => {
    expect(await withdrawPost(fakeStore(target()), author, { ideaId: 5 })).toEqual({
      ok: false,
      error: { code: "invalid", fields: ["ideaId"] },
    });
    const store = fakeStore(target(), { changed: false });
    expect(await withdrawPost(store, author, { ideaId: IDEA })).toEqual({
      ok: false,
      error: { code: "already_changed" },
    });
  });
});
