import { expect, it } from "vitest";
import { digestWeekday } from "@/core/digest";
import { digestPayloadSchema } from "@/email/digest";
import { verifyUnsubscribeToken } from "@/email/unsubscribeToken";
import type { Prisma } from "@/generated/prisma/client";
import { queueDigests } from "./digest";
import { describeWithDatabase, withRollback } from "./testing/database";
import { withCountedSeed } from "./testing/countQueries";
import {
  buildApprovedIdea,
  buildEmailPreference,
  buildFollow,
  buildIdea,
  buildUpdate,
  buildUser,
} from "./testing/factories";

// The weekly digest pass against Postgres (#212), inside a rolled-back transaction with
// only the boards the migrations insert. No email is sent: the pass only queues rows.
const SECRET = "k".repeat(40);
const LINK = { linkSecret: SECRET };
const DAY = 24 * 60 * 60 * 1000;

// Monday, November 16, 2026, 13:00 UTC: the run's time. A student's weekday is a hash of
// their id, so each test picks students by weekday instead of assuming one.
const MONDAY = new Date("2026-11-16T13:00:00.000Z");
const MONDAY_START = new Date("2026-11-16T00:00:00.000Z");
const LAST_WEEK = new Date("2026-11-13T15:00:00.000Z");

function userOn(weekday: number, overrides: Partial<Prisma.UserUncheckedCreateInput> = {}) {
  for (;;) {
    const user = buildUser(overrides);
    if (digestWeekday(user.id) === weekday) return user;
  }
}

async function approvedIdea(
  tx: Prisma.TransactionClient,
  overrides: Partial<Prisma.IdeaUncheckedCreateInput> = {},
) {
  const idea = buildApprovedIdea(overrides);
  await tx.idea.create({ data: idea });
  return idea;
}

async function follower(
  tx: Prisma.TransactionClient,
  ideaIds: string[],
  overrides: Partial<Prisma.UserUncheckedCreateInput> = {},
  weekday = 1,
) {
  const user = userOn(weekday, overrides);
  await tx.user.create({ data: user });
  await tx.follow.createMany({ data: ideaIds.map((ideaId) => buildFollow({ userId: user.id, ideaId })) });
  return user;
}

const digestRows = (tx: Prisma.TransactionClient) => tx.emailOutbox.findMany({ where: { type: "digest" } });

describeWithDatabase("weekly digest queue (#212)", () => {
  it("a follower with no new updates gets no row", async () => {
    await withRollback(async (tx) => {
      const idea = await approvedIdea(tx);
      await follower(tx, [idea.id]);
      expect(await queueDigests(tx, MONDAY, LINK)).toEqual({ cohort: 1, queued: 0 });
      expect(await digestRows(tx)).toHaveLength(0);
    });
  });

  it("updates only on a pending or declined idea give no row", async () => {
    await withRollback(async (tx) => {
      const pending = buildIdea();
      const declined = buildIdea({ reviewStatus: "declined" });
      await tx.idea.createMany({ data: [pending, declined] });
      await tx.update.createMany({
        data: [
          buildUpdate({ ideaId: pending.id, createdAt: LAST_WEEK }),
          buildUpdate({ ideaId: declined.id, createdAt: LAST_WEEK }),
        ],
      });
      const quiet = await approvedIdea(tx);
      await follower(tx, [pending.id, declined.id, quiet.id]);
      expect(await queueDigests(tx, MONDAY, LINK)).toEqual({ cohort: 1, queued: 0 });
    });
  });

  it("a follower on their weekday with one update gets one priority 3 row, and a preference row is written", async () => {
    await withRollback(async (tx) => {
      const idea = await approvedIdea(tx);
      await tx.update.create({
        data: buildUpdate({ ideaId: idea.id, body: "Met with Dining.", createdAt: LAST_WEEK }),
      });
      const user = await follower(tx, [idea.id]);

      expect(await queueDigests(tx, MONDAY, LINK)).toEqual({ cohort: 1, queued: 1 });
      const [row, ...rest] = await digestRows(tx);
      expect(rest).toHaveLength(0);
      expect(row).toMatchObject({
        userId: user.id,
        priority: 3,
        sentAt: null,
        dedupeKey: `digest:${user.id}:2026-11-16`,
      });
      expect(row?.sendAfter).toEqual(MONDAY);

      const payload = digestPayloadSchema.parse(row?.payload);
      expect(payload.totalUpdates).toBe(1);
      expect(payload.ideas).toHaveLength(1);
      expect(payload.ideas[0]).toMatchObject({ ideaNumber: idea.number, boardId: "DAB" });
      expect(payload.ideas[0]?.updates[0]?.body).toBe("Met with Dining.");
      expect(verifyUnsubscribeToken(SECRET, payload.unsubscribeToken)).toEqual({
        userId: user.id,
        type: "digest",
      });

      const preference = await tx.emailPreference.findUniqueOrThrow({ where: { userId: user.id } });
      expect(preference.lastDigestAt).toEqual(MONDAY_START);
      expect(preference.digestWeekday).toBe(digestWeekday(user.id));
    });
  });

  it("moves lastDigestAt on an existing preference row without touching its weekday", async () => {
    await withRollback(async (tx) => {
      const idea = await approvedIdea(tx);
      await tx.update.create({ data: buildUpdate({ ideaId: idea.id, createdAt: LAST_WEEK }) });
      const user = await follower(tx, [idea.id]);
      await tx.emailPreference.create({ data: buildEmailPreference({ userId: user.id, digestWeekday: 5 }) });

      expect(await queueDigests(tx, MONDAY, LINK)).toEqual({ cohort: 1, queued: 1 });
      const preference = await tx.emailPreference.findUniqueOrThrow({ where: { userId: user.id } });
      expect(preference).toMatchObject({ lastDigestAt: MONDAY_START, digestWeekday: 5 });
    });
  });

  it("a follower on another weekday gets nothing today, and is in the cohort on their own day", async () => {
    await withRollback(async (tx) => {
      const idea = await approvedIdea(tx);
      await tx.update.create({ data: buildUpdate({ ideaId: idea.id, createdAt: LAST_WEEK }) });
      await follower(tx, [idea.id], {}, 3);
      expect(await queueDigests(tx, MONDAY, LINK)).toEqual({ cohort: 0, queued: 0 });
      // Wednesday, November 18.
      expect(await queueDigests(tx, new Date("2026-11-18T13:00:00.000Z"), LINK)).toEqual({
        cohort: 1,
        queued: 1,
      });
    });
  });

  it("queues nothing for a student who opted out of the digest, is stopped, unsubscribed, bounced, or off", async () => {
    await withRollback(async (tx) => {
      const idea = await approvedIdea(tx);
      await tx.update.create({ data: buildUpdate({ ideaId: idea.id, createdAt: LAST_WEEK }) });
      const optedOut = await follower(tx, [idea.id]);
      await follower(tx, [idea.id], { emailStoppedAt: LAST_WEEK });
      const unsubscribed = await follower(tx, [idea.id]);
      const bounced = await follower(tx, [idea.id]);
      const off = await follower(tx, [idea.id]);
      await tx.emailOptOut.create({ data: { userId: optedOut.id, type: "digest" } });
      await tx.emailPreference.createMany({
        data: [
          buildEmailPreference({ userId: unsubscribed.id, unsubscribedAt: LAST_WEEK }),
          buildEmailPreference({ userId: bounced.id, bouncedAt: LAST_WEEK }),
          buildEmailPreference({ userId: off.id, digestFrequency: "off" }),
        ],
      });
      // Opting out of another type does not stop the digest.
      const otherOptOut = await follower(tx, [idea.id]);
      await tx.emailOptOut.create({ data: { userId: otherOptOut.id, type: "idea_event" } });

      expect(await queueDigests(tx, MONDAY, LINK)).toEqual({ cohort: 1, queued: 1 });
      expect((await digestRows(tx)).map((row) => row.userId)).toEqual([otherOptOut.id]);
    });
  });

  it("running the pass twice on the same day queues nothing new", async () => {
    await withRollback(async (tx) => {
      const idea = await approvedIdea(tx);
      await tx.update.create({ data: buildUpdate({ ideaId: idea.id, createdAt: LAST_WEEK }) });
      await follower(tx, [idea.id]);
      expect(await queueDigests(tx, MONDAY, LINK)).toEqual({ cohort: 1, queued: 1 });
      expect(await queueDigests(tx, new Date("2026-11-16T20:00:00.000Z"), LINK)).toEqual({
        cohort: 1,
        queued: 0,
      });
      expect(await digestRows(tx)).toHaveLength(1);
    });
  });

  it("two overlapping runs, both before either wrote its preference, still queue one row", async () => {
    await withRollback(async (tx) => {
      const idea = await approvedIdea(tx);
      await tx.update.create({ data: buildUpdate({ ideaId: idea.id, createdAt: LAST_WEEK }) });
      const user = await follower(tx, [idea.id]);
      expect(await queueDigests(tx, MONDAY, LINK)).toEqual({ cohort: 1, queued: 1 });
      // The second run read the state before the first wrote lastDigestAt: put it back.
      await tx.emailPreference.update({ where: { userId: user.id }, data: { lastDigestAt: null } });
      expect(await queueDigests(tx, MONDAY, LINK)).toEqual({ cohort: 1, queued: 0 });
      expect(await digestRows(tx)).toHaveLength(1);
    });
  });

  it("the next week's digest holds only the updates after the first one's day", async () => {
    await withRollback(async (tx) => {
      const idea = await approvedIdea(tx);
      await tx.update.create({
        data: buildUpdate({ ideaId: idea.id, body: "Old news.", createdAt: LAST_WEEK }),
      });
      await follower(tx, [idea.id]);
      await queueDigests(tx, MONDAY, LINK);

      await tx.update.create({
        data: buildUpdate({
          ideaId: idea.id,
          body: "New news.",
          createdAt: new Date("2026-11-19T15:00:00.000Z"),
        }),
      });
      const nextMonday = new Date(MONDAY.getTime() + 7 * DAY);
      expect(await queueDigests(tx, nextMonday, LINK)).toEqual({ cohort: 1, queued: 1 });
      const rows = await digestRows(tx);
      const second = rows.find((row) => row.dedupeKey.endsWith("2026-11-23"));
      const payload = digestPayloadSchema.parse(second?.payload);
      expect(payload.totalUpdates).toBe(1);
      expect(payload.ideas[0]?.updates.map((update) => update.body)).toEqual(["New news."]);
    });
  });

  it("an update posted today waits for the next digest, and one before the window never comes", async () => {
    await withRollback(async (tx) => {
      const idea = await approvedIdea(tx);
      await tx.update.createMany({
        data: [
          buildUpdate({ ideaId: idea.id, createdAt: new Date("2026-11-16T09:00:00.000Z") }),
          buildUpdate({ ideaId: idea.id, createdAt: new Date(MONDAY_START.getTime() - 8 * DAY) }),
        ],
      });
      await follower(tx, [idea.id]);
      expect(await queueDigests(tx, MONDAY, LINK)).toEqual({ cohort: 1, queued: 0 });
    });
  });

  it("a new follower's first digest holds only the updates posted after they followed", async () => {
    await withRollback(async (tx) => {
      const idea = await approvedIdea(tx);
      await tx.update.createMany({
        data: [
          buildUpdate({
            ideaId: idea.id,
            body: "Before they followed.",
            createdAt: new Date("2026-11-11T15:00:00.000Z"),
          }),
          buildUpdate({ ideaId: idea.id, body: "After they followed.", createdAt: LAST_WEEK }),
        ],
      });
      const user = userOn(1);
      await tx.user.create({ data: user });
      await tx.follow.create({
        data: buildFollow({
          userId: user.id,
          ideaId: idea.id,
          createdAt: new Date("2026-11-12T10:00:00.000Z"),
        }),
      });

      expect(await queueDigests(tx, MONDAY, LINK)).toEqual({ cohort: 1, queued: 1 });
      const [row] = await digestRows(tx);
      const payload = digestPayloadSchema.parse(row?.payload);
      expect(payload.totalUpdates).toBe(1);
      expect(payload.ideas[0]?.updates.map((update) => update.body)).toEqual(["After they followed."]);
    });
  });

  it("never puts an author, a supporter, or an email in the payload", async () => {
    await withRollback(async (tx) => {
      const author = buildUser();
      await tx.user.create({ data: author });
      const idea = await approvedIdea(tx, { authorId: author.id, isAnonymous: true });
      await tx.update.create({
        data: buildUpdate({ ideaId: idea.id, authorId: author.id, createdAt: LAST_WEEK }),
      });
      await follower(tx, [idea.id]);
      await queueDigests(tx, MONDAY, LINK);
      const text = JSON.stringify((await digestRows(tx))[0]?.payload);
      expect(text).not.toContain(author.id);
      expect(text).not.toContain(author.email);
      expect(text).not.toContain(author.displayName);
    });
  });

  it("a student following several ideas gets one digest covering all of them", async () => {
    await withRollback(async (tx) => {
      const first = await approvedIdea(tx);
      const second = await approvedIdea(tx);
      const third = await approvedIdea(tx);
      await tx.update.createMany({
        data: [
          buildUpdate({ ideaId: first.id, createdAt: LAST_WEEK }),
          buildUpdate({ ideaId: second.id, createdAt: new Date(LAST_WEEK.getTime() + 1000) }),
          buildUpdate({ ideaId: third.id, createdAt: LAST_WEEK }),
        ],
      });
      await follower(tx, [first.id, second.id]);
      await queueDigests(tx, MONDAY, LINK);
      const [row] = await digestRows(tx);
      const payload = digestPayloadSchema.parse(row?.payload);
      expect(payload.ideas.map((idea) => idea.ideaNumber)).toEqual([second.number, first.number]);
      expect(payload.totalUpdates).toBe(2);
    });
  });
});

// Invented students following 3 of 30 ideas each, every idea with one update. The ideas
// get explicit numbers from `firstNumber` up, far above the seed's: the factories' counter
// is shared by the whole file, so its numbers collide with the seed's (ideas_number_key).
const SCALE_TIMEOUT = 120_000;
async function seedStudents(
  tx: Prisma.TransactionClient,
  count: number,
  updateAt: Date,
  firstNumber: number,
) {
  const ideas = Array.from({ length: 30 }, (_, index) => buildApprovedIdea({ number: firstNumber + index }));
  await tx.idea.createMany({ data: ideas });
  await tx.update.createMany({
    data: ideas.map((idea) => buildUpdate({ ideaId: idea.id, createdAt: updateAt })),
  });
  const users = Array.from({ length: count }, () => buildUser());
  await tx.user.createMany({ data: users });
  await tx.follow.createMany({
    data: users.flatMap((user, index) =>
      [0, 1, 2].map((offset) => buildFollow({ userId: user.id, ideaId: ideas[(index + offset) % 30]!.id })),
    ),
  });
  return users;
}

describeWithDatabase("weekly digest at the 1,500-student scale (#212)", () => {
  it(
    "queues every follower's digest once in a week, with no day holding a burst",
    async () => {
      await withRollback(
        async (tx) => {
          await seedStudents(tx, 1500, new Date("2026-11-15T12:00:00.000Z"), 10_000);
          const perDay: number[] = [];
          for (let day = 0; day < 7; day += 1) {
            const { queued } = await queueDigests(tx, new Date(MONDAY.getTime() + day * DAY), LINK);
            perDay.push(queued);
          }
          expect(perDay.reduce((sum, queued) => sum + queued, 0)).toBe(1500);
          expect(Math.max(...perDay)).toBeLessThanOrEqual(280);
          expect(await tx.emailOutbox.count({ where: { type: "digest" } })).toBe(1500);
        },
        { timeout: SCALE_TIMEOUT },
      );
    },
    SCALE_TIMEOUT,
  );

  // 1,000 is enough here: the test compares a cohort of a few dozen with one over 100.
  it(
    "uses the same number of queries with 60 and with 1,000 followers",
    async () => {
      await withCountedSeed(
        async (tx, queries) => {
          const small = await seedStudents(tx, 60, new Date("2026-11-15T12:00:00.000Z"), 10_000);
          // The busiest weekday among the 60, so the cohort is never empty.
          const byWeekday = Array.from({ length: 7 }, (): string[] => []);
          for (const user of small) byWeekday[digestWeekday(user.id)]!.push(user.id);
          const weekday = byWeekday.reduce(
            (best, ids, index) => (ids.length > byWeekday[best]!.length ? index : best),
            0,
          );
          const smallDay = new Date(MONDAY.getTime() + ((weekday + 6) % 7) * DAY);
          // One student in the cohort already has a preference row and the rest do not, so
          // both the insert and the update run in both measurements.
          await tx.emailPreference.create({
            data: buildEmailPreference({ userId: byWeekday[weekday]![0]! }),
          });

          queries.reset();
          const first = await queueDigests(tx, smallDay, LINK);
          expect(first.queued).toBeGreaterThan(1);
          const few = queries.count;

          // Two weeks later the 60 have a last digest, and the 1,000 have none, so their
          // default window holds the new update.
          await seedStudents(tx, 1000, new Date("2026-11-29T12:00:00.000Z"), 20_000);
          const later = new Date(smallDay.getTime() + 14 * DAY);
          queries.reset();
          const { cohort } = await queueDigests(tx, later, LINK);
          expect(cohort).toBeGreaterThan(100);
          expect(queries.count).toBe(few);
        },
        { timeout: SCALE_TIMEOUT },
      );
    },
    SCALE_TIMEOUT,
  );
});
