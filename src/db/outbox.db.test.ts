import { expect, it } from "vitest";
import { createCapturingMailer } from "@/email/capturingMailer";
import { createFakeResendFetch } from "@/email/fakeResendFetch";
import type { IdeaEvent } from "@/email/ideaEvent";
import type { PostDecidedEvent } from "@/email/postDecided";
import { createResendMailer } from "@/email/resendMailer";
import type { Prisma } from "@/generated/prisma/client";
import { drainOutbox, queueDecisionEmail, queueFollowerEmails, queuePostStatusEmail } from "./outbox";
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
import { ideas, users } from "./testing/fixtures";
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

      expect(await drainOutbox(tx, mailer, NOW, { siteUrl: SITE })).toEqual({
        sent: 2,
        failed: 0,
        deferred: 0,
      });
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
      expect(await drainOutbox(tx, mailer, NOW, { siteUrl: SITE })).toEqual({
        sent: 0,
        failed: 0,
        deferred: 0,
      });
      expect(mailer.sent).toHaveLength(2);
    });
  });

  it("records a failed send and sends it on a drain after the backoff", async () => {
    await withSeed(async (tx) => {
      await addFollowers(tx, 1);
      await queueFollowerEmails(tx, started);
      const mailer = createCapturingMailer();

      mailer.failNext(new Error("provider down"));
      expect(await drainOutbox(tx, mailer, NOW, { siteUrl: SITE })).toEqual({
        sent: 0,
        failed: 1,
        deferred: 0,
      });
      const failedRow = await tx.emailOutbox.findFirstOrThrow({ where: { type: "idea_event" } });
      expect(failedRow).toMatchObject({ sentAt: null, attempts: 1, lastError: "provider down" });

      // Still inside the backoff: nothing is claimed.
      expect(await drainOutbox(tx, mailer, new Date(NOW.getTime() + MINUTE), { siteUrl: SITE })).toEqual({
        sent: 0,
        failed: 0,
        deferred: 0,
      });

      const later = new Date(NOW.getTime() + 6 * MINUTE);
      expect(await drainOutbox(tx, mailer, later, { siteUrl: SITE })).toEqual({
        sent: 1,
        failed: 0,
        deferred: 0,
      });
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
      expect(await drainOutbox(tx, mailer, NOW, { siteUrl: SITE })).toEqual({
        sent: 0,
        failed: 1,
        deferred: 0,
      });
      const row = await tx.emailOutbox.findFirstOrThrow({ where: { userId: user!.id, type: "idea_event" } });
      expect(row).toMatchObject({ sentAt: null, attempts: MAX_ATTEMPTS, lastError: "invalid payload" });

      const later = new Date(NOW.getTime() + 60 * MINUTE);
      expect(await drainOutbox(tx, mailer, later, { siteUrl: SITE })).toEqual({
        sent: 0,
        failed: 0,
        deferred: 0,
      });
      expect(mailer.sent).toHaveLength(0);
    });
  });

  it("stops at once for a user whose email is stopped, without sending (#209)", async () => {
    await withSeed(async (tx) => {
      const [user] = await addFollowers(tx, 1);
      await queueFollowerEmails(tx, started);
      // The account bounced after the row was queued.
      await tx.user.update({ where: { id: user!.id }, data: { emailStoppedAt: FIXTURE_TIME } });
      const mailer = createCapturingMailer();

      expect(await drainOutbox(tx, mailer, NOW, { siteUrl: SITE })).toEqual({
        sent: 0,
        failed: 1,
        deferred: 0,
      });
      expect(mailer.sent).toHaveLength(0);
      const row = await tx.emailOutbox.findFirstOrThrow({ where: { userId: user!.id } });
      expect(row).toMatchObject({ sentAt: null, attempts: MAX_ATTEMPTS, lastError: "email stopped" });
    });
  });

  it("a Resend error lands as a failed row with a backoff and no provider id (#209)", async () => {
    await withSeed(async (tx) => {
      await addFollowers(tx, 1);
      await queueFollowerEmails(tx, started);
      const fake = createFakeResendFetch();
      const mailer = createResendMailer({
        apiKey: "re_test_key",
        from: "updates@example.com",
        fetch: fake.fetch,
      });

      fake.respondNext({ status: 422, body: { name: "validation_error", message: "Invalid `to` field." } });
      expect(await drainOutbox(tx, mailer, NOW, { siteUrl: SITE })).toEqual({
        sent: 0,
        failed: 1,
        deferred: 0,
      });

      const row = await tx.emailOutbox.findFirstOrThrow({ where: { type: "idea_event" } });
      expect(row.sentAt).toBeNull();
      expect(row.providerMessageId).toBeNull();
      expect(row.lastError).toMatch(/^Resend 422/);
      expect(row.lockedUntil).toEqual(new Date(NOW.getTime() + 5 * MINUTE));
    });
  });

  it("a Resend success stores the provider id on the row (#209)", async () => {
    await withSeed(async (tx) => {
      await addFollowers(tx, 1);
      await queueFollowerEmails(tx, started);
      const fake = createFakeResendFetch();
      const mailer = createResendMailer({
        apiKey: "re_test_key",
        from: "updates@example.com",
        fetch: fake.fetch,
      });

      expect(await drainOutbox(tx, mailer, NOW, { siteUrl: SITE })).toEqual({
        sent: 1,
        failed: 0,
        deferred: 0,
      });
      const row = await tx.emailOutbox.findFirstOrThrow({ where: { type: "idea_event" } });
      expect(row).toMatchObject({ providerMessageId: "fake-resend-1", lastError: null });
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
      expect(await drainOutbox(tx, mailer, NOW, { siteUrl: SITE })).toEqual({
        sent: 0,
        failed: 0,
        deferred: 0,
      });
      expect(mailer.sent).toHaveLength(0);
      const row = await tx.emailOutbox.findFirstOrThrow({ where: { type: "digest" } });
      expect(row).toMatchObject({ sentAt: null, lockedUntil: null, attempts: 0, lastError: null });
    });
  });
});

describeWithDatabase("paced drain and throttle deferral (#210)", () => {
  const throttle = (retryAfterMs: number) =>
    Object.assign(new Error("Resend 429 rate_limit_exceeded"), { retryAfterMs });

  it("paces between sends, not before the first", async () => {
    await withSeed(async (tx) => {
      await addFollowers(tx, 3);
      await queueFollowerEmails(tx, started);
      let paced = 0;
      const pace = async () => void (paced += 1);
      expect(await drainOutbox(tx, createCapturingMailer(), NOW, { siteUrl: SITE, pace })).toEqual({
        sent: 3,
        failed: 0,
        deferred: 0,
      });
      expect(paced).toBe(2);
    });
  });

  it("a throttle defers the failing row and the rest without counting the attempt", async () => {
    await withSeed(async (tx) => {
      await addFollowers(tx, 3);
      await queueFollowerEmails(tx, started);
      const mailer = createCapturingMailer();
      mailer.failNext(throttle(60_000));

      expect(await drainOutbox(tx, mailer, NOW, { siteUrl: SITE })).toEqual({
        sent: 0,
        failed: 0,
        deferred: 3,
      });
      const rows = await tx.emailOutbox.findMany({ where: { type: "idea_event" } });
      expect(rows.every((row) => row.attempts === 0 && row.sentAt === null)).toBe(true);
      expect(rows.every((row) => row.lockedUntil?.getTime() === NOW.getTime() + 60_000)).toBe(true);
      expect(rows.filter((row) => row.lastError !== null)).toHaveLength(1);

      // Inside the wait nothing is claimed; after it all three go out.
      const inside = new Date(NOW.getTime() + 30_000);
      expect(await drainOutbox(tx, mailer, inside, { siteUrl: SITE })).toEqual({
        sent: 0,
        failed: 0,
        deferred: 0,
      });
      const after = new Date(NOW.getTime() + 61_000);
      expect(await drainOutbox(tx, mailer, after, { siteUrl: SITE })).toEqual({
        sent: 3,
        failed: 0,
        deferred: 0,
      });
    });
  });

  it("a throttle after a success defers only what is left", async () => {
    await withSeed(async (tx) => {
      await addFollowers(tx, 3);
      await queueFollowerEmails(tx, started);
      const mailer = createCapturingMailer();
      let calls = 0;
      const pace = async () => {
        calls += 1;
        if (calls === 1) mailer.failNext(throttle(60_000));
      };

      expect(await drainOutbox(tx, mailer, NOW, { siteUrl: SITE, pace })).toEqual({
        sent: 1,
        failed: 0,
        deferred: 2,
      });
      const rows = await tx.emailOutbox.findMany({ where: { type: "idea_event" } });
      expect(rows.filter((row) => row.sentAt !== null)).toHaveLength(1);
      expect(rows.filter((row) => row.sentAt === null).every((row) => row.attempts === 0)).toBe(true);
    });
  });

  it("a Resend daily quota reply defers with a 60-minute lock", async () => {
    await withSeed(async (tx) => {
      await addFollowers(tx, 2);
      await queueFollowerEmails(tx, started);
      const fake = createFakeResendFetch();
      const mailer = createResendMailer({
        apiKey: "re_test_key",
        from: "updates@example.com",
        fetch: fake.fetch,
      });
      fake.respondNext({ status: 429, body: { name: "daily_quota_exceeded", message: "Quota used." } });

      expect(await drainOutbox(tx, mailer, NOW, { siteUrl: SITE })).toEqual({
        sent: 0,
        failed: 0,
        deferred: 2,
      });
      const rows = await tx.emailOutbox.findMany({ where: { type: "idea_event" } });
      expect(rows.every((row) => row.lockedUntil?.getTime() === NOW.getTime() + 60 * MINUTE)).toBe(true);
      expect(rows.every((row) => row.attempts === 0)).toBe(true);
    });
  });
});

describeWithDatabase("emails about your own post (#211)", () => {
  const REASON = "This repeats an open idea. Support that one instead.";
  const decided = (
    overrides: Partial<PostDecidedEvent> & { ideaId: string; reviewId: string },
  ): PostDecidedEvent => ({
    decision: "declined",
    reason: REASON,
    decidedAt: NOW,
    ...overrides,
  });
  const pendingDecline = decided({ ideaId: ideas.pending.id, reviewId: testUuid(7001) });
  const ownPostTypes = ["post_decided", "post_status"] as const;

  it("a decision on a pending post queues one post_decided row for its author, once", async () => {
    await withSeed(async (tx) => {
      expect(await queueDecisionEmail(tx, pendingDecline)).toEqual({ queued: 1 });
      const rows = await tx.emailOutbox.findMany({ where: { type: "post_decided" } });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ userId: users.student.id, priority: 1, sentAt: null });
      expect(rows[0]?.sendAfter).toEqual(NOW);
      // The same event again adds none.
      expect(await queueDecisionEmail(tx, pendingDecline)).toEqual({ queued: 0 });
      expect(await tx.emailOutbox.count({ where: { type: "post_decided" } })).toBe(1);
    });
  });

  it("only the idea's author is ever emailed, however many people follow, support, or help", async () => {
    await withSeed(async (tx) => {
      // foodPantry already has two supporters and a participant. Add three followers.
      await addFollowers(tx, 3);
      await queueDecisionEmail(tx, {
        ...pendingDecline,
        ideaId: ideas.foodPantry.id,
        decision: "taken_down",
        reviewId: testUuid(7002),
      });
      await queuePostStatusEmail(tx, started);
      await queueFollowerEmails(tx, started);

      const ownRows = await tx.emailOutbox.findMany({ where: { type: { in: [...ownPostTypes] } } });
      expect(ownRows).toHaveLength(2);
      expect(ownRows.every((row) => row.userId === users.student.id)).toBe(true);
      // The followers got their own idea_event rows, and nobody else got an own-post row.
      expect(await tx.emailOutbox.count({ where: { type: "idea_event" } })).toBe(3);
    });
  });

  it("a sent-back decision queues exactly one row, to the author only, with no reviewer or email field (#286)", async () => {
    await withSeed(async (tx) => {
      await addFollowers(tx, 3);
      expect(
        await queueDecisionEmail(tx, {
          ...pendingDecline,
          ideaId: ideas.foodPantry.id,
          decision: "sent_back",
          reviewId: testUuid(7003),
        }),
      ).toEqual({ queued: 1 });
      const rows = await tx.emailOutbox.findMany({ where: { type: "post_decided" } });
      expect(rows).toHaveLength(1);
      expect(rows[0]?.userId).toBe(users.student.id);
      expect(rows[0]?.payload).toMatchObject({ event: { kind: "sent_back", reason: REASON } });
      expect(Object.keys(rows[0]?.payload as object).sort()).toEqual(
        ["boardId", "event", "ideaId", "ideaNumber", "ideaTitle", "isAnonymous"].sort(),
      );
    });
  });

  it("an idea with no author queues nothing, and neither does a stopped author", async () => {
    await withSeed(async (tx) => {
      expect(await queuePostStatusEmail(tx, { ...started, ideaId: ideas.refillStations.id })).toEqual({
        queued: 0,
      });
      await tx.user.update({ where: { id: users.student.id }, data: { emailStoppedAt: FIXTURE_TIME } });
      expect(await queueDecisionEmail(tx, pendingDecline)).toEqual({ queued: 0 });
      expect(await queuePostStatusEmail(tx, started)).toEqual({ queued: 0 });
      expect(await tx.emailOutbox.count({ where: { type: { in: [...ownPostTypes] } } })).toBe(0);
    });
  });

  it("honors each opt-out on its own type", async () => {
    await withSeed(async (tx) => {
      await tx.emailOptOut.create({ data: { userId: users.student.id, type: "post_decided" } });
      expect(await queueDecisionEmail(tx, pendingDecline)).toEqual({ queued: 0 });
      expect(await queuePostStatusEmail(tx, started)).toEqual({ queued: 1 });
    });
    await withSeed(async (tx) => {
      await tx.emailOptOut.create({ data: { userId: users.student.id, type: "post_status" } });
      expect(await queuePostStatusEmail(tx, started)).toEqual({ queued: 0 });
      expect(await queueDecisionEmail(tx, pendingDecline)).toEqual({ queued: 1 });
    });
  });

  it("a follower who turned off idea_event gets no follower row, while the others do", async () => {
    await withSeed(async (tx) => {
      const [quiet] = await addFollowers(tx, 3);
      await tx.emailOptOut.create({ data: { userId: quiet!.id, type: "idea_event" } });
      expect(await queueFollowerEmails(tx, started)).toEqual({ queued: 2 });
      expect(await tx.emailOutbox.count({ where: { userId: quiet!.id } })).toBe(0);
    });
  });

  it("a bounce stops every type whatever the toggles say", async () => {
    await withSeed(async (tx) => {
      const [follower] = await addFollowers(tx, 1);
      await tx.user.update({ where: { id: follower!.id }, data: { emailStoppedAt: FIXTURE_TIME } });
      expect(await queueFollowerEmails(tx, started)).toEqual({ queued: 0 });
    });
  });

  it("an anonymous post is emailed to its author's account, and the payload names no author", async () => {
    await withSeed(async (tx) => {
      await queueDecisionEmail(
        tx,
        decided({
          ideaId: ideas.lateNightDining.id,
          reviewId: testUuid(7003),
          decision: "approved",
          reason: null,
        }),
      );
      const row = await tx.emailOutbox.findFirstOrThrow({ where: { type: "post_decided" } });
      expect(row.userId).toBe(users.anonymousAuthor.id);
      expect(row.payload).toMatchObject({ isAnonymous: true });
      expect(Object.keys(row.payload as object)).not.toContain("authorId");
      expect(JSON.stringify(row.payload)).not.toContain(users.anonymousAuthor.displayName);
    });
  });

  it("an author who follows their own idea gets one post_status row and no idea_event row", async () => {
    await withSeed(async (tx) => {
      await tx.follow.create({
        data: buildFollow({ userId: users.student.id, ideaId: ideas.foodPantry.id }),
      });
      await queueFollowerEmails(tx, started);
      await queuePostStatusEmail(tx, started);
      expect(await tx.emailOutbox.count({ where: { userId: users.student.id, type: "idea_event" } })).toBe(0);
      expect(await tx.emailOutbox.count({ where: { userId: users.student.id, type: "post_status" } })).toBe(
        1,
      );
    });
  });

  it("throws for a status email on a post that is not approved", async () => {
    await withSeed(async (tx) => {
      await expect(queuePostStatusEmail(tx, { ...started, ideaId: ideas.pending.id })).rejects.toThrow(
        /not approved/,
      );
    });
  });

  it("drains a declined row to the author with the reason, the edit link, and the settings link", async () => {
    await withSeed(async (tx) => {
      await queueDecisionEmail(tx, pendingDecline);
      const mailer = createCapturingMailer();
      expect(await drainOutbox(tx, mailer, NOW, { siteUrl: SITE })).toEqual({
        sent: 1,
        failed: 0,
        deferred: 0,
      });
      const [message] = mailer.sent;
      expect(message?.to).toBe(users.student.email);
      expect(message?.subject).toBe(`Your post was not approved: ${ideas.pending.title}`);
      expect(message?.text).toContain(REASON);
      expect(message?.text).toContain(`${SITE}/me/ideas/${ideas.pending.id}/edit`);
      expect(message?.text).toContain(`${SITE}/me/notifications`);
      const row = await tx.emailOutbox.findFirstOrThrow({ where: { type: "post_decided" } });
      expect(row.sentAt).toEqual(NOW);
    });
  });

  it("drains priority 1 before priority 3", async () => {
    await withSeed(async (tx) => {
      await addFollowers(tx, 1);
      await queueFollowerEmails(tx, started);
      await queuePostStatusEmail(tx, started);
      const mailer = createCapturingMailer();
      await drainOutbox(tx, mailer, NOW, { siteUrl: SITE, limit: 1 });
      expect(mailer.sent).toHaveLength(1);
      expect(mailer.sent[0]?.to).toBe(users.student.email);
    });
  });

  it("a row for a type turned off after it was queued fails with 'turned off' and is not sent", async () => {
    await withSeed(async (tx) => {
      await queueDecisionEmail(tx, pendingDecline);
      await tx.emailOptOut.create({ data: { userId: users.student.id, type: "post_decided" } });
      const mailer = createCapturingMailer();
      expect(await drainOutbox(tx, mailer, NOW, { siteUrl: SITE })).toEqual({
        sent: 0,
        failed: 1,
        deferred: 0,
      });
      expect(mailer.sent).toHaveLength(0);
      const row = await tx.emailOutbox.findFirstOrThrow({ where: { type: "post_decided" } });
      expect(row).toMatchObject({ sentAt: null, attempts: MAX_ATTEMPTS, lastError: "turned off" });
    });
  });

  it("a stopped account gets nothing at send, even with every toggle on", async () => {
    await withSeed(async (tx) => {
      await queuePostStatusEmail(tx, started);
      await tx.user.update({ where: { id: users.student.id }, data: { emailStoppedAt: FIXTURE_TIME } });
      const mailer = createCapturingMailer();
      expect(await drainOutbox(tx, mailer, NOW, { siteUrl: SITE })).toEqual({
        sent: 0,
        failed: 1,
        deferred: 0,
      });
      expect(mailer.sent).toHaveLength(0);
    });
  });

  it("a bad payload of either new type fails with 'invalid payload'", async () => {
    await withSeed(async (tx) => {
      for (const type of ownPostTypes) {
        await tx.emailOutbox.create({
          data: buildOutboxRow({
            userId: users.student.id,
            type,
            dedupeKey: `bad:${type}`,
            payload: { nope: true },
            sendAfter: NOW,
          }),
        });
      }
      const mailer = createCapturingMailer();
      expect(await drainOutbox(tx, mailer, NOW, { siteUrl: SITE })).toEqual({
        sent: 0,
        failed: 2,
        deferred: 0,
      });
      const rows = await tx.emailOutbox.findMany({ where: { type: { in: [...ownPostTypes] } } });
      expect(rows.every((row) => row.lastError === "invalid payload")).toBe(true);
    });
  });
});
