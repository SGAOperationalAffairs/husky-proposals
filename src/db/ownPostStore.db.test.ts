import { expect, it } from "vitest";
import type { Session } from "@/auth/contract";
import { resubmitPost, withdrawPost } from "@/app/_post/ownPost";
import { rolesFromPositions, VP_CAMPUS_AFFAIRS } from "@/core/positions";
import { describeWithDatabase } from "@/db/testing/database";
import { ideas, users } from "@/db/testing/fixtures";
import { withSeed } from "@/db/testing/seededTransaction";
import { prismaBoardSettingsStore } from "./boardSettingsStore";
import { prismaOwnPostStore } from "./ownPostStore";
import { reviewQueue } from "./reviewQueue";

// The author's resubmit and withdraw against Postgres (#56), inside the seed's
// rolled-back transaction.
const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date();
const sessionFor = (user: { id: string; email: string; displayName: string }): Session => ({
  user: { id: user.id, email: user.email, name: user.displayName },
  positions: [],
  roles: rolesFromPositions([]),
});
const priya = sessionFor(users.secondStudent);
const maya = sessionFor(users.student);
const vp = { user: { id: users.vp.id }, roles: rolesFromPositions([VP_CAMPUS_AFFAIRS]) };

const edit = {
  ideaId: ideas.declined.id,
  title: "Free parking after 6 pm",
  summary: "Open the campus lots to students at no cost in the evening.",
  category: "campus_planning",
};

describeWithDatabase("resubmit and withdraw (#56)", () => {
  it("resubmitting the declined post writes revision 2 and puts it back in the queue, due by its board's setting", async () => {
    await withSeed(async (tx) => {
      // Set CPAB to 5 so the test shows the due date is not a fixed 3 days.
      await prismaBoardSettingsStore(tx).setReviewDueDays("CPAB", 5);
      const result = await resubmitPost(prismaOwnPostStore(tx), priya, edit, NOW);
      expect(result).toEqual({ ok: true, id: ideas.declined.id, version: 2 });

      const idea = await tx.idea.findUniqueOrThrow({ where: { id: ideas.declined.id } });
      expect(idea).toMatchObject({ reviewStatus: "pending", title: edit.title, boardId: "CPAB" });
      expect(idea.submittedAt).toEqual(NOW);
      const revisions = await tx.ideaRevision.findMany({
        where: { ideaId: ideas.declined.id },
        orderBy: { version: "asc" },
      });
      expect(revisions.map((r) => r.version)).toEqual([1, 2]);
      expect(revisions[1]).toMatchObject({ title: edit.title, submittedAt: NOW });

      const item = (await reviewQueue(tx, vp)).find((i) => i.idea.id === ideas.declined.id);
      expect(item?.dueAt.getTime()).toBe(NOW.getTime() + 5 * DAY);
    });
  });

  it("a second resubmit on the now-pending post writes no revision 3", async () => {
    await withSeed(async (tx) => {
      const store = prismaOwnPostStore(tx);
      expect((await resubmitPost(store, priya, edit, NOW)).ok).toBe(true);
      // The rules refuse it from pending; the store refuses it too, if the rules were stale.
      expect(await resubmitPost(store, priya, edit, NOW)).toMatchObject({
        ok: false,
        error: { code: "invalid_transition" },
      });
      const stale = await store.resubmit({
        ideaId: ideas.declined.id,
        from: "declined",
        patch: {
          title: "x",
          description: "x",
          fullText: null,
          category: "campus_planning",
          location: null,
          scale: null,
          costBand: null,
          timeHorizon: null,
          isAnonymous: false,
          boardId: "CPAB",
          reviewStatus: "pending",
          submittedAt: NOW,
        },
        revision: {
          version: 3,
          title: "x",
          description: "x",
          fullText: null,
          category: "campus_planning",
          location: null,
          scale: null,
          costBand: null,
          timeHorizon: null,
          isAnonymous: false,
          submittedAt: NOW,
        },
      });
      expect(stale).toBe(false);
      expect(await tx.ideaRevision.count({ where: { ideaId: ideas.declined.id } })).toBe(2);
    });
  });

  it("withdrawing the seed's pending post drops it from the queue and from the author's pending count", async () => {
    await withSeed(async (tx) => {
      const store = prismaOwnPostStore(tx);
      expect(await store.countPending(users.student.id)).toBe(1);
      expect((await reviewQueue(tx, vp)).map((i) => i.idea.id)).toContain(ideas.pending.id);

      expect(await withdrawPost(store, maya, { ideaId: ideas.pending.id })).toEqual({
        ok: true,
        id: ideas.pending.id,
      });
      expect(await store.countPending(users.student.id)).toBe(0);
      expect((await reviewQueue(tx, vp)).map((i) => i.idea.id)).not.toContain(ideas.pending.id);
      const idea = await tx.idea.findUniqueOrThrow({ where: { id: ideas.pending.id } });
      expect(idea.reviewStatus).toBe("withdrawn");
      expect(await tx.review.count({ where: { ideaId: ideas.pending.id } })).toBe(0);
    });
  });

  it("a stranger cannot resubmit or withdraw, and an approved post is refused", async () => {
    await withSeed(async (tx) => {
      const store = prismaOwnPostStore(tx);
      expect(await withdrawPost(store, priya, { ideaId: ideas.pending.id })).toEqual({
        ok: false,
        error: { code: "not_found" },
      });
      expect(await resubmitPost(store, maya, edit, NOW)).toEqual({ ok: false, error: { code: "not_found" } });
      expect(await resubmitPost(store, priya, { ...edit, ideaId: ideas.printCredits.id }, NOW)).toEqual({
        ok: false,
        error: { code: "not_editable" },
      });
    });
  });
});
