import { z } from "zod";
import { BOARD_CODES, BOARDS } from "@/core/boards";
import { IDEA_STATUSES, STATUS_LABELS, type IdeaStatus } from "@/core/statuses";
import type { EmailMessage } from "./sendEmail";

// What a follower is emailed about (#101): pure, with no Prisma and no clock. The
// outbox (src/db/outbox.ts) queues and sends; this module names the event, builds
// its dedupe key, and renders the text.

export type IdeaEvent =
  | { kind: "status"; ideaId: string; status: IdeaStatus; waitingReason: string | null; changedAt: Date }
  | { kind: "update"; ideaId: string; updateId: string; body: string };

// Same priority as the digest: one email a day is the budget's smallest unit, not a rush.
export const IDEA_EVENT_PRIORITY = 3;

export function ideaEventKey(event: IdeaEvent): string {
  return event.kind === "status"
    ? `status:${event.ideaId}:${event.changedAt.getTime()}`
    : `update:${event.updateId}`;
}

// Unique in the outbox, so queuing the same event again for the same follower adds nothing.
export function ideaEventDedupeKey(event: IdeaEvent, userId: string): string {
  return `idea_event:${ideaEventKey(event)}:${userId}`;
}

const statusValues = IDEA_STATUSES as [IdeaStatus, ...IdeaStatus[]];
const boardValues = BOARD_CODES as [(typeof BOARD_CODES)[number], ...(typeof BOARD_CODES)[number][]];

// Strict, with no author or supporter field: an anonymous idea's email cannot reveal
// its author, and a stray key fails the parse instead of being stored.
export const ideaEventPayloadSchema = z.strictObject({
  ideaNumber: z.number().int(),
  ideaTitle: z.string(),
  boardId: z.enum(boardValues),
  event: z.discriminatedUnion("kind", [
    z.strictObject({
      kind: z.literal("status"),
      status: z.enum(statusValues),
      waitingReason: z.string().nullable(),
    }),
    z.strictObject({ kind: z.literal("update"), body: z.string() }),
  ]),
});

export type IdeaEventPayload = z.infer<typeof ideaEventPayloadSchema>;

// Plain text only. It promises nothing and ends with one line saying why it was sent.
export function renderIdeaEventEmail(payload: IdeaEventPayload, to: string, siteUrl: string): EmailMessage {
  const board = BOARDS[payload.boardId].name;
  const link = `See where it stands: ${siteUrl}/ideas/${payload.ideaNumber}`;
  const footer = "You get this email because you follow this idea.";
  const { event } = payload;

  if (event.kind === "update") {
    return {
      to,
      subject: `Proposal #${payload.ideaNumber}: new update`,
      text: [payload.ideaTitle, "", `The ${board} posted an update:`, event.body, "", link, "", footer].join(
        "\n",
      ),
    };
  }

  const label = STATUS_LABELS[event.status];
  const lines = [payload.ideaTitle, "", `The ${board} moved this idea to "${label}".`];
  if (event.status === "waiting" && event.waitingReason)
    lines.push(`Why it is on hold: ${event.waitingReason}`);
  lines.push("", link, "", footer);
  return { to, subject: `Proposal #${payload.ideaNumber}: ${label}`, text: lines.join("\n") };
}
