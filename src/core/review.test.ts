import { describe, expect, it } from "vitest";
import {
  PENDING_LIMIT,
  REVIEW_DECISIONS,
  REVIEW_KINDS,
  REVIEW_STATUSES,
  applyReviewEvent,
  checkNewPost,
  isEditable,
  type ReviewEvent,
  type ReviewStatus,
} from "./review";
import { prismaEnum } from "./testing/prismaEnum";

const AUTHOR = "student-1";
const REVIEWER = "chair-1";

const EVENTS: Record<ReviewEvent["type"], ReviewEvent> = {
  approve: { type: "approve", actorId: REVIEWER },
  decline: { type: "decline", actorId: REVIEWER, reason: "Out of scope" },
  take_down: { type: "take_down", actorId: REVIEWER, reason: "Not accurate" },
  withdraw: { type: "withdraw", actorId: AUTHOR },
  resubmit: { type: "resubmit", actorId: AUTHOR, pendingCount: 0 },
};

const post = (reviewStatus: ReviewStatus, authorId: string | null = AUTHOR) => ({ reviewStatus, authorId });

describe("review state machine (#50)", () => {
  describe("enum pins", () => {
    it("ReviewStatus matches prisma/schema.prisma", () => {
      expect([...REVIEW_STATUSES].sort()).toEqual(prismaEnum("ReviewStatus").sort());
    });
    it("ReviewKind matches prisma/schema.prisma", () => {
      expect([...REVIEW_KINDS].sort()).toEqual(prismaEnum("ReviewKind").sort());
    });
    it("ReviewDecision matches prisma/schema.prisma", () => {
      expect([...REVIEW_DECISIONS].sort()).toEqual(prismaEnum("ReviewDecision").sort());
    });
  });

  describe("allowed transitions", () => {
    it("pending to approved", () => {
      expect(applyReviewEvent(post("pending"), EVENTS.approve)).toEqual({
        ok: true,
        reviewStatus: "approved",
        review: { kind: "review", decision: "approved", reason: null },
        clearIdeaStatus: false,
      });
    });
    it("pending to declined", () => {
      expect(applyReviewEvent(post("pending"), EVENTS.decline)).toEqual({
        ok: true,
        reviewStatus: "declined",
        review: { kind: "review", decision: "declined", reason: "Out of scope" },
        clearIdeaStatus: false,
      });
    });
    it("pending to withdrawn writes no review row", () => {
      expect(applyReviewEvent(post("pending"), EVENTS.withdraw)).toEqual({
        ok: true,
        reviewStatus: "withdrawn",
        review: null,
        clearIdeaStatus: false,
      });
    });
    it("declined to pending on resubmit", () => {
      expect(applyReviewEvent(post("declined"), EVENTS.resubmit)).toEqual({
        ok: true,
        reviewStatus: "pending",
        review: null,
        clearIdeaStatus: false,
      });
    });
    it("declined to withdrawn", () => {
      expect(applyReviewEvent(post("declined"), EVENTS.withdraw)).toEqual({
        ok: true,
        reviewStatus: "withdrawn",
        review: null,
        clearIdeaStatus: false,
      });
    });
    it("approved to declined by take-down, clearing the idea status", () => {
      expect(applyReviewEvent(post("approved"), EVENTS.take_down)).toEqual({
        ok: true,
        reviewStatus: "declined",
        review: { kind: "take_down", decision: "declined", reason: "Not accurate" },
        clearIdeaStatus: true,
      });
    });
  });

  describe("invalid transitions", () => {
    const allowed = new Set([
      "pending:approve",
      "pending:decline",
      "pending:withdraw",
      "declined:resubmit",
      "declined:withdraw",
      "approved:take_down",
      "approved:resubmit",
    ]);
    for (const from of REVIEW_STATUSES) {
      for (const type of Object.keys(EVENTS) as ReviewEvent["type"][]) {
        if (allowed.has(`${from}:${type}`)) continue;
        it(`${from} cannot ${type}`, () => {
          expect(applyReviewEvent(post(from), EVENTS[type])).toEqual({
            ok: false,
            error: { code: "invalid_transition", from, event: type },
          });
        });
      }
    }
  });

  describe("editing", () => {
    it("resubmit on an approved post is not_editable", () => {
      expect(applyReviewEvent(post("approved"), EVENTS.resubmit)).toEqual({
        ok: false,
        error: { code: "not_editable" },
      });
    });
    it("only a declined post is editable", () => {
      for (const status of REVIEW_STATUSES) expect(isEditable(status), status).toBe(status === "declined");
    });
  });

  describe("own post", () => {
    it("the author cannot approve, decline, or take down", () => {
      const own = { ...EVENTS.approve, actorId: AUTHOR };
      expect(applyReviewEvent(post("pending"), own)).toEqual({ ok: false, error: { code: "own_post" } });
      expect(applyReviewEvent(post("pending"), { ...EVENTS.decline, actorId: AUTHOR })).toEqual({
        ok: false,
        error: { code: "own_post" },
      });
      expect(applyReviewEvent(post("approved"), { ...EVENTS.take_down, actorId: AUTHOR })).toEqual({
        ok: false,
        error: { code: "own_post" },
      });
    });
    it("the VP can decide a chair's post, and the chair can decide the VP's (gap 7)", () => {
      const vpDecides = applyReviewEvent(post("pending", "chair-1"), { type: "approve", actorId: "vp-1" });
      const chairDecides = applyReviewEvent(post("pending", "vp-1"), { type: "approve", actorId: "chair-1" });
      expect(vpDecides.ok).toBe(true);
      expect(chairDecides.ok).toBe(true);
    });
    it("anyone can decide a post whose author is gone", () => {
      expect(applyReviewEvent(post("pending", null), EVENTS.approve).ok).toBe(true);
    });
  });

  describe("author-only events", () => {
    it("withdraw and resubmit by someone else return not_author", () => {
      expect(applyReviewEvent(post("pending"), { type: "withdraw", actorId: "other" })).toEqual({
        ok: false,
        error: { code: "not_author" },
      });
      expect(
        applyReviewEvent(post("declined"), { type: "resubmit", actorId: "other", pendingCount: 0 }),
      ).toEqual({ ok: false, error: { code: "not_author" } });
    });
    it("a post with no author has no one who can withdraw or resubmit", () => {
      expect(applyReviewEvent(post("pending", null), EVENTS.withdraw)).toEqual({
        ok: false,
        error: { code: "not_author" },
      });
      expect(applyReviewEvent(post("declined", null), EVENTS.resubmit)).toEqual({
        ok: false,
        error: { code: "not_author" },
      });
    });
  });

  describe("reasons", () => {
    it("decline and take-down need a non-empty reason", () => {
      for (const reason of ["", "   "]) {
        expect(applyReviewEvent(post("pending"), { type: "decline", actorId: REVIEWER, reason })).toEqual({
          ok: false,
          error: { code: "reason_required" },
        });
        expect(applyReviewEvent(post("approved"), { type: "take_down", actorId: REVIEWER, reason })).toEqual({
          ok: false,
          error: { code: "reason_required" },
        });
      }
    });
    it("a reason is returned trimmed", () => {
      const result = applyReviewEvent(post("pending"), {
        type: "decline",
        actorId: REVIEWER,
        reason: "  Too broad  ",
      });
      expect(result).toMatchObject({ ok: true, review: { reason: "Too broad" } });
    });
  });

  describe("pending limit", () => {
    it("resubmit succeeds below the limit", () => {
      expect(
        applyReviewEvent(post("declined"), { type: "resubmit", actorId: AUTHOR, pendingCount: 2 }).ok,
      ).toBe(true);
    });
    it("resubmit at or over the limit returns pending_limit", () => {
      for (const pendingCount of [3, 4]) {
        expect(
          applyReviewEvent(post("declined"), { type: "resubmit", actorId: AUTHOR, pendingCount }),
        ).toEqual({
          ok: false,
          error: { code: "pending_limit", limit: 3 },
        });
      }
    });
    it("checkNewPost behaves the same", () => {
      expect(PENDING_LIMIT).toBe(3);
      expect(checkNewPost(2)).toEqual({ ok: true });
      for (const count of [3, 4]) {
        expect(checkNewPost(count)).toEqual({ ok: false, error: { code: "pending_limit", limit: 3 } });
      }
    });
  });

  describe("guard order", () => {
    it("the author declining their own post with an empty reason gets own_post", () => {
      expect(applyReviewEvent(post("pending"), { type: "decline", actorId: AUTHOR, reason: "" })).toEqual({
        ok: false,
        error: { code: "own_post" },
      });
    });
    it("a non-author resubmitting an approved post gets not_editable", () => {
      expect(
        applyReviewEvent(post("approved"), { type: "resubmit", actorId: "other", pendingCount: 0 }),
      ).toEqual({ ok: false, error: { code: "not_editable" } });
    });
  });

  it("never throws for any status and event pair", () => {
    for (const status of REVIEW_STATUSES) {
      for (const event of Object.values(EVENTS)) {
        expect(() => applyReviewEvent(post(status), event)).not.toThrow();
      }
    }
  });
});
