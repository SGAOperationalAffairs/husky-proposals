import { expect, it } from "vitest";
import type { Prisma } from "@/generated/prisma/client";
import { describeWithDatabase } from "@/db/testing/database";
import { withCountedSeed } from "@/db/testing/countQueries";
import { buildApprovedIdea, buildFollow, buildUser, buildUpdate, testUuid } from "@/db/testing/factories";
import { ideas, updates } from "@/db/testing/fixtures";
import { withSeed } from "@/db/testing/seededTransaction";
import { listUpdatableIdeas } from "./updatesList";

// The Updates tab's read against Postgres (#130), inside the seed's rolled-back transaction.
// foodPantry (DAB, #103) is the seed's one in-progress idea.

async function addInProgress(tx: Prisma.TransactionClient, n: number, boardId: string) {
  const idea = buildApprovedIdea({
    id: testUuid(9300 + n),
    number: 900 + n,
    boardId,
    status: "in_progress",
    statusChangedAt: new Date(),
  });
  await tx.idea.create({ data: idea });
  return idea;
}

describeWithDatabase("the updatable ideas list (#130)", () => {
  it("reads only in-progress ideas on the given boards, with the update fields and the view's numbers", async () => {
    await withSeed(async (tx) => {
      const cpab = await addInProgress(tx, 1, "CPAB");
      const dab = await listUpdatableIdeas(tx, ["DAB"]);
      expect(dab.map((i) => i.id)).toEqual([ideas.foodPantry.id]);

      const idea = dab[0]!;
      expect(idea).toMatchObject({
        number: 103,
        title: "A student-hosted food pantry",
        boardId: "DAB",
        cadenceDays: 30,
        supportCount: 2,
        isStale: false,
      });
      expect(idea.followerCount).toBeGreaterThanOrEqual(0);
      expect(typeof idea.statusChangedAt).toBe("string");
      expect(typeof idea.lastUpdateAt).toBe("string");
      // Newest first: the board update (2 days ago), then the check-in (9 days ago).
      expect(idea.updates.map((u) => u.id)).toEqual([updates.boardUpdate.id, updates.checkIn.id]);
      expect(idea.updates[0]).toEqual({
        id: updates.boardUpdate.id,
        kind: "board",
        body: "Began drafting the pilot plan with the host office.",
        createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      });

      const both = await listUpdatableIdeas(tx, ["DAB", "CPAB"]);
      expect(both.map((i) => i.id).sort()).toEqual([ideas.foodPantry.id, cpab.id].sort());
    });
  });

  it("leaves out ideas that are not in progress or not public", async () => {
    await withSeed(async (tx) => {
      // The seed's SC idea is on hold, its GIB idea is delivered, and the pending post is not public.
      const rows = await listUpdatableIdeas(tx, ["DAB", "CPAB", "CSC", "GIB", "SC"]);
      expect(rows.map((i) => i.id)).toEqual([ideas.foodPantry.id]);
    });
  });

  it("an update carries no author field", async () => {
    await withSeed(async (tx) => {
      const [idea] = await listUpdatableIdeas(tx, ["DAB"]);
      for (const update of idea!.updates) expect(update).not.toHaveProperty("authorId");
      expect(idea).not.toHaveProperty("authorId");
    });
  });

  it("an empty board list runs no query", async () => {
    await withCountedSeed(async (tx, queries) => {
      queries.reset();
      expect(await listUpdatableIdeas(tx, [])).toEqual([]);
      expect(queries.count).toBe(0);
    });
  });

  it("the stale flag follows the view: no counting update for the cadence makes it true", async () => {
    await withSeed(async (tx) => {
      await tx.update.deleteMany({ where: { ideaId: ideas.foodPantry.id } });
      await tx.idea.update({
        where: { id: ideas.foodPantry.id },
        data: { statusChangedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) },
      });
      const [idea] = await listUpdatableIdeas(tx, ["DAB"]);
      expect(idea).toMatchObject({ isStale: true, lastUpdateAt: null, updates: [] });
    });
  });

  it("sends a fixed number of queries however many ideas and updates there are", async () => {
    await withCountedSeed(async (tx, queries) => {
      queries.reset();
      await listUpdatableIdeas(tx, ["DAB", "CPAB"]);
      const few = queries.count;

      for (let n = 10; n < 30; n += 1) {
        const idea = await addInProgress(tx, n, n % 2 === 0 ? "DAB" : "CPAB");
        await tx.update.create({ data: buildUpdate({ ideaId: idea.id }) });
        const follower = buildUser();
        await tx.user.create({ data: follower });
        await tx.follow.create({ data: buildFollow({ userId: follower.id, ideaId: idea.id }) });
      }
      queries.reset();
      const rows = await listUpdatableIdeas(tx, ["DAB", "CPAB"]);
      expect(rows.length).toBeGreaterThan(20);
      expect(queries.count).toBe(few);
    });
  });
});
