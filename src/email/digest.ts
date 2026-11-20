import { z } from "zod";
import { BOARD_CODES, BOARDS } from "@/core/boards";
import { DIGEST_BODY_LIMIT } from "@/core/digest";
import { digestFooter } from "./footers";
import type { EmailMessage } from "./sendEmail";
import { unsubscribeUrl } from "./unsubscribeToken";

// The weekly follower digest (#212), pure: no Prisma and no clock. src/db/digest.ts queues
// it, the outbox drain sends it, and this module names its priority and dedupe key and
// renders the text.

// Same priority as the follower email: the digest is never a rush (schema, EmailOutbox).
export const DIGEST_PRIORITY = 3;

// One digest per student per UTC day, so a rerun or two overlapping runs queue one row.
export const digestDedupeKey = (userId: string, dayKey: string): string => `digest:${userId}:${dayKey}`;

const boardValues = BOARD_CODES as [(typeof BOARD_CODES)[number], ...(typeof BOARD_CODES)[number][]];

// Strict, with no author, supporter, or email field: an anonymous idea's digest cannot
// reveal its author, and a stray key fails the parse instead of being stored.
export const digestPayloadSchema = z.strictObject({
  unsubscribeToken: z.string().min(1),
  totalUpdates: z.number().int().min(1),
  moreIdeas: z.number().int().min(0),
  ideas: z
    .array(
      z.strictObject({
        ideaNumber: z.number().int(),
        ideaTitle: z.string(),
        boardId: z.enum(boardValues),
        moreUpdates: z.number().int().min(0),
        updates: z
          .array(
            z.strictObject({
              kind: z.enum(["board", "check_in", "system"]),
              body: z.string(),
              postedAt: z.iso.datetime(),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
});

export type DigestPayload = z.infer<typeof digestPayloadSchema>;

const dateFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "America/New_York",
});

const trim = (body: string): string =>
  body.length <= DIGEST_BODY_LIMIT ? body : `${body.slice(0, DIGEST_BODY_LIMIT - 3).trimEnd()}...`;

const plural = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`;

// Plain text only. It promises nothing, shows no names, and ends with the way to stop it.
export function renderDigestEmail(payload: DigestPayload, to: string, siteUrl: string): EmailMessage {
  const lines = ["Here is what changed on ideas you follow since your last digest."];

  for (const idea of payload.ideas) {
    lines.push(
      "",
      `Proposal #${idea.ideaNumber}: ${idea.ideaTitle}`,
      BOARDS[idea.boardId].name,
      ...idea.updates.map(
        (update) => `${dateFormat.format(new Date(update.postedAt))}: ${trim(update.body)}`,
      ),
    );
    if (idea.moreUpdates > 0) lines.push(`And ${plural(idea.moreUpdates, "more update", "more updates")}.`);
    lines.push(`See where it stands: ${siteUrl}/ideas/${idea.ideaNumber}`);
  }
  if (payload.moreIdeas > 0) {
    lines.push("", `And ${plural(payload.moreIdeas, "more idea", "more ideas")} with news.`);
  }

  const footer = digestFooter(siteUrl, unsubscribeUrl(siteUrl, payload.unsubscribeToken));
  lines.push("", ...footer);
  return {
    to,
    subject: `Your weekly digest: ${plural(payload.totalUpdates, "update", "updates")} on ideas you follow`,
    text: lines.join("\n"),
  };
}
