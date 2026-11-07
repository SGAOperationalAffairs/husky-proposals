import { beforeEach, expect, it } from "vitest";
import { describeWithDatabase, withRollback } from "@/db/testing/database";
import { buildOutboxRow, buildUser, FIXTURE_TIME, resetFactories } from "@/db/testing/factories";
import { claimOutboxBatch, MAX_ATTEMPTS } from "./claimOutboxBatch";

const MINUTE = 60 * 1000;
const TYPES = ["idea_event"] as const;
const NOW = new Date(FIXTURE_TIME.getTime() + 60 * MINUTE);
const at = (minutes: number) => new Date(FIXTURE_TIME.getTime() + minutes * MINUTE);

describeWithDatabase("claimOutboxBatch (#101)", () => {
  beforeEach(resetFactories);

  async function setup(tx: Parameters<Parameters<typeof withRollback>[0]>[0]) {
    const user = buildUser();
    await tx.user.create({ data: user });
    return user;
  }

  it("claims by priority, then oldest first, and stamps the claim", async () => {
    await withRollback(async (tx) => {
      const user = await setup(tx);
      const late = buildOutboxRow({ userId: user.id, priority: 3, createdAt: at(5) });
      const early = buildOutboxRow({ userId: user.id, priority: 3, createdAt: at(1) });
      const urgent = buildOutboxRow({ userId: user.id, priority: 1, createdAt: at(9) });
      await tx.emailOutbox.createMany({ data: [late, early, urgent] });

      const claimed = await claimOutboxBatch(tx, { now: NOW, limit: 10, lockFor: 10 * MINUTE, types: TYPES });
      expect(claimed.map((r) => r.id)).toEqual([urgent.id, early.id, late.id]);
      expect(claimed.every((r) => r.attempts === 1 && r.type === "idea_event")).toBe(true);

      const row = await tx.emailOutbox.findUniqueOrThrow({ where: { id: urgent.id } });
      expect(row.lockedUntil).toEqual(new Date(NOW.getTime() + 10 * MINUTE));
    });
  });

  it("respects the limit", async () => {
    await withRollback(async (tx) => {
      const user = await setup(tx);
      await tx.emailOutbox.createMany({
        data: [1, 2, 3].map((m) => buildOutboxRow({ userId: user.id, createdAt: at(m) })),
      });
      expect(await claimOutboxBatch(tx, { now: NOW, limit: 2, lockFor: MINUTE, types: TYPES })).toHaveLength(
        2,
      );
    });
  });

  it("skips sent rows, future sendAfter, live locks, and rows at the attempt limit", async () => {
    await withRollback(async (tx) => {
      const user = await setup(tx);
      const due = buildOutboxRow({ userId: user.id });
      await tx.emailOutbox.createMany({
        data: [
          due,
          buildOutboxRow({ userId: user.id, sentAt: at(2) }),
          buildOutboxRow({ userId: user.id, sendAfter: at(120) }),
          buildOutboxRow({ userId: user.id, lockedUntil: at(90) }),
          buildOutboxRow({ userId: user.id, attempts: MAX_ATTEMPTS, lastError: "provider down" }),
        ],
      });
      const claimed = await claimOutboxBatch(tx, { now: NOW, limit: 10, lockFor: MINUTE, types: TYPES });
      expect(claimed.map((r) => r.id)).toEqual([due.id]);
    });
  });

  it("claims only the given types, and leaves other rows untouched", async () => {
    await withRollback(async (tx) => {
      const user = await setup(tx);
      const wanted = buildOutboxRow({ userId: user.id });
      const other = buildOutboxRow({ userId: user.id, type: "digest" });
      await tx.emailOutbox.createMany({ data: [wanted, other] });

      const claimed = await claimOutboxBatch(tx, { now: NOW, limit: 10, lockFor: MINUTE, types: TYPES });
      expect(claimed.map((r) => r.id)).toEqual([wanted.id]);
      expect(await claimOutboxBatch(tx, { now: NOW, limit: 10, lockFor: MINUTE, types: [] })).toEqual([]);

      const untouched = await tx.emailOutbox.findUniqueOrThrow({ where: { id: other.id } });
      expect(untouched).toMatchObject({ attempts: 0, lockedUntil: null });
    });
  });

  it("re-claims a row whose lock has expired, and not one claimed a moment ago", async () => {
    await withRollback(async (tx) => {
      const user = await setup(tx);
      const expired = buildOutboxRow({ userId: user.id, lockedUntil: at(30), attempts: 1 });
      await tx.emailOutbox.createMany({ data: [expired] });
      const first = await claimOutboxBatch(tx, { now: NOW, limit: 10, lockFor: 10 * MINUTE, types: TYPES });
      expect(first.map((r) => [r.id, r.attempts])).toEqual([[expired.id, 2]]);
      expect(await claimOutboxBatch(tx, { now: NOW, limit: 10, lockFor: 10 * MINUTE, types: TYPES })).toEqual(
        [],
      );
    });
  });

  it("returns payloads as parsed JSON", async () => {
    await withRollback(async (tx) => {
      const user = await setup(tx);
      const row = buildOutboxRow({ userId: user.id });
      await tx.emailOutbox.createMany({ data: [row] });
      const [claimed] = await claimOutboxBatch(tx, { now: NOW, limit: 1, lockFor: MINUTE, types: TYPES });
      expect(claimed?.payload).toEqual(row.payload);
    });
  });
});
