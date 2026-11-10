import { expect, it } from "vitest";
import { createCapturingMailer } from "@/email/capturingMailer";
import type { IdeaEvent } from "@/email/ideaEvent";
import type { Prisma } from "@/generated/prisma/client";
import { drainOutbox, queueFollowerEmails } from "./outbox";
import { MAX_ATTEMPTS } from "./sql/claimOutboxBatch";
import { describeWithDatabase } from "./testing/database";
import { withCountedSeed } from "./testing/countQueries";
import {
  buildEmailPreference,
  buildFollow,
  buildOutboxRow,
  buildUser,
  FIXTURE_TIME,
  testUuid,
} from "./testing/factories";
import { ideas } from "./testing/fixtures";
import { withSeed } from "./testing/seededTransaction";

// The follower email outbox against Postgres (#101), inside the seed's rolled-back
// transaction. The mailer is always the capturing mailer: no real email is sent.
const MINUTE = 60 * 1000;
const SITE = "https://proposals.example.com";
const NOW = new Date("2026-11-06T15:00:00.000Z");

const started: IdeaEvent = {
  kind: "status",
  ideaId: ideas.foodPantry.id,
  status: "in_progress",
  waitingReason: null,
  changedAt: NOW,
};

async function addFollowers(
  tx: Prisma.TransactionClient,
  count: number,
  ideaId: string = ideas.foodPantry.id,
) {
  const users = Array.from({ length: count }, () => buildUser());
  await tx.user.createMany({ data: users });
  await tx.follow.createMany({ data: users.map((user) => buildFollow({ userId: user.id, ideaId })) });
  return users;
}

describeWithDatabase("follower email outbox (#101)", () => {
  it("a status change on an idea with three followers queues three idea_event rows at priority 3", async () => {
    await withSeed(async (tx) => {
      const users = await addFollowers(tx, 3);
      expect(await queueFollowerEmails(tx, started)).toEqual({ queued: 3 });
      const rows = await tx.emailOutbox.findMany({ where: { type: "idea_event" } });
      expect(rows).toHaveLength(3);
      expect(rows.every((row) => row.priority === 3 && row.sentAt === null)).toBe(true);
      expect(rows.map((row) => row.userId).sort()).toEqual(users.map((user) => user.id).sort());
      expect(rows[0]?.sendAfter).toEqual(NOW);
    });
  });

  it("queuing the same event again adds none", async () => {
    await withSeed(async (tx) => {
      await addFollowers(tx, 2);
      await queueFollowerEmails(tx, started);
      expect(await queueFollowerEmails(tx, started)).toEqual({ queued: 0 });
      expect(await tx.emailOutbox.count({ where: { type: "idea_event" } })).toBe(2);
    });
  });

  it("skips followers whose email is stopped, unsubscribed, bounced, or off", async () => {
    await withSeed(async (tx) => {
      const [ok, plain, stopped, unsubscribed, bounced, off] = await addFollowers(tx, 6);
      await tx.user.update({ where: { id: stopped!.id }, data: { emailStoppedAt: FIXTURE_TIME } });
      await tx.emailPreference.createMany({
        data: [
          buildEmailPreference({ userId: ok!.id }),
          buildEmailPreference({ userId: unsubscribed!.id, unsubscribedAt: FIXTURE_TIME }),
          buildEmailPreference({ userId: bounced!.id, bouncedAt: FIXTURE_TIME }),
          buildEmailPreference({ userId: off!.id, digestFrequency: "off" }),
        ],
      });
      expect(await queueFollowerEmails(tx, started)).toEqual({ queued: 2 });
      const rows = await tx.emailOutbox.findMany({ where: { type: "idea_event" } });
      expect(rows.map((row) => row.userId).sort()).toEqual([ok!.id, plain!.id].sort());
    });
  });

  it("queues an update by its id, so a status change and an update are separate emails", async () => {
    await withSeed(async (tx) => {
      await addFollowers(tx, 1);
      const update: IdeaEvent = {
        kind: "update",
        ideaId: ideas.foodPantry.id,
        updateId: testUuid(9001),
        body: "We met with Dining Services today.",
      };
      await queueFollowerEmails(tx, started);
      expect(await queueFollowerEmails(tx, update)).toEqual({ queued: 1 });
      expect(await tx.emailOutbox.count({ where: { type: "idea_event" } })).toBe(2);
    });
  });

  it("throws for an idea that is not approved", async () => {
    await withSeed(async (tx) => {
      await expect(queueFollowerEmails(tx, { ...started, ideaId: ideas.pending.id })).rejects.toThrow(
        /not approved/,
      );
    });
  });

  it("uses the same number of queries with 1 or 20 followers", async () => {
    await withCountedSeed(async (tx, queries) => {
      await addFollowers(tx, 1);
      queries.reset();
      await queueFollowerEmails(tx, started);
      const one = queries.count;

      await addFollowers(tx, 19);
      queries.reset();
      await queueFollowerEmails(tx, { ...started, changedAt: new Date(NOW.getTime() + MINUTE) });
      expect(queries.count).toBe(one);
    });
  });

  it("drains each row to its user's email with the rendered subject and marks it sent", async () => {
    await withSeed(async (tx) => {
      const [first, second] = await addFollowers(tx, 2);
      await queueFollowerEmails(tx, started);
      const mailer = createCapturingMailer();

      expect(await drainOutbox(tx, mailer, NOW, { siteUrl: SITE })).toEqual({ sent: 2, failed: 0 });
      expect(mailer.sent.map((message) => message.to).sort()).toEqual([first!.email, second!.email].sort());
      expect(mailer.sent.every((message) => message.subject === "Proposal #103: In progress")).toBe(true);
      expect(mailer.sent[0]?.text).toContain(`${SITE}/ideas/103`);

      const rows = await tx.emailOutbox.findMany({ where: { type: "idea_event" } });
      expect(
        rows.every(
          (row) => row.sentAt?.getTime() === NOW.getTime() && row.providerMessageId?.startsWith("captured-"),
        ),
      ).toBe(true);

      // A second drain finds nothing to send.
      expect(await drainOutbox(tx, mailer, NOW, { siteUrl: SITE })).toEqual({ sent: 0, failed: 0 });
      expect(mailer.sent).toHaveLength(2);
    });
  });

  it("records a failed send and sends it on a drain after the backoff", async () => {
    await withSeed(async (tx) => {
      await addFollowers(tx, 1);
      await queueFollowerEmails(tx, started);
      const mailer = createCapturingMailer();

      mailer.failNext(new Error("provider down"));
      expect(await drainOutbox(tx, mailer, NOW, { siteUrl: SITE })).toEqual({ sent: 0, failed: 1 });
      const failedRow = await tx.emailOutbox.findFirstOrThrow({ where: { type: "idea_event" } });
      expect(failedRow).toMatchObject({ sentAt: null, attempts: 1, lastError: "provider down" });

      // Still inside the backoff: nothing is claimed.
      expect(await drainOutbox(tx, mailer, new Date(NOW.getTime() + MINUTE), { siteUrl: SITE })).toEqual({
        sent: 0,
        failed: 0,
      });

      const later = new Date(NOW.getTime() + 6 * MINUTE);
      expect(await drainOutbox(tx, mailer, later, { siteUrl: SITE })).toEqual({ sent: 1, failed: 0 });
      const sentRow = await tx.emailOutbox.findFirstOrThrow({ where: { type: "idea_event" } });
      expect(sentRow).toMatchObject({ attempts: 2, lastError: null });
      expect(sentRow.sentAt).toEqual(later);
    });
  });

  it("stops at once on an invalid payload, without retries", async () => {
    await withSeed(async (tx) => {
      const [user] = await addFollowers(tx, 1);
      await tx.emailOutbox.create({
        data: buildOutboxRow({ userId: user!.id, payload: { nope: true }, sendAfter: NOW }),
      });
      const mailer = createCapturingMailer();
      expect(await drainOutbox(tx, mailer, NOW, { siteUrl: SITE })).toEqual({ sent: 0, failed: 1 });
      const row = await tx.emailOutbox.findFirstOrThrow({ where: { userId: user!.id, type: "idea_event" } });
      expect(row).toMatchObject({ sentAt: null, attempts: MAX_ATTEMPTS, lastError: "invalid payload" });

      const later = new Date(NOW.getTime() + 60 * MINUTE);
      expect(await drainOutbox(tx, mailer, later, { siteUrl: SITE })).toEqual({ sent: 0, failed: 0 });
      expect(mailer.sent).toHaveLength(0);
    });
  });

  it("does not claim a type with no renderer, so it burns no attempt", async () => {
    await withSeed(async (tx) => {
      const [user] = await addFollowers(tx, 1);
      await tx.emailOutbox.create({
        data: {
          userId: user!.id,
          type: "digest",
          priority: 3,
          dedupeKey: "digest:test",
          payload: {},
          sendAfter: NOW,
        },
      });
      const mailer = createCapturingMailer();
      expect(await drainOutbox(tx, mailer, NOW, { siteUrl: SITE })).toEqual({ sent: 0, failed: 0 });
      expect(mailer.sent).toHaveLength(0);
      const row = await tx.emailOutbox.findFirstOrThrow({ where: { type: "digest" } });
      expect(row).toMatchObject({ sentAt: null, lockedUntil: null, attempts: 0, lastError: null });
    });
  });
});
