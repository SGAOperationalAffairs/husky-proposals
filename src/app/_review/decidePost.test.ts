import { describe, expect, it, vi } from "vitest";
import type { Session } from "@/auth/contract";
import { BOARD_CODES } from "@/core/boards";
import { BOARD_POSITIONS, VP_CAMPUS_AFFAIRS, rolesFromPositions } from "@/core/positions";
import { decidePost, type ReviewStore, type ReviewTarget } from "./decidePost";

// The review actions' rules (#58), against a fake store, checking what it received.
const NOW = new Date("2026-11-03T15:00:00.000Z");
const IDEA = "00000000-0000-4000-8000-000000000101";
const REVISION = "00000000-0000-4000-8000-000000000301";
const AUTHOR = "00000000-0000-4000-8000-0000000000a1";

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

function target(overrides: Partial<ReviewTarget> = {}): ReviewTarget {
  return {
    id: IDEA,
    boardId: "DAB",
    authorId: AUTHOR,
    reviewStatus: "pending",
    number: null,
    latestRevisionId: REVISION,
    ...overrides,
  };
}

function fakeStore(found: ReviewTarget | null, recorded: { reviewId: string } | null = { reviewId: "r-1" }) {
  const store = {
    find: vi.fn(async () => found),
    nextNumber: vi.fn(async () => 157),
    record: vi.fn(async () => recorded),
  } satisfies ReviewStore;
  return store;
}

describe("decidePost (#58)", () => {
  describe("approve", () => {
    it("the board's chair approves: a number, collecting support, and the public tags", async () => {
      const store = fakeStore(target());
      const result = await decidePost(store, dabChair, "approve", { ideaId: IDEA }, NOW);
      expect(result).toEqual({
        ok: true,
        reviewStatus: "approved",
        number: 157,
        refresh: ["ideas", "idea:157"],
      });
      expect(store.record).toHaveBeenCalledWith({
        ideaId: IDEA,
        from: "pending",
        patch: {
          reviewStatus: "approved",
          number: 157,
          approvedAt: NOW,
          status: "collecting_support",
          waitingReason: null,
          statusChangedAt: NOW,
        },
        review: {
          kind: "review",
          decision: "approved",
          reason: null,
          revisionId: REVISION,
          reviewerId: dabChair.user.id,
          decidedAt: NOW,
        },
        reviewer: { id: dabChair.user.id, email: dabChair.user.email, displayName: dabChair.user.name },
      });
    });

    it("the VP approves a post on every board", async () => {
      for (const boardId of BOARD_CODES) {
        const store = fakeStore(target({ boardId }));
        const result = await decidePost(store, vp, "approve", { ideaId: IDEA }, NOW);
        expect(result.ok, boardId).toBe(true);
      }
    });

    it("approving a taken-down idea again keeps its number and resets approvedAt", async () => {
      const store = fakeStore(target({ reviewStatus: "declined", number: 131 }));
      // A declined post cannot be approved: it must be resubmitted (pending) first.
      expect(await decidePost(store, dabChair, "approve", { ideaId: IDEA }, NOW)).toMatchObject({
        ok: false,
        error: { code: "invalid_transition" },
      });

      const resubmitted = fakeStore(target({ reviewStatus: "pending", number: 131 }));
      const result = await decidePost(resubmitted, dabChair, "approve", { ideaId: IDEA }, NOW);
      expect(result).toMatchObject({ ok: true, number: 131, refresh: ["ideas", "idea:131"] });
      expect(resubmitted.nextNumber).not.toHaveBeenCalled();
      expect(resubmitted.record).toHaveBeenCalledWith(
        expect.objectContaining({ patch: expect.objectContaining({ number: 131, approvedAt: NOW }) }),
      );
    });
  });

  describe("decline", () => {
    it("the chair declines with a reason: trimmed on the review row, nothing public to refresh", async () => {
      const store = fakeStore(target());
      const result = await decidePost(
        store,
        dabChair,
        "decline",
        { ideaId: IDEA, reason: "  Already planned for spring, so it cannot take a new slot this year  " },
        NOW,
      );
      expect(result).toEqual({ ok: true, reviewStatus: "declined", number: null, refresh: [] });
      expect(store.record).toHaveBeenCalledWith(
        expect.objectContaining({
          patch: { reviewStatus: "declined" },
          review: expect.objectContaining({
            kind: "review",
            decision: "declined",
            reason: "Already planned for spring, so it cannot take a new slot this year",
          }),
        }),
      );
      expect(store.nextNumber).not.toHaveBeenCalled();
    });

    it("a whitespace-only reason is invalid and nothing is read or written", async () => {
      const store = fakeStore(target());
      const result = await decidePost(store, dabChair, "decline", { ideaId: IDEA, reason: "   " }, NOW);
      expect(result).toEqual({ ok: false, error: { code: "invalid", fields: ["reason"] } });
      expect(store.find).not.toHaveBeenCalled();
      expect(store.record).not.toHaveBeenCalled();
    });

    it("a decline reason under 40 characters is invalid and nothing is read or written", async () => {
      const store = fakeStore(target());
      const result = await decidePost(store, dabChair, "decline", { ideaId: IDEA, reason: "Too short" }, NOW);
      expect(result).toEqual({ ok: false, error: { code: "invalid", fields: ["reason"] } });
      expect(store.find).not.toHaveBeenCalled();
      expect(store.record).not.toHaveBeenCalled();
    });

    it("a bad id is invalid", async () => {
      const store = fakeStore(target());
      const result = await decidePost(store, dabChair, "approve", { ideaId: "nope" }, NOW);
      expect(result).toEqual({ ok: false, error: { code: "invalid", fields: ["ideaId"] } });
    });
  });

  describe("take down", () => {
    it("moves an approved idea to declined, clears its status, keeps the number, and refreshes both tags", async () => {
      const store = fakeStore(target({ reviewStatus: "approved", number: 131 }));
      const result = await decidePost(
        store,
        dabChair,
        "take_down",
        { ideaId: IDEA, reason: "The details were not accurate" },
        NOW,
      );
      expect(result).toEqual({
        ok: true,
        reviewStatus: "declined",
        number: 131,
        refresh: ["ideas", "idea:131"],
      });
      expect(store.record).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "approved",
          patch: { reviewStatus: "declined", status: null, waitingReason: null },
          review: expect.objectContaining({
            kind: "take_down",
            decision: "declined",
            reason: "The details were not accurate",
          }),
        }),
      );
    });

    it("a pending post cannot be taken down", async () => {
      const store = fakeStore(target());
      const result = await decidePost(store, dabChair, "take_down", { ideaId: IDEA, reason: "No" }, NOW);
      expect(result).toEqual({
        ok: false,
        error: { code: "invalid_transition", from: "pending", event: "take_down" },
      });
      expect(store.record).not.toHaveBeenCalled();
    });
  });

  describe("who may decide", () => {
    it("a chair on another board, a student, and a member get not_allowed and nothing is written", async () => {
      for (const who of [dabChair, student, dabMember]) {
        const store = fakeStore(target({ boardId: "CPAB" }));
        const result = await decidePost(store, who, "approve", { ideaId: IDEA }, NOW);
        expect(result).toEqual({ ok: false, error: { code: "not_allowed" } });
        expect(store.nextNumber).not.toHaveBeenCalled();
        expect(store.record).not.toHaveBeenCalled();
      }
    });

    it("a chair cannot decide their own post, but the VP still can", async () => {
      const own = target({ authorId: dabChair.user.id });
      const refused = await decidePost(fakeStore(own), dabChair, "approve", { ideaId: IDEA }, NOW);
      expect(refused).toEqual({ ok: false, error: { code: "own_post" } });
      const byVp = await decidePost(fakeStore(own), vp, "approve", { ideaId: IDEA }, NOW);
      expect(byVp.ok).toBe(true);
    });

    it("the VP cannot decide their own post either", async () => {
      const result = await decidePost(
        fakeStore(target({ authorId: vp.user.id })),
        vp,
        "approve",
        { ideaId: IDEA },
        NOW,
      );
      expect(result).toEqual({ ok: false, error: { code: "own_post" } });
    });
  });

  describe("missing and moved-on posts", () => {
    it("an unknown idea is not_found", async () => {
      const result = await decidePost(fakeStore(null), dabChair, "approve", { ideaId: IDEA }, NOW);
      expect(result).toEqual({ ok: false, error: { code: "not_found" } });
    });

    it("an idea on an unknown board is not_allowed", async () => {
      const result = await decidePost(
        fakeStore(target({ boardId: "ZZZ" })),
        vp,
        "approve",
        { ideaId: IDEA },
        NOW,
      );
      expect(result).toEqual({ ok: false, error: { code: "not_allowed" } });
    });

    it("a record that finds the post already decided is already_decided", async () => {
      const result = await decidePost(fakeStore(target(), null), dabChair, "approve", { ideaId: IDEA }, NOW);
      expect(result).toEqual({ ok: false, error: { code: "already_decided" } });
    });
  });
});
