import { describe, expect, it, vi } from "vitest";
import type { Session } from "@/auth/contract";
import { BOARD_CODES } from "@/core/boards";
import { BOARD_POSITIONS, VP_CAMPUS_AFFAIRS, rolesFromPositions } from "@/core/positions";
import type { IdeaStatus } from "@/core/statuses";
import { changeIdeaStatus, type StatusStore, type StatusTarget } from "./changeIdeaStatus";

// The status actions' rules (#98), against a fake store, checking what it received.
const NOW = new Date("2026-11-30T15:00:00.000Z");
const IDEA = "00000000-0000-4000-8000-000000000101";

function sessionFor(id: string, positions: string[]): Session {
  return {
    user: { id, email: `${id}@example.com`, name: `User ${id}` },
    positions: positions.map((key) => ({ key, name: key })),
    roles: rolesFromPositions(positions),
  };
}

const dabChair = sessionFor("00000000-0000-4000-8000-0000000000b1", [BOARD_POSITIONS.DAB.lead]);
const dabMember = sessionFor("00000000-0000-4000-8000-0000000000b2", [BOARD_POSITIONS.DAB.member]);
const student = sessionFor("00000000-0000-4000-8000-0000000000b3", []);
const vp = sessionFor("00000000-0000-4000-8000-0000000000b4", [VP_CAMPUS_AFFAIRS]);

function target(overrides: Partial<StatusTarget> = {}): StatusTarget {
  return {
    id: IDEA,
    number: 103,
    boardId: "DAB",
    reviewStatus: "approved",
    status: "collecting_support",
    waitingReason: null,
    scale: "small",
    guideline: 2,
    ...overrides,
  };
}

function fakeStore(
  found: StatusTarget | null,
  { load = [] as (string | null)[], recorded = { updateId: "u-1" } as { updateId: string } | null } = {},
) {
  const store = {
    find: vi.fn(async () => found),
    boardLoad: vi.fn(async () => load),
    record: vi.fn(async () => recorded),
  } satisfies StatusStore;
  return store;
}

const start = (store: StatusStore, session: Session, raw: unknown = { ideaId: IDEA }) =>
  changeIdeaStatus(store, session, "start", raw, NOW);
const hold = (store: StatusStore, session: Session, raw: unknown = { ideaId: IDEA, reason: "Busy" }) =>
  changeIdeaStatus(store, session, "hold", raw, NOW);
const deliver = (store: StatusStore, session: Session, raw: unknown = { ideaId: IDEA }) =>
  changeIdeaStatus(store, session, "deliver", raw, NOW);

describe("changeIdeaStatus (#98)", () => {
  describe("start", () => {
    it("the board's chair starts an idea: one patch, one system update, one status event", async () => {
      const store = fakeStore(target());
      const result = await start(store, dabChair);
      expect(result).toEqual({ ok: true, status: "in_progress", number: 103 });
      expect(store.record).toHaveBeenCalledTimes(1);
      expect(store.record).toHaveBeenCalledWith({
        ideaId: IDEA,
        from: "collecting_support",
        patch: { status: "in_progress", waitingReason: null, statusChangedAt: NOW },
        update: { kind: "system", body: "The Dining Advisory Board started work on this idea." },
        // One status event and no update event: followers get one email (#101).
        event: {
          kind: "status",
          ideaId: IDEA,
          status: "in_progress",
          waitingReason: null,
          changedAt: NOW,
        },
      });
    });

    it("the VP starts an idea on every board", async () => {
      for (const boardId of BOARD_CODES) {
        const result = await start(fakeStore(target({ boardId })), vp);
        expect(result.ok, boardId).toBe(true);
      }
    });

    it("starts a held idea and clears its reason", async () => {
      const store = fakeStore(target({ status: "waiting", waitingReason: "Busy" }));
      expect(await start(store, dabChair)).toMatchObject({ ok: true, status: "in_progress" });
      expect(store.record).toHaveBeenCalledWith(
        expect.objectContaining({ from: "waiting", patch: expect.objectContaining({ waitingReason: null }) }),
      );
    });

    it("shows a heads-up past the guideline and writes nothing", async () => {
      const store = fakeStore(target(), { load: ["small", "medium"] });
      expect(await start(store, dabChair)).toEqual({
        ok: false,
        error: { code: "heads_up", inProgress: 2, guideline: 2 },
      });
      expect(store.record).not.toHaveBeenCalled();
    });

    it("starts anyway once confirmed", async () => {
      const store = fakeStore(target(), { load: ["small", "medium"] });
      const result = await start(store, dabChair, { ideaId: IDEA, confirmed: true });
      expect(result).toMatchObject({ ok: true, status: "in_progress" });
      expect(store.record).toHaveBeenCalledTimes(1);
    });

    it("counts a large idea as two when deciding on the heads-up", async () => {
      const store = fakeStore(target({ scale: "large" }), { load: ["small"] });
      expect(await start(store, dabChair)).toMatchObject({ ok: false, error: { code: "heads_up" } });
    });

    it("an idea that is already in progress is an invalid transition", async () => {
      const store = fakeStore(target({ status: "in_progress" }));
      expect(await start(store, dabChair)).toMatchObject({
        ok: false,
        error: { code: "same_status" },
      });
      expect(store.record).not.toHaveBeenCalled();
    });

    it("a delivered idea cannot be started", async () => {
      const store = fakeStore(target({ status: "delivered" }));
      expect(await start(store, dabChair)).toMatchObject({
        ok: false,
        error: { code: "invalid_transition" },
      });
    });
  });

  describe("hold", () => {
    it("writes the reason, a system update with it, and the status event", async () => {
      const store = fakeStore(target());
      const result = await hold(store, dabChair, {
        ideaId: IDEA,
        reason: "  It needs more information first. ",
      });
      expect(result).toEqual({ ok: true, status: "waiting", number: 103 });
      expect(store.record).toHaveBeenCalledWith({
        ideaId: IDEA,
        from: "collecting_support",
        patch: { status: "waiting", waitingReason: "It needs more information first", statusChangedAt: NOW },
        update: {
          kind: "system",
          body: "The Dining Advisory Board put this idea on hold: It needs more information first.",
        },
        event: {
          kind: "status",
          ideaId: IDEA,
          status: "waiting",
          waitingReason: "It needs more information first",
          changedAt: NOW,
        },
      });
    });

    it("needs a reason", async () => {
      for (const raw of [{ ideaId: IDEA }, { ideaId: IDEA, reason: "   " }]) {
        const store = fakeStore(target());
        expect(await hold(store, dabChair, raw)).toEqual({
          ok: false,
          error: { code: "invalid", fields: ["reason"] },
        });
        expect(store.record).not.toHaveBeenCalled();
      }
    });

    it("a reason that is only periods counts as missing", async () => {
      const store = fakeStore(target());
      expect(await hold(store, dabChair, { ideaId: IDEA, reason: "..." })).toEqual({
        ok: false,
        error: { code: "waiting_reason_required" },
      });
    });

    it("only a collecting support idea can be held", async () => {
      const held = fakeStore(target({ status: "waiting", waitingReason: "Busy" }));
      expect(await hold(held, dabChair)).toMatchObject({ ok: false, error: { code: "same_status" } });
      const running = fakeStore(target({ status: "in_progress" }));
      expect(await hold(running, dabChair)).toMatchObject({
        ok: false,
        error: { code: "invalid_transition" },
      });
      expect(held.record).not.toHaveBeenCalled();
      expect(running.record).not.toHaveBeenCalled();
    });
  });

  describe("deliver", () => {
    it("writes the delivered patch, update, and event", async () => {
      const store = fakeStore(target({ status: "in_progress" }));
      expect(await deliver(store, dabChair)).toEqual({ ok: true, status: "delivered", number: 103 });
      expect(store.record).toHaveBeenCalledWith({
        ideaId: IDEA,
        from: "in_progress",
        patch: { status: "delivered", waitingReason: null, statusChangedAt: NOW, deliveredAt: NOW },
        update: { kind: "system", body: "The Dining Advisory Board marked this idea delivered." },
        event: { kind: "status", ideaId: IDEA, status: "delivered", waitingReason: null, changedAt: NOW },
      });
    });

    it("only an in progress idea can be delivered", async () => {
      for (const status of ["collecting_support", "waiting"] as IdeaStatus[]) {
        const store = fakeStore(target({ status }));
        expect(await deliver(store, dabChair)).toMatchObject({
          ok: false,
          error: { code: "invalid_transition" },
        });
      }
      expect(await deliver(fakeStore(target({ status: "delivered" })), dabChair)).toMatchObject({
        ok: false,
        error: { code: "same_status" },
      });
    });
  });

  describe("who may change status", () => {
    it("a chair is refused on another board", async () => {
      const store = fakeStore(target({ boardId: "CSC" }));
      for (const run of [start, hold, deliver]) {
        expect(await run(store, dabChair)).toEqual({ ok: false, error: { code: "not_allowed" } });
      }
      expect(store.record).not.toHaveBeenCalled();
    });

    it("a board member who is not the chair or director, and a student, are refused", async () => {
      for (const session of [dabMember, student]) {
        const store = fakeStore(target());
        expect(await start(store, session)).toEqual({ ok: false, error: { code: "not_allowed" } });
        expect(store.record).not.toHaveBeenCalled();
      }
    });

    it("an unknown board code fails closed, even for the VP", async () => {
      const store = fakeStore(target({ boardId: "ZZZ" }));
      expect(await start(store, vp)).toEqual({ ok: false, error: { code: "not_allowed" } });
    });

    it("never trusts a board sent by the client", async () => {
      const store = fakeStore(target({ boardId: "CSC" }));
      const result = await start(store, dabChair, { ideaId: IDEA, boardId: "DAB" });
      expect(result).toEqual({ ok: false, error: { code: "not_allowed" } });
    });
  });

  describe("failures", () => {
    it("a bad id is invalid and reads nothing", async () => {
      const store = fakeStore(target());
      expect(await start(store, dabChair, { ideaId: "nope" })).toEqual({
        ok: false,
        error: { code: "invalid", fields: ["ideaId"] },
      });
      expect(store.find).not.toHaveBeenCalled();
    });

    it("a missing or not approved idea is not found", async () => {
      expect(await start(fakeStore(null), dabChair)).toEqual({ ok: false, error: { code: "not_found" } });
      const pending = fakeStore(target({ reviewStatus: "pending", status: null }));
      expect(await start(pending, dabChair)).toEqual({ ok: false, error: { code: "not_found" } });
    });

    it("a lost race is already_changed", async () => {
      const store = fakeStore(target(), { recorded: null });
      expect(await start(store, dabChair)).toEqual({ ok: false, error: { code: "already_changed" } });
    });
  });
});
