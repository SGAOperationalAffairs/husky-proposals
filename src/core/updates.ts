import { z } from "zod";
import { dueText } from "./reviewText";

// Board updates and the update cadence (#130): the templates, the body rules, the input
// schema, and the words for "due for an update". Plain functions with no clock and no
// framework. What an update writes and who may post one is src/app/_updates/ (#130).

const DAY = 24 * 60 * 60 * 1000;

// What a leader starts from. The brackets mark what they must fill in (hasPlaceholder).
export const UPDATE_TEMPLATES = [
  {
    id: "formed",
    label: "Committee formed",
    text: "The board has formed a committee to work on this. We will share the first meeting date soon.",
  },
  {
    id: "met",
    label: "Meeting held",
    text: "The board committee met this week. We reviewed the plan and agreed on next steps: [add the steps].",
  },
  { id: "mile", label: "Milestone reached", text: "We reached a milestone: [describe it]." },
  {
    id: "late",
    label: "Delayed",
    text: "This is taking longer than planned because [reason]. New expected timing: [date].",
  },
  { id: "custom", label: "Write my own", text: "" },
] as const;

export type UpdateTemplateId = (typeof UPDATE_TEMPLATES)[number]["id"];

// The one-tap "Still working, no news" update. It counts toward the cadence.
export const CHECK_IN_BODY = "Still working, no news.";

export const UPDATE_BODY_MAX = 1000;

// True while a template's [bracket] is still in the text, so it never posts unedited.
export function hasPlaceholder(body: string): boolean {
  return /\[[^\]]*\]/.test(body);
}

export const postUpdateInputSchema = z.object({
  ideaId: z.uuid(),
  kind: z.enum(["board", "check_in"]),
  body: z.string().optional(),
});

type CountingUpdate = { kind: "board" | "check_in" | "system"; createdAt: Date };

// When the next update is due: the later of the start of work and the newest board or
// check-in update, plus the board's cadence. System updates are ignored, as idea_stats.sql
// ignores them. Null when there is no counting activity at all.
export function cadenceDueAt({
  statusChangedAt,
  updates,
  cadenceDays,
}: {
  statusChangedAt: Date | null;
  updates: CountingUpdate[];
  cadenceDays: number;
}): Date | null {
  const times = updates.filter((u) => u.kind !== "system").map((u) => u.createdAt.getTime());
  if (statusChangedAt) times.push(statusChangedAt.getTime());
  if (times.length === 0) return null;
  return new Date(Math.max(...times) + cadenceDays * DAY);
}

// The chip's words. `isStale` is the database view's flag and stays the rule; the date only
// supplies the number of days. A flagged idea whose day count is not negative (it went stale
// earlier today) reads "Due today", never "Due in 2 days".
export function cadenceFlag(
  dueAt: Date | null,
  isStale: boolean,
  now: Date,
): { text: string; due: boolean } {
  if (!dueAt) return { text: "Due today", due: isStale };
  const { text, overdue } = dueText(dueAt, now);
  if (isStale && !overdue) return { text: "Due today", due: true };
  return { text, due: isStale };
}

// "Next one due in 30 days." for the toast after a post.
export function nextDueText(cadenceDays: number, now: Date): string {
  const { text } = dueText(new Date(now.getTime() + cadenceDays * DAY), now);
  return `Next one ${text.charAt(0).toLowerCase()}${text.slice(1)}.`;
}
