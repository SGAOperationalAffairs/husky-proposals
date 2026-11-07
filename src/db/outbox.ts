import {
  IDEA_EVENT_PRIORITY,
  ideaEventDedupeKey,
  ideaEventPayloadSchema,
  renderIdeaEventEmail,
  type IdeaEvent,
} from "@/email/ideaEvent";
import { sendEmail, type Mailer } from "@/email/sendEmail";
import type { Prisma } from "@/generated/prisma/client";
import { claimOutboxBatch, MAX_ATTEMPTS } from "./sql/claimOutboxBatch";

// The email outbox (#101): rows are written in the caller's transaction, and a drain
// sends them. Nothing calls the drain on a schedule yet (a later E9 ticket).

const MINUTE = 60 * 1000;
// A claim holds a row this long. A worker that dies mid-send frees it after this.
const CLAIM_MS = 10 * MINUTE;
const BACKOFF_MS = 5 * MINUTE;
const MAX_ERROR_LENGTH = 500;
// The types this drain can render. Only idea_event has a renderer in this ticket; each
// later type adds itself here with its renderer, so its rows wait unclaimed until then.
const RENDERABLE_TYPES = ["idea_event"] as const;

type QueueDb = Pick<Prisma.TransactionClient, "idea" | "emailOutbox">;

// Writes one idea_event row per eligible follower, in the caller's transaction, so the
// rows commit with the change that caused them.
//
// Caller contract: starting or delivering an idea changes the status and also writes a
// system update. Pass only the status event, so followers get one email for it, not two.
//
// Two queries however many followers there are: one read of the idea and its eligible
// followers, and one createMany. Eligibility is checked now, at queue time only.
export async function queueFollowerEmails(tx: QueueDb, event: IdeaEvent): Promise<{ queued: number }> {
  const idea = await tx.idea.findUnique({
    where: { id: event.ideaId },
    select: {
      number: true,
      title: true,
      boardId: true,
      reviewStatus: true,
      follows: {
        where: {
          user: {
            emailStoppedAt: null,
            OR: [
              { emailPreference: null },
              { emailPreference: { unsubscribedAt: null, bouncedAt: null, digestFrequency: { not: "off" } } },
            ],
          },
        },
        select: { userId: true },
      },
    },
  });
  // Queuing for a post that is not public is a programming error, not a student's mistake.
  if (!idea || idea.reviewStatus !== "approved" || idea.number === null) {
    throw new Error(`Cannot queue follower email: idea ${event.ideaId} is not approved`);
  }

  const payload = ideaEventPayloadSchema.parse({
    ideaNumber: idea.number,
    ideaTitle: idea.title,
    boardId: idea.boardId,
    event:
      event.kind === "status"
        ? { kind: "status", status: event.status, waitingReason: event.waitingReason }
        : { kind: "update", body: event.body },
  });

  const result = await tx.emailOutbox.createMany({
    data: idea.follows.map(({ userId }) => ({
      userId,
      type: "idea_event" as const,
      priority: IDEA_EVENT_PRIORITY,
      dedupeKey: ideaEventDedupeKey(event, userId),
      payload,
      ...(event.kind === "status" ? { sendAfter: event.changedAt } : {}),
    })),
    // The dedupe key is unique, so a retry of the same event queues nothing new.
    skipDuplicates: true,
  });
  return { queued: result.count };
}

type DrainDb = Pick<Prisma.TransactionClient, "$queryRaw" | "user" | "emailOutbox">;

// Claims a batch and sends each row through sendEmail(). A row is marked sent only after
// the provider returns an id. A failure is recorded and retried by a later drain after a
// backoff, up to MAX_ATTEMPTS. Rows are never deleted.
export async function drainOutbox(
  db: DrainDb,
  mailer: Mailer,
  now: Date,
  { siteUrl, limit = 50 }: { siteUrl: string; limit?: number },
): Promise<{ sent: number; failed: number }> {
  const claimed = await claimOutboxBatch(db, { now, limit, lockFor: CLAIM_MS, types: RENDERABLE_TYPES });
  if (claimed.length === 0) return { sent: 0, failed: 0 };

  const users = await db.user.findMany({
    where: { id: { in: [...new Set(claimed.map((row) => row.userId))] } },
    select: { id: true, email: true },
  });
  const emails = new Map(users.map((user) => [user.id, user.email]));

  let sent = 0;
  let failed = 0;
  for (const row of claimed) {
    const fail = async (message: string, retryAfterMs: number | null, permanent = false) => {
      failed += 1;
      await db.emailOutbox.update({
        where: { id: row.id },
        data: {
          lastError: message.slice(0, MAX_ERROR_LENGTH),
          lockedUntil: retryAfterMs === null ? null : new Date(now.getTime() + retryAfterMs),
          ...(permanent ? { attempts: MAX_ATTEMPTS } : {}),
        },
      });
    };

    const to = emails.get(row.userId);
    const payload = ideaEventPayloadSchema.safeParse(row.payload);
    // Permanent failures: a retry cannot fix them, so the row stops at once for a human.
    if (!to || !payload.success) {
      await fail(to ? "invalid payload" : "no recipient", null, true);
      continue;
    }

    try {
      const { providerMessageId } = await sendEmail(mailer, renderIdeaEventEmail(payload.data, to, siteUrl));
      await db.emailOutbox.update({
        where: { id: row.id },
        data: { sentAt: now, providerMessageId, lockedUntil: null, lastError: null },
      });
      sent += 1;
    } catch (error) {
      await fail(error instanceof Error ? error.message : String(error), BACKOFF_MS * row.attempts);
    }
  }
  return { sent, failed };
}
