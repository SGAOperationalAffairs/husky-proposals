import { digestPayloadSchema, renderDigestEmail } from "@/email/digest";
import {
  IDEA_EVENT_PRIORITY,
  ideaEventDedupeKey,
  ideaEventPayloadSchema,
  renderIdeaEventEmail,
  type IdeaEvent,
} from "@/email/ideaEvent";
import {
  POST_DECIDED_PRIORITY,
  postDecidedDedupeKey,
  postDecidedPayloadSchema,
  renderPostDecidedEmail,
  type PostDecidedEvent,
} from "@/email/postDecided";
import {
  POST_STATUS_PRIORITY,
  postStatusDedupeKey,
  postStatusPayloadSchema,
  renderPostStatusEmail,
  type PostStatusEvent,
} from "@/email/postStatus";
import { sendEmail, throttledFor, type EmailMessage, type Mailer } from "@/email/sendEmail";
import type { EmailType, Prisma } from "@/generated/prisma/client";
import {
  acceptsEmail,
  emailPermissionSelect,
  emailPreferenceSelect,
  followerPreferenceWhere,
  preferenceAllowsFollowerEmail,
  userAcceptsEmail,
} from "./emailFilters";
import { claimOutboxBatch, MAX_ATTEMPTS } from "./sql/claimOutboxBatch";

// The email outbox (#101): rows are written in the caller's transaction, and a drain
// sends them. /api/jobs/send-email calls the drain on a schedule (#210).

const MINUTE = 60 * 1000;
// A claim holds a row this long. A worker that dies mid-send frees it after this.
const CLAIM_MS = 10 * MINUTE;
const BACKOFF_MS = 5 * MINUTE;
const MAX_ERROR_LENGTH = 500;

type QueueDb = Pick<Prisma.TransactionClient, "idea" | "emailOutbox">;

// Writes one idea_event row per eligible follower, in the caller's transaction, so the
// rows commit with the change that caused them.
//
// Caller contract: starting or delivering an idea changes the status and also writes a
// system update. Pass only the status event, so followers get one email for it, not two.
//
// The author is left out of a status change's followers: they get a post_status email for
// it instead (queuePostStatusEmail), so an author who follows their own idea gets one
// email per change, not two (#211).
//
// Two queries however many followers there are: one read of the idea and its eligible
// followers, and one createMany. Eligibility is checked now, at queue time, and again at
// send (drainOutbox).
export async function queueFollowerEmails(tx: QueueDb, event: IdeaEvent): Promise<{ queued: number }> {
  const idea = await tx.idea.findUnique({
    where: { id: event.ideaId },
    select: {
      number: true,
      title: true,
      boardId: true,
      reviewStatus: true,
      authorId: true,
      follows: {
        where: {
          user: { ...acceptsEmail("idea_event"), ...followerPreferenceWhere },
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
        ? {
            kind: "status",
            status: event.status,
            waitingReason: event.waitingReason,
            ...(event.closedReason ? { closedReason: event.closedReason } : {}),
          }
        : { kind: "update", body: event.body },
  });

  const followers = idea.follows.filter(({ userId }) => event.kind !== "status" || userId !== idea.authorId);
  const result = await tx.emailOutbox.createMany({
    data: followers.map(({ userId }) => ({
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

// The idea and its author, for an email about the author's own post, in one query. The
// recipient is always the idea's author, read here and never passed in (#211): that is
// what keeps a post's decision from ever reaching anyone else. `recipient` is null when
// there is nobody to email: the author's account is gone (D14), stopped, or turned this
// type off. A missing idea is a programming error and throws, as queueFollowerEmails does.
async function readAuthor(tx: QueueDb, ideaId: string, type: EmailType) {
  const idea = await tx.idea.findUnique({
    where: { id: ideaId },
    select: {
      number: true,
      title: true,
      boardId: true,
      reviewStatus: true,
      isAnonymous: true,
      authorId: true,
      // A to-one relation cannot be filtered in a select, so the same rule runs in code.
      author: { select: emailPermissionSelect },
    },
  });
  if (!idea) throw new Error(`Cannot queue email about own post: idea ${ideaId} not found`);
  const recipient =
    idea.authorId && idea.author && userAcceptsEmail(idea.author, type) ? idea.authorId : null;
  return { idea, recipient };
}

// One post_decided row for the idea's author, in the review's own transaction (#211).
// `sendAfter` is the decision time, set explicitly because the column's default is the
// database clock, which a test with a fixed time would never reach.
export async function queueDecisionEmail(tx: QueueDb, event: PostDecidedEvent): Promise<{ queued: number }> {
  const { idea, recipient } = await readAuthor(tx, event.ideaId, "post_decided");
  if (!recipient) return { queued: 0 };

  const payload = postDecidedPayloadSchema.parse({
    ideaId: event.ideaId,
    ideaNumber: idea.number,
    ideaTitle: idea.title,
    boardId: idea.boardId,
    isAnonymous: idea.isAnonymous,
    event:
      event.decision === "approved"
        ? { kind: "approved" }
        : { kind: event.decision, reason: event.reason ?? "" },
  });
  const result = await tx.emailOutbox.createMany({
    data: [
      {
        userId: recipient,
        type: "post_decided",
        priority: POST_DECIDED_PRIORITY,
        dedupeKey: postDecidedDedupeKey(event),
        payload,
        sendAfter: event.decidedAt,
      },
    ],
    skipDuplicates: true,
  });
  return { queued: result.count };
}

// One post_status row for the idea's author, in the status change's own transaction (#211).
export async function queuePostStatusEmail(tx: QueueDb, event: PostStatusEvent): Promise<{ queued: number }> {
  const { idea, recipient } = await readAuthor(tx, event.ideaId, "post_status");
  if (idea.reviewStatus !== "approved" || idea.number === null) {
    throw new Error(`Cannot queue post status email: idea ${event.ideaId} is not approved`);
  }
  if (!recipient) return { queued: 0 };

  const payload = postStatusPayloadSchema.parse({
    ideaNumber: idea.number,
    ideaTitle: idea.title,
    boardId: idea.boardId,
    status: event.status,
    waitingReason: event.waitingReason,
  });
  const result = await tx.emailOutbox.createMany({
    data: [
      {
        userId: recipient,
        type: "post_status",
        priority: POST_STATUS_PRIORITY,
        dedupeKey: postStatusDedupeKey(event),
        payload,
        sendAfter: event.changedAt,
      },
    ],
    skipDuplicates: true,
  });
  return { queued: result.count };
}

// What the drain can render, by type. A null result is an invalid payload. A type with no
// entry is never claimed, so its rows wait unclaimed and burn no attempt until it has one.
type Renderer = (payload: unknown, to: string, siteUrl: string) => EmailMessage | null;

const RENDERERS = {
  idea_event: (payload, to, siteUrl) => {
    const parsed = ideaEventPayloadSchema.safeParse(payload);
    return parsed.success ? renderIdeaEventEmail(parsed.data, to, siteUrl) : null;
  },
  post_decided: (payload, to, siteUrl) => {
    const parsed = postDecidedPayloadSchema.safeParse(payload);
    return parsed.success ? renderPostDecidedEmail(parsed.data, to, siteUrl) : null;
  },
  post_status: (payload, to, siteUrl) => {
    const parsed = postStatusPayloadSchema.safeParse(payload);
    return parsed.success ? renderPostStatusEmail(parsed.data, to, siteUrl) : null;
  },
  // Queued by queueDigests (src/db/digest.ts, #212). The drain's send-time checks cover a
  // student who turned the digest off after it was queued.
  digest: (payload, to, siteUrl) => {
    const parsed = digestPayloadSchema.safeParse(payload);
    return parsed.success ? renderDigestEmail(parsed.data, to, siteUrl) : null;
  },
} as const satisfies Partial<Record<EmailType, Renderer>>;

type RenderableType = keyof typeof RENDERERS;
const RENDERABLE_TYPES = Object.keys(RENDERERS) as RenderableType[];
const isRenderable = (type: string): type is RenderableType => Object.hasOwn(RENDERERS, type);

type DrainDb = Pick<Prisma.TransactionClient, "$queryRaw" | "user" | "emailOutbox">;

// Claims a batch and sends each row through sendEmail(). A row is marked sent only after
// the provider returns an id. A failure is recorded and retried by a later drain after a
// backoff, up to MAX_ATTEMPTS. Rows are never deleted.
export async function drainOutbox(
  db: DrainDb,
  mailer: Mailer,
  now: Date,
  { siteUrl, limit = 50, pace }: { siteUrl: string; limit?: number; pace?: () => Promise<void> },
): Promise<{ sent: number; failed: number; deferred: number }> {
  const claimed = await claimOutboxBatch(db, { now, limit, lockFor: CLAIM_MS, types: RENDERABLE_TYPES });
  if (claimed.length === 0) return { sent: 0, failed: 0, deferred: 0 };

  const users = await db.user.findMany({
    where: { id: { in: [...new Set(claimed.map((row) => row.userId))] } },
    select: {
      id: true,
      email: true,
      ...emailPermissionSelect,
      emailPreference: { select: emailPreferenceSelect },
    },
  });
  const byId = new Map(users.map((user) => [user.id, user]));

  let sent = 0;
  let failed = 0;
  let mailerCalls = 0;
  for (const [index, row] of claimed.entries()) {
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

    const user = byId.get(row.userId);
    // Permanent failures: a retry cannot fix them, so the row stops at once for a human.
    if (!user) {
      await fail("no recipient", null, true);
      continue;
    }
    // A bounce or complaint stops the account (#209), so mail queued before it is not sent.
    if (user.emailStoppedAt !== null) {
      await fail("email stopped", null, true);
      continue;
    }
    // Turning a type off after a row was queued is honored too (#211).
    if (!userAcceptsEmail(user, row.type as EmailType)) {
      await fail("turned off", null, true);
      continue;
    }
    // A follower who unsubscribed, bounced, or turned the digest off after the row was
    // queued is not emailed (#257). Only idea_event rows are gated at queue time, so only
    // they are gated here.
    if (row.type === "idea_event" && !preferenceAllowsFollowerEmail(user.emailPreference)) {
      await fail("unsubscribed", null, true);
      continue;
    }
    const message = isRenderable(row.type) ? RENDERERS[row.type](row.payload, user.email, siteUrl) : null;
    if (!message) {
      await fail("invalid payload", null, true);
      continue;
    }

    // Only a send that reaches the provider is paced, so rows that fail early cost no wait.
    if (pace && mailerCalls > 0) await pace();
    mailerCalls += 1;
    // The try wraps only the send. Writing the sent time is a separate step below, because
    // a failed write after a successful send must never reach the backoff path: that would
    // reschedule an email the provider already has (#257).
    let providerMessageId: string;
    try {
      ({ providerMessageId } = await sendEmail(mailer, message));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const throttle = throttledFor(error);
      if (throttle === null) {
        await fail(reason, BACKOFF_MS * row.attempts);
        continue;
      }
      // A limit delays email and never drops it (T2.2): release this row and the rest of
      // the batch without counting the attempt the claim added, or five throttled runs
      // would kill a row. Only the row that hit the limit keeps the error.
      const rest = claimed.slice(index);
      const until = new Date(now.getTime() + throttle);
      await db.emailOutbox.updateMany({
        where: { id: { in: rest.map((released) => released.id) } },
        data: { attempts: { decrement: 1 }, lockedUntil: until },
      });
      await db.emailOutbox.update({
        where: { id: row.id },
        data: { lastError: reason.slice(0, MAX_ERROR_LENGTH) },
      });
      return { sent, failed, deferred: rest.length };
    }
    await markSent(db, row.id, providerMessageId, now);
    sent += 1;
  }
  return { sent, failed, deferred: 0 };
}

// Writes the sent time of a row the provider accepted, with one retry. If both writes fail
// the batch stops: the error is thrown, never turned into a retry of the send. The rest of
// the claimed rows keep their claim and free themselves after CLAIM_MS, as if the worker
// had crashed, because a database that rejects two writes in a row should not get more
// sends (#257). The job route reports the throw as a failed run.
async function markSent(db: DrainDb, rowId: string, providerMessageId: string, now: Date): Promise<void> {
  const write = () =>
    db.emailOutbox.update({
      where: { id: rowId },
      data: { sentAt: now, providerMessageId, lockedUntil: null, lastError: null },
    });
  try {
    await write();
    return;
  } catch {
    // One retry below; a second failure is the one reported.
  }
  try {
    await write();
  } catch (cause) {
    throw new Error(`Sent outbox row ${rowId} as ${providerMessageId} but could not mark it sent`, { cause });
  }
}
