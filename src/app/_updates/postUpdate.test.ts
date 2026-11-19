import { describe, expect, it, vi } from "vitest";
import type { Session } from "@/auth/contract";
import { BOARD_POSITIONS, VP_CAMPUS_AFFAIRS, rolesFromPositions } from "@/core/positions";
import { CHECK_IN_BODY, UPDATE_BODY_MAX } from "@/core/updates";
import { postUpdate, type UpdateStore, type UpdateTarget } from "./postUpdate";

const IDEA = "00000000-0000-4000-8000-000000000101";
const NOW = new Date("2026-12-01T15:00:00.000Z");

const dabChair: Session = {
  user: { id: "00000000-0000-4000-8000-0000000000b1", email: "chair@example.com", name: "Dana" },
  positions: [{ key: BOARD_POSITIONS.DAB.lead, name: "Chair" }],
  roles: rolesFromPositions([BOARD_POSITIONS.DAB.lead]),
};
const vp: Session = {
  user: { id: "00000000-0000-4000-8000-0000000000b4", email: "vp@example.com", name: "Vic" },
  positions: [{ key: VP_CAMPUS_AFFAIRS, name: "VP of Campus Affairs" }],
  roles: rolesFromPositions([VP_CAMPUS_AFFAIRS]),
};
const student: Session = {
  user: { id: "00000000-0000-4000-8000-0000000000a1", email: "maya@example.com", name: "Maya" },
  positions: [],
  roles: rolesFromPositions([]),
};

const target = (overrides: Partial<UpdateTarget> = {}): UpdateTarget => ({
  id: IDEA,
  number: 103,
  boardId: "DAB",
  reviewStatus: "approved",
  status: "in_progress",
  ...overrides,
});

function fakeStore(found: UpdateTarget | null = target()) {
  const store = {
    find: vi.fn(async () => found),
    ensureUser: vi.fn(async () => {}),
    record: vi.fn(async () => ({ updateId: "u-1" })),
  } satisfies UpdateStore;
  return store;
}

const board = (body: unknown) => ({ ideaId: IDEA, kind: "board", body });

describe("postUpdate (#130)", () => {
  it("posts a board update: trims the body, copies the leader, and notifies followers", async () => {
    const store = fakeStore();
    const result = await postUpdate(store, dabChair, board("  The committee met on Tuesday.  "), NOW);
    expect(result).toEqual({ ok: true, number: 103, kind: "board" });
    expect(store.ensureUser).toHaveBeenCalledWith({
      id: dabChair.user.id,
      email: "chair@example.com",
      displayName: "Dana",
    });
    expect(store.record).toHaveBeenCalledWith({
      ideaId: IDEA,
      kind: "board",
      body: "The committee met on Tuesday.",
      authorId: dabChair.user.id,
      now: NOW,
      notify: true,
    });
  });

  it("a check-in ignores any body, uses the fixed words, and notifies no one", async () => {
    const store = fakeStore();
    const result = await postUpdate(store, vp, { ideaId: IDEA, kind: "check_in", body: "Ignore me" }, NOW);
    expect(result).toEqual({ ok: true, number: 103, kind: "check_in" });
    expect(store.record).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "check_in", body: CHECK_IN_BODY, notify: false }),
    );
  });

  it("refuses bad input before reading anything", async () => {
    const store = fakeStore();
    expect(await postUpdate(store, dabChair, { ideaId: "nope", kind: "board", body: "x" }, NOW)).toEqual({
      ok: false,
      error: { code: "invalid", fields: ["ideaId"] },
    });
    expect(store.find).not.toHaveBeenCalled();
  });

  it("an empty, blank, or too-long board body is invalid on the body field", async () => {
    for (const body of [undefined, "", "   \n ", "x".repeat(UPDATE_BODY_MAX + 1)]) {
      const store = fakeStore();
      expect(await postUpdate(store, dabChair, board(body), NOW)).toEqual({
        ok: false,
        error: { code: "invalid", fields: ["body"] },
      });
      expect(store.record).not.toHaveBeenCalled();
    }
  });

  it("accepts a body of exactly the limit", async () => {
    const store = fakeStore();
    const result = await postUpdate(store, dabChair, board("x".repeat(UPDATE_BODY_MAX)), NOW);
    expect(result.ok).toBe(true);
  });

  it("refuses a body that still has a [bracket], and writes nothing", async () => {
    const store = fakeStore();
    const result = await postUpdate(store, dabChair, board("We reached a milestone: [describe it]."), NOW);
    expect(result).toEqual({ ok: false, error: { code: "body_placeholder" } });
    expect(store.record).not.toHaveBeenCalled();
  });

  it("a check-in is never refused for a placeholder or an empty body", async () => {
    const store = fakeStore();
    const result = await postUpdate(store, dabChair, { ideaId: IDEA, kind: "check_in", body: "[x]" }, NOW);
    expect(result.ok).toBe(true);
  });

  it("an idea that is missing, or not approved, is not found", async () => {
    for (const found of [
      null,
      target({ reviewStatus: "pending", status: null, number: null }),
      target({ reviewStatus: "declined", status: null, number: null }),
      target({ status: null }),
    ]) {
      const store = fakeStore(found);
      expect(await postUpdate(store, dabChair, board("Hello"), NOW)).toEqual({
        ok: false,
        error: { code: "not_found" },
      });
      expect(store.record).not.toHaveBeenCalled();
    }
  });

  it("a student, a chair of another board, and an unknown board code are not allowed", async () => {
    for (const [session, found] of [
      [student, target()],
      [dabChair, target({ boardId: "CPAB" })],
      [vp, target({ boardId: "ZZZ" })],
    ] as const) {
      const store = fakeStore(found);
      expect(await postUpdate(store, session, board("Hello"), NOW)).toEqual({
        ok: false,
        error: { code: "not_allowed" },
      });
      expect(store.ensureUser).not.toHaveBeenCalled();
      expect(store.record).not.toHaveBeenCalled();
    }
  });

  it("the board comes from the stored idea, so the VP may post on any board", async () => {
    const store = fakeStore(target({ boardId: "GIB" }));
    expect((await postUpdate(store, vp, board("Hello"), NOW)).ok).toBe(true);
  });

  it("only an in-progress idea takes an update", async () => {
    for (const status of ["collecting_support", "under_review", "waiting", "delivered", "closed"] as const) {
      const store = fakeStore(target({ status }));
      expect(await postUpdate(store, dabChair, board("Hello"), NOW)).toEqual({
        ok: false,
        error: { code: "not_in_progress" },
      });
      expect(store.record).not.toHaveBeenCalled();
    }
  });

  it("who may post is checked before the idea's status is revealed", async () => {
    const store = fakeStore(target({ status: "waiting" }));
    expect(await postUpdate(store, student, board("Hello"), NOW)).toEqual({
      ok: false,
      error: { code: "not_allowed" },
    });
  });
});
