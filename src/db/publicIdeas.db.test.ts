import { expect, it } from "vitest";
import { publicIdeaQueries } from "@/db/publicIdeas";
import { withCountedSeed } from "@/db/testing/countQueries";
import { describeWithDatabase } from "@/db/testing/database";
import { buildApprovedIdea, testUuid } from "@/db/testing/factories";
import { ideas, users } from "@/db/testing/fixtures";
import { withSeed } from "@/db/testing/seededTransaction";

// The public reads behind the ideas wall and the idea page (#60), over the seeded data,
// inside transactions that are rolled back.
describeWithDatabase("public ideas (#60)", () => {
  it("lists the 6 seeded public ideas and never a pending or declined post", async () => {
    await withSeed(async (tx) => {
      const records = await publicIdeaQueries(tx).list();
      const titles = records.map((r) => r.idea.title);
      expect(records).toHaveLength(6);
      expect(titles).not.toContain(ideas.pending.title);
      expect(titles).not.toContain(ideas.declined.title);
      expect(records.map((r) => r.idea.number)).toEqual([103, 118, 131, 140, 151, 156]);
    });
  });

  it("carries no email, author id, or anonymous author's name, and keeps the other names", async () => {
    await withSeed(async (tx) => {
      const queries = publicIdeaQueries(tx);
      const everything = JSON.stringify([await queries.list(), await queries.byNumber(103)]);
      for (const user of Object.values(users)) {
        expect(everything).not.toContain(user.email);
        expect(everything).not.toContain(user.id);
      }
      expect(everything).not.toContain(users.anonymousAuthor.displayName);

      const records = await queries.list();
      const byNumber = (n: number) => records.find((r) => r.idea.number === n)!;
      expect(byNumber(131).idea.authorName).toBeNull();
      expect(byNumber(103).idea.authorName).toBe("Maya Test");
    });
  });

  it("reads supports, willing people, and rank from the idea_stats view", async () => {
    await withSeed(async (tx) => {
      const records = await publicIdeaQueries(tx).list();
      const stats = (n: number) => records.find((r) => r.idea.number === n)!.stats;
      expect(stats(103)).toMatchObject({ supportCount: 2, willingCount: 1, rankInBoard: 1 });
      expect(stats(118).rankInBoard).toBeNull();
    });
  });

  it("finds an idea by number with its updates, newest first, and its rank among the board's ideas", async () => {
    await withSeed(async (tx) => {
      const record = await publicIdeaQueries(tx).byNumber(103);
      expect(record?.idea.title).toBe(ideas.foodPantry.title);
      expect(record?.updates?.map((u) => u.body)).toEqual([
        "Began drafting the pilot plan with the host office.",
        "Still working, no news.",
      ]);
      expect(record?.stats.rankInBoard).toBe(1);
      expect(record?.rankOf).toBe(2);
    });
  });

  it("has no number for a pending post, and finds nothing for an unknown number", async () => {
    await withSeed(async (tx) => {
      const queries = publicIdeaQueries(tx);
      expect(ideas.pending.number ?? null).toBeNull();
      expect(await queries.byNumber(9999)).toBeNull();
    });
  });

  it("gives a waiting idea its reason", async () => {
    await withSeed(async (tx) => {
      const record = await publicIdeaQueries(tx).byNumber(140);
      expect(record?.idea.status).toBe("waiting");
      expect(record?.idea.waitingReason).toBe(ideas.refillStations.waitingReason);
    });
  });

  it("sends the same few queries however many ideas there are, not one per idea", async () => {
    await withCountedSeed(async (tx, queries) => {
      const reads = publicIdeaQueries(tx);
      await reads.list();
      const before = queries.count;
      expect(before).toBeLessThanOrEqual(3);

      const more = [1, 2, 3, 4, 5].map((n) =>
        buildApprovedIdea({
          id: testUuid(9200 + n),
          number: 9000 + n,
          boardId: "DAB",
          authorId: users.student.id,
        }),
      );
      await tx.idea.createMany({ data: more });
      queries.reset();
      const records = await reads.list();
      expect(records).toHaveLength(11);
      expect(queries.count).toBe(before);

      queries.reset();
      await reads.byNumber(103);
      expect(queries.count).toBeLessThanOrEqual(4);
    });
  });
});
