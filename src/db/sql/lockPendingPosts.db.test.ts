import { expect, it } from "vitest";
import { describeWithDatabase, getTestClient, withRollback } from "@/db/testing/database";
import { lockPendingPosts, PENDING_POSTS_LOCK } from "./lockPendingPosts";

const MAYA = "00000000-0000-4000-8000-0000000000a1";
const PRIYA = "00000000-0000-4000-8000-0000000000a2";

function tryLock(authorId: string) {
  return getTestClient().$queryRaw<
    { taken: boolean }[]
  >`select pg_try_advisory_xact_lock(${PENDING_POSTS_LOCK}::int, hashtext(${authorId}::text)) as taken`;
}

describeWithDatabase("lockPendingPosts (#257)", () => {
  it("holds the lock for that author: a second connection cannot take it", async () => {
    await withRollback(async (tx) => {
      await lockPendingPosts(tx, MAYA);
      expect((await tryLock(MAYA))[0]?.taken).toBe(false);
    });
  });

  it("leaves other authors free", async () => {
    await withRollback(async (tx) => {
      await lockPendingPosts(tx, MAYA);
      expect((await tryLock(PRIYA))[0]?.taken).toBe(true);
    });
  });

  it("is free again once the transaction has ended", async () => {
    await withRollback((tx) => lockPendingPosts(tx, MAYA));
    expect((await tryLock(MAYA))[0]?.taken).toBe(true);
  });
});
