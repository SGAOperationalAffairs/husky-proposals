import { expect, it } from "vitest";
import { describeWithDatabase, withRollback } from "@/db/testing/database";
import { buildApprovedIdea, buildRevision, buildReview, testUuid } from "@/db/testing/factories";
import { withSeed } from "@/db/testing/seededTransaction";

// Each check constraint (#44) rejects a bad row and accepts a good one. A failed
// statement aborts its transaction, so each case runs in its own rolled-back one.
describeWithDatabase("check constraints (#44)", () => {
  it("ideas_status_only_when_approved: a pending post cannot have a status", async () => {
    await expect(
      withSeed((tx) =>
        tx.idea.create({
          data: {
            id: testUuid(9001),
            title: "x",
            description: "x",
            category: "dining",
            boardId: "DAB",
            reviewStatus: "pending",
            status: "in_progress",
            updatedAt: new Date(),
          },
        }),
      ),
    ).rejects.toThrow(/ideas_status_only_when_approved/);
  });

  it("ideas_waiting_needs_reason: waiting needs a reason with some text in it", async () => {
    await expect(
      withSeed((tx) =>
        tx.idea.create({
          data: {
            ...buildApprovedIdea({ id: testUuid(9002), status: "waiting", waitingReason: "   " }),
            updatedAt: new Date(),
          },
        }),
      ),
    ).rejects.toThrow(/ideas_waiting_needs_reason/);
  });

  it("ideas_waiting_needs_reason: a waiting idea with a reason is accepted", async () => {
    await withSeed(async (tx) => {
      const idea = await tx.idea.create({
        data: {
          ...buildApprovedIdea({
            id: testUuid(9003),
            status: "waiting",
            waitingReason: "Waiting on the survey.",
          }),
          updatedAt: new Date(),
        },
      });
      expect(idea.status).toBe("waiting");
    });
  });

  it("reviews_take_down_is_decline: a take-down must be a decline", async () => {
    await expect(
      withSeed(async (tx) => {
        const idea = buildApprovedIdea({ id: testUuid(9004) });
        await tx.idea.create({ data: { ...idea, updatedAt: new Date() } });
        const revision = buildRevision(idea);
        await tx.ideaRevision.create({ data: revision });
        await tx.review.create({
          data: buildReview({
            ideaId: idea.id,
            revisionId: revision.id,
            decision: "approved",
            kind: "take_down",
          }),
        });
      }),
    ).rejects.toThrow(/reviews_take_down_is_decline/);
  });

  it("reviews_decline_needs_reason: a decline without text is refused", async () => {
    await expect(
      withSeed(async (tx) => {
        const idea = buildApprovedIdea({ id: testUuid(9005) });
        await tx.idea.create({ data: { ...idea, updatedAt: new Date() } });
        const revision = buildRevision(idea);
        await tx.ideaRevision.create({ data: revision });
        await tx.review.create({
          data: buildReview({ ideaId: idea.id, revisionId: revision.id, decision: "declined", reason: "  " }),
        });
      }),
    ).rejects.toThrow(/reviews_decline_needs_reason/);
  });

  it("boards_review_due_days_range: 0 and 15 days are refused, 1 and 14 are accepted", async () => {
    for (const days of [0, 15]) {
      await expect(
        withSeed((tx) => tx.board.update({ where: { id: "DAB" }, data: { reviewDueDays: days } })),
      ).rejects.toThrow(/boards_review_due_days_range/);
    }
    for (const days of [1, 14]) {
      await withSeed(async (tx) => {
        const board = await tx.board.update({ where: { id: "DAB" }, data: { reviewDueDays: days } });
        expect(board.reviewDueDays).toBe(days);
      });
    }
  });

  it("the rolled-back transaction leaves nothing behind", async () => {
    await withRollback(async (tx) => {
      await tx.user.count();
    });
    // Reading after a rollback: the seeded rows are not on the branch.
    await withRollback(async (tx) => {
      expect(await tx.idea.count({ where: { id: testUuid(9001) } })).toBe(0);
    });
  });
});
