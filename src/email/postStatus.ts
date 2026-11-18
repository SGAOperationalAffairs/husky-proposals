import { z } from "zod";
import { BOARD_CODES, BOARDS } from "@/core/boards";
import { IDEA_STATUSES, STATUS_LABELS, type IdeaStatus } from "@/core/statuses";
import type { IdeaEvent } from "./ideaEvent";
import type { EmailMessage } from "./sendEmail";

// What an author is emailed when a board changes the status of their idea (#211): pure,
// with no Prisma and no clock. Followers get the same event as an idea_event (#101); the
// author gets this one instead, so nobody gets two emails for one change.

export type PostStatusEvent = Extract<IdeaEvent, { kind: "status" }>;

// Priority 1, with decisions: it is news about the student's own post.
export const POST_STATUS_PRIORITY = 1;

// One email per idea and change time. The author is one person, so no user id is needed.
export function postStatusDedupeKey(event: PostStatusEvent): string {
  return `post_status:${event.ideaId}:${event.changedAt.getTime()}`;
}

const statusValues = IDEA_STATUSES as [IdeaStatus, ...IdeaStatus[]];
const boardValues = BOARD_CODES as [(typeof BOARD_CODES)[number], ...(typeof BOARD_CODES)[number][]];

// Strict, with no author field: a stray key fails the parse instead of being stored.
export const postStatusPayloadSchema = z.strictObject({
  ideaNumber: z.number().int(),
  ideaTitle: z.string(),
  boardId: z.enum(boardValues),
  status: z.enum(statusValues),
  waitingReason: z.string().nullable(),
});

export type PostStatusPayload = z.infer<typeof postStatusPayloadSchema>;

export function renderPostStatusEmail(payload: PostStatusPayload, to: string, siteUrl: string): EmailMessage {
  const board = BOARDS[payload.boardId].name;
  const label = STATUS_LABELS[payload.status];
  const lines = [payload.ideaTitle, "", `The ${board} moved your idea to "${label}".`];
  if (payload.status === "waiting" && payload.waitingReason)
    lines.push(`Why it is on hold: ${payload.waitingReason}`);
  lines.push(
    "",
    `See where it stands: ${siteUrl}/ideas/${payload.ideaNumber}`,
    "",
    "You get this email because you posted this idea.",
  );
  return { to, subject: `Proposal #${payload.ideaNumber}: ${label}`, text: lines.join("\n") };
}
