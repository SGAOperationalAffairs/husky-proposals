import { expect, it } from "vitest";
import type { Session } from "@/auth/contract";
import { decidePost } from "@/app/_review/decidePost";
import { BOARD_POSITIONS, rolesFromPositions } from "@/core/positions";
import { describeWithDatabase } from "@/db/testing/database";
import { ideas, users } from "@/db/testing/fixtures";
import { withSeed } from "@/db/testing/seededTransaction";
import { isPublic } from "./ideaSelects";
import { prismaReviewStore } from "./reviewStore";

// The review actions against Postgres (#58), inside the seed's rolled-back transaction.
const NOW = new Date();
const dabChair: Session = {
  user: { id: users.dabChair.id, email: users.dabChair.email, name: users.dabChair.displayName },
  positions: [{ key: BOARD_POSITIONS.DAB.lead, name: "Chair" }],
  roles: rolesFromPositions([BOARD_POSITIONS.DAB.lead]),
};
// A reviewer the seed has never seen: the store must write their user row.
const newChair: Session = {
  user: { id: "00000000-0000-4000-8000-0000000000c9", email: "new.chair@example.com", name: "New Chair" },
  positions: [{ key: BOARD_POSITIONS.DAB.lead, name: "Chair" }],
  roles: rolesFromPositions([BOARD_POSITIONS.DAB.lead]),
};

describeWithDatabase("review decisions (#58)", () => {
  it("approving the pending post gives the next number after the seed's highest, and makes it public", async () => {
    await withSeed(async (tx) => {
      const result = await decidePost(
        prismaReviewStore(tx),
        dabChair,
        "approve",
        { ideaId: ideas.pending.id },
        NOW,
      );
      expect(result).toMatchObject({ ok: true, reviewStatus: "approved", number: 157 });
      const idea = await tx.idea.findUniqueOrThrow({ where: { id: ideas.pending.id } });
      expect(idea).toMatchObject({ reviewStatus: "approved", status: "collecting_support", number: 157 });
      expect(idea.approvedAt).toEqual(NOW);
      expect(await tx.idea.count({ where: { ...isPublic, id: ideas.pending.id } })).toBe(1);
      const review = await tx.review.findFirstOrThrow({
        where: { ideaId: ideas.pending.id },
        orderBy: { decidedAt: "desc" },
      });
      expect(review).toMatchObject({ kind: "review", decision: "approved", reviewerId: dabChair.user.id });
    });
  });

  it("declining writes the reason and leaves the post out of the public query", async () => {
    await withSeed(async (tx) => {
      const result = await decidePost(
        prismaReviewStore(tx),
        dabChair,
        "decline",
        { ideaId: ideas.pending.id, reason: "Already planned with Dining Services for the spring term." },
        NOW,
      );
      expect(result).toMatchObject({ ok: true, reviewStatus: "declined", refresh: [] });
      const review = await tx.review.findFirstOrThrow({ where: { ideaId: ideas.pending.id } });
      expect(review).toMatchObject({
        kind: "review",
        decision: "declined",
        reason: "Already planned with Dining Services for the spring term.",
      });
      expect(await tx.idea.count({ where: { ...isPublic, id: ideas.pending.id } })).toBe(0);
    });
  });

  it("taking down an approved idea removes it from the public query and keeps its number", async () => {
    await withSeed(async (tx) => {
      const result = await decidePost(
        prismaReviewStore(tx),
        dabChair,
        "take_down",
        {
          ideaId: ideas.lateNightDining.id,
          reason: "The details were not accurate, so the board could not judge the idea.",
        },
        NOW,
      );
      expect(result).toMatchObject({ ok: true, reviewStatus: "declined", number: 131 });
      const idea = await tx.idea.findUniqueOrThrow({ where: { id: ideas.lateNightDining.id } });
      expect(idea).toMatchObject({
        reviewStatus: "declined",
        status: null,
        waitingReason: null,
        number: 131,
      });
      expect(await tx.idea.count({ where: { ...isPublic, id: ideas.lateNightDining.id } })).toBe(0);
      const takeDown = await tx.review.findFirstOrThrow({
        where: { ideaId: ideas.lateNightDining.id, kind: "take_down" },
      });
      expect(takeDown).toMatchObject({
        decision: "declined",
        reason: "The details were not accurate, so the board could not judge the idea.",
      });
    });
  });

  it("a second decision on the same post writes no second review row", async () => {
    await withSeed(async (tx) => {
      const store = prismaReviewStore(tx);
      const first = await decidePost(store, dabChair, "approve", { ideaId: ideas.pending.id }, NOW);
      expect(first.ok).toBe(true);
      // The store itself refuses a write from a status the post has left.
      const target = await store.find(ideas.pending.id);
      const second = await store.record({
        ideaId: ideas.pending.id,
        from: "pending",
        patch: { reviewStatus: "declined" },
        review: {
          kind: "review",
          decision: "declined",
          reason: "Too late",
          revisionId: target!.latestRevisionId,
          reviewerId: dabChair.user.id,
          decidedAt: NOW,
        },
        reviewer: { id: dabChair.user.id, email: dabChair.user.email, displayName: dabChair.user.name },
      });
      expect(second).toBeNull();
      expect(await tx.review.count({ where: { ideaId: ideas.pending.id } })).toBe(1);
    });
  });

  it("a reviewer with no user row yet gets one", async () => {
    await withSeed(async (tx) => {
      expect(await tx.user.count({ where: { id: newChair.user.id } })).toBe(0);
      const result = await decidePost(
        prismaReviewStore(tx),
        newChair,
        "approve",
        { ideaId: ideas.pending.id },
        NOW,
      );
      expect(result.ok).toBe(true);
      expect(await tx.user.count({ where: { id: newChair.user.id } })).toBe(1);
    });
  });
});
