import { z } from "zod";
import { BOARD_CODES, BOARDS } from "@/core/boards";
import type { ReviewDecision, ReviewKind } from "@/core/review";
import type { EmailMessage } from "./sendEmail";

// What an author is emailed when a reviewer decides their post (#211): pure, with no
// Prisma and no clock, like ideaEvent.ts. The outbox queues and sends; this module names
// the event, builds its dedupe key, and renders the text. The recipient is never part of
// the payload: the outbox reads it from the idea's author.

export type PostDecision = "approved" | "declined" | "taken_down";

// A take-down is stored as a declined review of kind take_down, so the kind decides.
export function decisionKindOf({
  kind,
  decision,
}: {
  kind: ReviewKind;
  decision: ReviewDecision;
}): PostDecision {
  return kind === "take_down" ? "taken_down" : decision;
}

export type PostDecidedEvent = {
  ideaId: string;
  reviewId: string;
  decision: PostDecision;
  reason: string | null;
  decidedAt: Date;
};

// One email per decision, and priority 1: a student waiting on a decision is the email
// that matters most, so it goes first in each run.
export const POST_DECIDED_PRIORITY = 1;

// One review row per decision, so a take-down and a later re-approval each send one.
export function postDecidedDedupeKey(event: PostDecidedEvent): string {
  return `post_decided:${event.reviewId}`;
}

const boardValues = BOARD_CODES as [(typeof BOARD_CODES)[number], ...(typeof BOARD_CODES)[number][]];

// Strict, with no author, reviewer, or email field: a stray key fails the parse instead
// of being stored. The reason is only ever sent to the author who wrote the post.
export const postDecidedPayloadSchema = z
  .strictObject({
    ideaId: z.uuid(),
    ideaNumber: z.number().int().nullable(),
    ideaTitle: z.string(),
    boardId: z.enum(boardValues),
    isAnonymous: z.boolean(),
    event: z.discriminatedUnion("kind", [
      z.strictObject({ kind: z.literal("approved") }),
      z.strictObject({ kind: z.literal("declined"), reason: z.string().min(1) }),
      z.strictObject({ kind: z.literal("taken_down"), reason: z.string().min(1) }),
    ]),
  })
  // A post is public under its number, so an approval and a take-down always have one.
  // A first decline never had one.
  .refine((payload) => payload.event.kind === "declined" || payload.ideaNumber !== null, {
    message: "An approval or take-down needs the idea's number",
    path: ["ideaNumber"],
  });

export type PostDecidedPayload = z.infer<typeof postDecidedPayloadSchema>;

// Plain text. The wording matches the edit page ("Why it was not approved", "send it for
// review again"), and it promises nothing.
export function renderPostDecidedEmail(
  payload: PostDecidedPayload,
  to: string,
  siteUrl: string,
): EmailMessage {
  const board = BOARDS[payload.boardId].name;
  const { event, ideaNumber } = payload;
  const editLink = `${siteUrl}/me/ideas/${payload.ideaId}/edit`;
  const footer = ["", "You get this email because you posted this idea."];

  if (event.kind === "approved") {
    const lines = [
      payload.ideaTitle,
      "",
      `The ${board} approved your post. It is now on the ideas list as #${ideaNumber}.`,
    ];
    if (payload.isAnonymous) lines.push("Other students do not see your name.");
    lines.push(
      "Students can now support it and offer to help. Support helps SGA decide what to work on.",
      "",
      `See your idea: ${siteUrl}/ideas/${ideaNumber}`,
      ...footer,
    );
    return { to, subject: `Your post is approved: Proposal #${ideaNumber}`, text: lines.join("\n") };
  }

  if (event.kind === "declined") {
    return {
      to,
      subject: `Your post was not approved: ${payload.ideaTitle}`,
      text: [
        payload.ideaTitle,
        "",
        `The ${board} reviewed your post and did not approve it.`,
        "",
        "Why it was not approved:",
        event.reason,
        "",
        "Change what the reviewer asked for, then send it for review again:",
        editLink,
        ...footer,
      ].join("\n"),
    };
  }

  return {
    to,
    subject: `Proposal #${ideaNumber} was taken down`,
    text: [
      payload.ideaTitle,
      "",
      `The ${board} took your idea off the ideas list. Other students can no longer see it.`,
      "",
      "Why it was taken down:",
      event.reason,
      "",
      "You can edit it and send it for review again:",
      editLink,
      ...footer,
    ].join("\n"),
  };
}
