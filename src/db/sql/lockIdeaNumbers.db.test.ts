import { expect, it } from "vitest";
import { describeWithDatabase, getTestClient, withRollback } from "@/db/testing/database";
import { IDEA_NUMBER_LOCK, lockIdeaNumbers } from "./lockIdeaNumbers";

describeWithDatabase("lockIdeaNumbers (#58)", () => {
  it("holds the lock for the transaction: a second connection cannot take it", async () => {
    await withRollback(async (tx) => {
      await lockIdeaNumbers(tx);
      // Another pooled connection to the same database, outside this transaction.
      const rows = await getTestClient().$queryRaw<
        { taken: boolean }[]
      >`select pg_try_advisory_xact_lock(${IDEA_NUMBER_LOCK}::bigint) as taken`;
      expect(rows[0]?.taken).toBe(false);
    });
  });

  it("is free again once the transaction has ended", async () => {
    await withRollback((tx) => lockIdeaNumbers(tx));
    const rows = await getTestClient().$transaction(
      (tx) =>
        tx.$queryRaw<
          { taken: boolean }[]
        >`select pg_try_advisory_xact_lock(${IDEA_NUMBER_LOCK}::bigint) as taken`,
    );
    expect(rows[0]?.taken).toBe(true);
  });
});
