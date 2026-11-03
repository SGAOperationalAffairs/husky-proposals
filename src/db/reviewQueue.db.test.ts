import { expect, it } from "vitest";
import { BOARD_POSITIONS, VP_CAMPUS_AFFAIRS, rolesFromPositions } from "@/core/positions";
import type { Viewer } from "@/core/permissions";
import { describeWithDatabase } from "@/db/testing/database";
import { buildIdea, buildRevision, testUuid } from "@/db/testing/factories";
import { ideas, users } from "@/db/testing/fixtures";
import { withSeed } from "@/db/testing/seededTransaction";
import type { Prisma } from "@/generated/prisma/client";
import { prismaBoardSettingsStore } from "./boardSettingsStore";
import { reviewQueue, reviewQueueCount } from "./reviewQueue";

// The review queue against Postgres (#58), inside the seed's rolled-back transaction.
const DAY = 24 * 60 * 60 * 1000;
const viewerFor = (id: string, positions: string[]): Viewer => ({
  user: { id },
  roles: rolesFromPositions(positions),
});
const dabChair = viewerFor(users.dabChair.id, [BOARD_POSITIONS.DAB.lead]);
const vp = viewerFor(users.vp.id, [VP_CAMPUS_AFFAIRS]);
const student = viewerFor(users.secondStudent.id, []);

// A pending post on a board, submitted at a known time.
async function addPending(
  tx: Prisma.TransactionClient,
  n: number,
  overrides: Parameters<typeof buildIdea>[0],
) {
  const idea = buildIdea({ id: testUuid(9100 + n), authorId: users.secondStudent.id, ...overrides });
  await tx.idea.create({ data: idea });
  await tx.ideaRevision.create({ data: buildRevision(idea) });
  return idea;
}

describeWithDatabase("the review queue (#58)", () => {
  it("the DAB chair sees only DAB pending posts, oldest first, due 3 days after they were submitted", async () => {
    await withSeed(async (tx) => {
      // The seed moves its dates to "now", so the seeded pending post was submitted just now.
      const older = await addPending(tx, 1, { boardId: "DAB", submittedAt: new Date(Date.now() - DAY) });
      await addPending(tx, 2, { boardId: "CPAB" });
      const queue = await reviewQueue(tx, dabChair);
      expect(queue.map((item) => item.idea.id)).toEqual([older.id, ideas.pending.id]);
      for (const item of queue) {
        expect(item.dueAt.getTime() - item.idea.submittedAt.getTime()).toBe(3 * DAY);
      }
    });
  });

  it("uses each board's own setting in one read", async () => {
    await withSeed(async (tx) => {
      await addPending(tx, 3, { boardId: "CPAB" });
      await prismaBoardSettingsStore(tx).setReviewDueDays("DAB", 7);
      const queue = await reviewQueue(tx, vp);
      const days = Object.fromEntries(
        queue.map((item) => [
          item.idea.boardId,
          (item.dueAt.getTime() - item.idea.submittedAt.getTime()) / DAY,
        ]),
      );
      expect(days).toMatchObject({ DAB: 7, CPAB: 3 });
    });
  });

  it("the VP sees every board's pending posts", async () => {
    await withSeed(async (tx) => {
      await addPending(tx, 4, { boardId: "CPAB" });
      await addPending(tx, 5, { boardId: "SC" });
      const boards = (await reviewQueue(tx, vp)).map((item) => item.idea.boardId).sort();
      expect(boards).toEqual(["CPAB", "DAB", "SC"]);
    });
  });

  it("a student gets an empty queue and a count of 0", async () => {
    await withSeed(async (tx) => {
      expect(await reviewQueue(tx, student)).toEqual([]);
      expect(await reviewQueueCount(tx, student)).toBe(0);
      expect(await reviewQueue(tx, null)).toEqual([]);
    });
  });

  it("the count matches the list", async () => {
    await withSeed(async (tx) => {
      await addPending(tx, 6, { boardId: "DAB" });
      await addPending(tx, 7, { boardId: "CPAB" });
      expect(await reviewQueueCount(tx, dabChair)).toBe((await reviewQueue(tx, dabChair)).length);
      expect(await reviewQueueCount(tx, vp)).toBe((await reviewQueue(tx, vp)).length);
    });
  });

  it("an anonymous DAB pending post shows its author to the DAB chair and the VP", async () => {
    await withSeed(async (tx) => {
      const anonymous = await addPending(tx, 8, { boardId: "DAB", isAnonymous: true });
      for (const viewer of [dabChair, vp]) {
        const item = (await reviewQueue(tx, viewer)).find((i) => i.idea.id === anonymous.id);
        expect(item?.idea.author?.id).toBe(users.secondStudent.id);
        expect(item?.idea.authorHidden).toBe(false);
      }
    });
  });

  it("declined and withdrawn posts never appear", async () => {
    await withSeed(async (tx) => {
      const withdrawn = await addPending(tx, 9, { boardId: "DAB", reviewStatus: "withdrawn" });
      const ids = (await reviewQueue(tx, vp)).map((item) => item.idea.id);
      expect(ids).not.toContain(ideas.declined.id);
      expect(ids).not.toContain(withdrawn.id);
    });
  });
});
