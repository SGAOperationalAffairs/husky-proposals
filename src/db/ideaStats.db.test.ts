import { expect, it } from "vitest";
import { describeWithDatabase } from "@/db/testing/database";
import { buildApprovedIdea, buildUpdate, testUuid } from "@/db/testing/factories";
import { ideas, users } from "@/db/testing/fixtures";
import { withSeed } from "@/db/testing/seededTransaction";

// The idea_stats acceptance test (#44). Reads the view through Prisma, over the seeded
// data, inside a transaction that is rolled back. Margins are days, not seconds, since
// the view uses the database's now().
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY);

describeWithDatabase("idea_stats (#44)", () => {
  it("counts supports, willing people, and followers for seeded approved ideas", async () => {
    await withSeed(async (tx) => {
      const rows = await tx.ideaStats.findMany();
      const row = (id: string) => rows.find((r) => r.ideaId === id)!;
      expect(row(ideas.foodPantry.id)).toMatchObject({ supportCount: 2, willingCount: 1, followerCount: 0 });
      expect(row(ideas.walkSignal.id)).toMatchObject({ supportCount: 1 });
      expect(row(ideas.lateNightDining.id)).toMatchObject({ supportCount: 0, followerCount: 1 });
    });
  });

  it("has no row for a pending, declined, or withdrawn post", async () => {
    await withSeed(async (tx) => {
      const ids = (await tx.ideaStats.findMany()).map((r) => r.ideaId);
      expect(ids).not.toContain(ideas.pending.id);
      expect(ids).not.toContain(ideas.declined.id);
    });
  });

  it("ranks by supports within a board, and a delivered idea has no rank", async () => {
    await withSeed(async (tx) => {
      const rows = await tx.ideaStats.findMany();
      const rank = (id: string) => rows.find((r) => r.ideaId === id)!.rankInBoard;
      expect(rank(ideas.foodPantry.id)).toBe(1);
      expect(rank(ideas.lateNightDining.id)).toBe(2);
      expect(rank(ideas.compostBins.id)).toBeNull();
    });
  });

  it("flags an in-progress idea past its board's cadence, and not before", async () => {
    await withSeed(async (tx) => {
      const stale = async () =>
        (await tx.ideaStats.findUnique({ where: { ideaId: ideas.foodPantry.id } }))!.isStale;
      // Board update two days ago, status changed 14 days ago; DAB's default cadence is 30 days.
      expect(await stale()).toBe(false);
      await tx.board.update({ where: { id: "DAB" }, data: { updateCadenceDays: 1 } });
      expect(await stale()).toBe(true);
    });
  });

  it("never flags an idea that is not in progress", async () => {
    await withSeed(async (tx) => {
      await tx.board.update({ where: { id: "SC" }, data: { updateCadenceDays: 1 } });
      const waiting = await tx.ideaStats.findUnique({ where: { ideaId: ideas.refillStations.id } });
      expect(waiting?.isStale).toBe(false);
    });
  });

  it("a system update does not reset the clock: only board and check-in updates count", async () => {
    await withSeed(async (tx) => {
      const idea = buildApprovedIdea({
        id: testUuid(9100),
        boardId: "CSC",
        status: "in_progress",
        statusChangedAt: daysAgo(40),
        approvedAt: daysAgo(60),
        authorId: users.student.id,
      });
      await tx.idea.create({ data: { ...idea, updatedAt: new Date() } });
      await tx.update.create({
        data: buildUpdate({
          ideaId: idea.id,
          kind: "system",
          body: "Moved to Campus Services.",
          createdAt: daysAgo(1),
        }),
      });
      const row = await tx.ideaStats.findUnique({ where: { ideaId: idea.id } });
      expect(row?.isStale).toBe(true);
    });
  });

  it("is never null for stale, even for an in-progress idea with no activity at all", async () => {
    await withSeed(async (tx) => {
      const idea = buildApprovedIdea({
        id: testUuid(9101),
        boardId: "GIB",
        status: "in_progress",
        statusChangedAt: null,
      });
      await tx.idea.create({ data: { ...idea, statusChangedAt: null, updatedAt: new Date() } });
      const row = await tx.ideaStats.findUnique({ where: { ideaId: idea.id } });
      expect(row?.isStale).toBe(true);
    });
  });
});
