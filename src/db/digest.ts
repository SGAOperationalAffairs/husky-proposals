import { buildDigest, digestDay, digestWeekday, digestWindow, type DigestUpdate } from "@/core/digest";
import { DIGEST_PRIORITY, digestDedupeKey, digestPayloadSchema } from "@/email/digest";
import { signUnsubscribeToken } from "@/email/unsubscribeToken";
import type { Prisma } from "@/generated/prisma/client";
import { acceptsEmail } from "./emailFilters";
import { isPublic, publicUpdateSelect } from "./ideaSelects";

// The weekly digest's daily pass (#212). Each student has one weekday, from a stable hash
// of their id, so a run queues about a seventh of the followers and the week's email is
// never one burst. The pass only queues `digest` outbox rows; the send route's drain
// (#210) sends them.

type DigestDb = Pick<Prisma.TransactionClient, "user" | "update" | "emailOutbox" | "emailPreference">;

// Same eligibility as queueFollowerEmails: no preference row, or one that is not
// unsubscribed, not bounced, and not "off". `weekly` and `as_it_happens` are treated alike,
// and nothing writes as_it_happens (#212).
const preferenceAllowsEmail = {
  OR: [
    { emailPreference: null },
    { emailPreference: { unsubscribedAt: null, bouncedAt: null, digestFrequency: { not: "off" } } },
  ],
} satisfies Prisma.UserWhereInput;

// The caller wraps this in one transaction (the route does), so the rows and the new
// `lastDigestAt` commit together or not at all.
//
// A fixed number of queries whatever the number of followers: one cohort read, one read of
// their updates, then three writes. Running it again the same day queues nothing: the
// window is then empty and the dedupe key is unique.
//
// The cohort read loads every digest-eligible follower and filters the weekday in code.
// That is fine at 1,500; revisit past about 20,000 (#212).
export async function queueDigests(
  db: DigestDb,
  now: Date,
  { linkSecret }: { linkSecret: string },
): Promise<{ cohort: number; queued: number }> {
  const { weekday, dayStart, key } = digestDay(now);

  const eligible = await db.user.findMany({
    where: {
      ...acceptsEmail("digest"),
      ...preferenceAllowsEmail,
      follows: { some: { idea: isPublic } },
    },
    select: {
      id: true,
      emailPreference: { select: { lastDigestAt: true } },
      follows: { where: { idea: isPublic }, select: { ideaId: true, createdAt: true } },
    },
  });
  const cohort = eligible.filter(({ id }) => digestWeekday(id) === weekday);
  if (cohort.length === 0) return { cohort: 0, queued: 0 };

  const windows = new Map(
    cohort.map((user) => [user.id, digestWindow(user.emailPreference?.lastDigestAt ?? null, dayStart)]),
  );
  const earliest = Math.min(...[...windows.values()].map(({ from }) => from.getTime()));
  const followedIdeaIds = [...new Set(cohort.flatMap(({ follows }) => follows.map(({ ideaId }) => ideaId)))];

  // Only public fields: never an update's author (publicUpdateSelect has none).
  const rows = await db.update.findMany({
    where: {
      ideaId: { in: followedIdeaIds },
      idea: isPublic,
      createdAt: { gte: new Date(earliest), lt: dayStart },
    },
    select: {
      ...publicUpdateSelect,
      ideaId: true,
      idea: { select: { number: true, title: true, boardId: true } },
    },
  });
  const updatesByIdea = new Map<string, DigestUpdate[]>();
  for (const row of rows) {
    // A public idea always has a number; the type is nullable because a pending one has none.
    if (row.idea.number === null) continue;
    const update: DigestUpdate = {
      ideaId: row.ideaId,
      ideaNumber: row.idea.number,
      ideaTitle: row.idea.title,
      boardId: row.idea.boardId as DigestUpdate["boardId"],
      kind: row.kind,
      body: row.body,
      createdAt: row.createdAt,
    };
    const list = updatesByIdea.get(row.ideaId);
    if (list) list.push(update);
    else updatesByIdea.set(row.ideaId, [update]);
  }

  const outbox: Prisma.EmailOutboxCreateManyInput[] = [];
  const withPreference: string[] = [];
  const withoutPreference: string[] = [];
  for (const user of cohort) {
    const window = windows.get(user.id);
    if (!window) continue;
    // An update posted before the student followed the idea is not news to include: a new
    // follower's first digest would otherwise reach back a week (#212).
    const digest = buildDigest(
      user.follows.flatMap(({ ideaId, createdAt: followedAt }) =>
        (updatesByIdea.get(ideaId) ?? []).filter((update) => update.createdAt >= followedAt),
      ),
      window,
    );
    // No news, no email, and nothing recorded: the next window still starts at the last digest.
    if (!digest) continue;

    outbox.push({
      userId: user.id,
      type: "digest",
      priority: DIGEST_PRIORITY,
      dedupeKey: digestDedupeKey(user.id, key),
      sendAfter: now,
      payload: digestPayloadSchema.parse({
        unsubscribeToken: signUnsubscribeToken(linkSecret, "digest", user.id),
        totalUpdates: digest.totalUpdates,
        moreIdeas: digest.moreIdeas,
        ideas: digest.ideas.map((idea) => ({
          ideaNumber: idea.ideaNumber,
          ideaTitle: idea.ideaTitle,
          boardId: idea.boardId,
          moreUpdates: idea.moreUpdates,
          updates: idea.updates.map(({ kind, body, postedAt }) => ({
            kind,
            body,
            postedAt: postedAt.toISOString(),
          })),
        })),
      }),
    });
    (user.emailPreference ? withPreference : withoutPreference).push(user.id);
  }
  if (outbox.length === 0) return { cohort: cohort.length, queued: 0 };

  const created = await db.emailOutbox.createMany({ data: outbox, skipDuplicates: true });
  // digest_weekday is written with the hash when the row is created, and never read for
  // routing: the hash is the one source of a student's day (#212).
  if (withoutPreference.length > 0) {
    await db.emailPreference.createMany({
      data: withoutPreference.map((userId) => ({
        userId,
        digestWeekday: digestWeekday(userId),
        lastDigestAt: dayStart,
      })),
      skipDuplicates: true,
    });
  }
  if (withPreference.length > 0) {
    await db.emailPreference.updateMany({
      where: { userId: { in: withPreference } },
      data: { lastDigestAt: dayStart },
    });
  }
  return { cohort: cohort.length, queued: created.count };
}
