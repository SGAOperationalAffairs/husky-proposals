import { expect, it } from "vitest";
import type { Session } from "@/auth/contract";
import { resubmitPost, withdrawPost } from "@/app/_post/ownPost";
import { AlreadyDecidedError, decidePost } from "@/app/_review/decidePost";
import { BOARD_POSITIONS, rolesFromPositions } from "@/core/positions";
import { withCommittedRows } from "@/db/testing/committed";
import { describeWithDatabase } from "@/db/testing/database";
import { buildIdea, buildReview, buildRevision, buildUser, testUuid } from "@/db/testing/factories";
import { ideas, users } from "@/db/testing/fixtures";
import { withSeed } from "@/db/testing/seededTransaction";
import { isPublic } from "./ideaSelects";
import { prismaOwnPostStore } from "./ownPostStore";
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

  it("sending back an approved idea declines it, keeps its number, and takes it off the public query (#286)", async () => {
    await withSeed(async (tx) => {
      const reason = "Add the cost and the place, then send it again for review.";
      const result = await decidePost(
        prismaReviewStore(tx),
        dabChair,
        "send_back",
        { ideaId: ideas.lateNightDining.id, reason },
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
      const sendBack = await tx.review.findFirstOrThrow({
        where: { ideaId: ideas.lateNightDining.id, kind: "send_back" },
      });
      expect(sendBack).toMatchObject({ decision: "declined", reason });
    });
  });

  it("a sent-back idea can be resubmitted, and approving it again keeps its number (#286)", async () => {
    await withSeed(async (tx) => {
      const reason = "Add the cost and the place, then send it again for review.";
      await decidePost(
        prismaReviewStore(tx),
        dabChair,
        "send_back",
        { ideaId: ideas.lateNightDining.id, reason },
        NOW,
      );
      const author: Session = {
        user: {
          id: users.anonymousAuthor.id,
          email: users.anonymousAuthor.email,
          name: users.anonymousAuthor.displayName,
        },
        positions: [],
        roles: rolesFromPositions([]),
      };
      const resubmitted = await resubmitPost(
        prismaOwnPostStore(tx),
        author,
        {
          ideaId: ideas.lateNightDining.id,
          title: "A late-night dining option on weeknights",
          summary: "Keep one dining location open until midnight for students coming out of labs.",
          details:
            "Labs and the library close late, and the dining halls close before they do. One location open later would fix that for students working into the night.",
          category: "dining",
        },
        NOW,
      );
      expect(resubmitted).toMatchObject({ ok: true, version: 2 });
      expect(await tx.idea.findUniqueOrThrow({ where: { id: ideas.lateNightDining.id } })).toMatchObject({
        reviewStatus: "pending",
        number: 131,
      });

      const approved = await decidePost(
        prismaReviewStore(tx),
        dabChair,
        "approve",
        { ideaId: ideas.lateNightDining.id },
        NOW,
      );
      expect(approved).toMatchObject({ ok: true, reviewStatus: "approved", number: 131 });
    });
  });

  it("taking down an approved idea ends it as taken_down, keeping its number and its reason (#286)", async () => {
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
      expect(result).toMatchObject({ ok: true, reviewStatus: "taken_down", number: 131 });
      const idea = await tx.idea.findUniqueOrThrow({ where: { id: ideas.lateNightDining.id } });
      expect(idea).toMatchObject({
        reviewStatus: "taken_down",
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

  it("a taken-down idea cannot be resubmitted, withdrawn, taken down again, or sent back (#286)", async () => {
    await withSeed(async (tx) => {
      const reason = "The details were not accurate, so the board could not judge the idea.";
      await decidePost(
        prismaReviewStore(tx),
        dabChair,
        "take_down",
        { ideaId: ideas.lateNightDining.id, reason },
        NOW,
      );
      const reviews = await tx.review.count({ where: { ideaId: ideas.lateNightDining.id } });
      const author: Session = {
        user: {
          id: users.anonymousAuthor.id,
          email: users.anonymousAuthor.email,
          name: users.anonymousAuthor.displayName,
        },
        positions: [],
        roles: rolesFromPositions([]),
      };
      const own = prismaOwnPostStore(tx);
      expect(await withdrawPost(own, author, { ideaId: ideas.lateNightDining.id })).toMatchObject({
        ok: false,
        error: { code: "invalid_transition" },
      });
      for (const type of ["take_down", "send_back"] as const) {
        expect(
          await decidePost(
            prismaReviewStore(tx),
            dabChair,
            type,
            { ideaId: ideas.lateNightDining.id, reason },
            NOW,
          ),
        ).toMatchObject({ ok: false, error: { code: "invalid_transition" } });
      }
      expect(await tx.review.count({ where: { ideaId: ideas.lateNightDining.id } })).toBe(reviews);
      expect(await tx.idea.findUniqueOrThrow({ where: { id: ideas.lateNightDining.id } })).toMatchObject({
        reviewStatus: "taken_down",
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

// A duplicate decision is caught by the unique backstop after the idea was updated, so
// it needs a real transaction that aborts and rolls back (#257), and its rows commit.
describeWithDatabase("a duplicate decision rolls the whole transaction back (#257)", () => {
  it("leaves the idea pending, with one review row and no decision email", async () => {
    const author = buildUser({ id: testUuid(9301), email: "rollback.author@example.com" });
    const idea = buildIdea({ id: testUuid(9340), authorId: author.id });
    const revision = buildRevision(idea, { id: testUuid(9341) });
    await withCommittedRows({ users: [author], ideas: [idea] }, async (client) => {
      await client.ideaRevision.create({ data: revision });
      // An earlier decision already sits on this revision, though the idea is still pending.
      await client.review.create({
        data: buildReview({
          id: testUuid(9342),
          ideaId: idea.id,
          revisionId: revision.id,
          decision: "declined",
          reason: "An earlier decision on the same version.",
        }),
      });

      await expect(
        client.$transaction(
          (tx) => decidePost(prismaReviewStore(tx), dabChair, "approve", { ideaId: idea.id }, NOW),
          { timeout: 30_000, maxWait: 30_000 },
        ),
      ).rejects.toBeInstanceOf(AlreadyDecidedError);

      expect(await client.idea.findUniqueOrThrow({ where: { id: idea.id } })).toMatchObject({
        reviewStatus: "pending",
        number: null,
        status: null,
        approvedAt: null,
      });
      expect(await client.review.count({ where: { ideaId: idea.id } })).toBe(1);
      expect(await client.emailOutbox.count({ where: { type: "post_decided" } })).toBe(0);
    });
  });
});

describeWithDatabase("emails about your own post (#211): review decisions", () => {
  const declineReason = "Already planned with Dining Services for the spring term.";

  it("approving queues one post_decided row for the author, at priority 1, due at the decision", async () => {
    await withSeed(async (tx) => {
      await decidePost(prismaReviewStore(tx), dabChair, "approve", { ideaId: ideas.pending.id }, NOW);
      const rows = await tx.emailOutbox.findMany({ where: { type: "post_decided" } });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ userId: users.student.id, priority: 1, sentAt: null });
      expect(rows[0]?.sendAfter).toEqual(NOW);
      expect(rows[0]?.payload).toMatchObject({
        ideaId: ideas.pending.id,
        ideaNumber: 157,
        event: { kind: "approved" },
      });
    });
  });

  it("declining queues one row for the author with the reason", async () => {
    await withSeed(async (tx) => {
      await decidePost(
        prismaReviewStore(tx),
        dabChair,
        "decline",
        { ideaId: ideas.pending.id, reason: declineReason },
        NOW,
      );
      const rows = await tx.emailOutbox.findMany({ where: { type: "post_decided" } });
      expect(rows).toHaveLength(1);
      expect(rows[0]?.userId).toBe(users.student.id);
      expect(rows[0]?.payload).toMatchObject({ event: { kind: "declined", reason: declineReason } });
    });
  });

  it("sending back queues one row for the author only, with no reviewer or email in the payload (#286)", async () => {
    await withSeed(async (tx) => {
      const reason = "Add the cost and the place, then send it again for review.";
      await decidePost(
        prismaReviewStore(tx),
        dabChair,
        "send_back",
        { ideaId: ideas.lateNightDining.id, reason },
        NOW,
      );
      const rows = await tx.emailOutbox.findMany({ where: { type: "post_decided" } });
      expect(rows).toHaveLength(1);
      expect(rows[0]?.userId).toBe(users.anonymousAuthor.id);
      expect(rows[0]?.payload).toMatchObject({
        isAnonymous: true,
        ideaNumber: 131,
        event: { kind: "sent_back", reason },
      });
      const text = JSON.stringify(rows[0]?.payload);
      expect(text).not.toContain(dabChair.user.id);
      expect(text).not.toContain(dabChair.user.email);
    });
  });

  it("taking down queues one row for the author, even when the post is anonymous", async () => {
    await withSeed(async (tx) => {
      await decidePost(
        prismaReviewStore(tx),
        dabChair,
        "take_down",
        { ideaId: ideas.lateNightDining.id, reason: declineReason },
        NOW,
      );
      const rows = await tx.emailOutbox.findMany({ where: { type: "post_decided" } });
      expect(rows).toHaveLength(1);
      expect(rows[0]?.userId).toBe(users.anonymousAuthor.id);
      expect(rows[0]?.payload).toMatchObject({
        isAnonymous: true,
        ideaNumber: 131,
        event: { kind: "taken_down", reason: declineReason },
      });
    });
  });

  it("a second decision on the same post adds no second row", async () => {
    await withSeed(async (tx) => {
      const store = prismaReviewStore(tx);
      await decidePost(store, dabChair, "approve", { ideaId: ideas.pending.id }, NOW);
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
      expect(await tx.emailOutbox.count({ where: { type: "post_decided" } })).toBe(1);
    });
  });

  it("queues nothing when the author turned decision emails off", async () => {
    await withSeed(async (tx) => {
      await tx.emailOptOut.create({ data: { userId: users.student.id, type: "post_decided" } });
      const result = await decidePost(
        prismaReviewStore(tx),
        dabChair,
        "approve",
        { ideaId: ideas.pending.id },
        NOW,
      );
      expect(result.ok).toBe(true);
      expect(await tx.emailOutbox.count({ where: { type: "post_decided" } })).toBe(0);
    });
  });
});
