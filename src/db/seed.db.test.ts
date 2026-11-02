import { expect, it } from "vitest";
import { describeWithDatabase, getTestClient, withRollback } from "@/db/testing/database";
import { seed } from "./seed";

// Running the seed twice adds nothing (#44): createMany with skipDuplicates, so a
// rerun is a no-op. Counts are compared before and after the second run.
describeWithDatabase("seed (#44)", () => {
  it("a second run adds no rows", async () => {
    await withRollback(async (tx) => {
      await seed(tx, { now: new Date() });
      const count = () =>
        Promise.all([
          tx.idea.count(),
          tx.ideaRevision.count(),
          tx.review.count(),
          tx.support.count(),
          tx.update.count(),
        ]);
      const before = await count();
      await seed(tx, { now: new Date() });
      expect(await count()).toEqual(before);
      expect(before[0]).toBeGreaterThan(0);
    });
  });

  it("writes to the branch only inside its transaction", async () => {
    const outside = await getTestClient().idea.count();
    await withRollback(async (tx) => {
      await seed(tx, { now: new Date() });
    });
    expect(await getTestClient().idea.count()).toBe(outside);
  });
});
