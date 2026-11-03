import type { IdeaCardData } from "@/components/IdeaCard";
import { BOARDS } from "@/core/boards";
import {
  COST_LABELS,
  SCALE_LABELS,
  TIME_LABELS,
  type CostBandValue,
  type IdeaScaleValue,
  type TimeHorizonValue,
} from "@/core/ideaFacts";
import type { PublicIdeaRecord } from "@/db/publicIdeas";
import type { IdeaPageData } from "./data";

// Turns a public record (src/db/publicIdeas.ts) into what the cards and the idea page
// draw (#60). Plain functions: `now` comes from the caller, never read here, so "updated
// N days ago" is worked out per request, outside the cache.

const DAY_MS = 24 * 60 * 60 * 1000;

// Whole days, floored, never negative.
function daysBetween(then: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(then).getTime()) / DAY_MS));
}

// The latest of the last update, the status change, and the approval.
function lastActivity({ idea, stats }: PublicIdeaRecord): string {
  const times = [stats.lastUpdateAt, idea.statusChangedAt, idea.approvedAt].filter(
    (time): time is string => time !== null,
  );
  if (times.length === 0) return idea.submittedAt;
  return times.reduce((latest, time) => (new Date(time) > new Date(latest) ? time : latest));
}

export function toCard(record: PublicIdeaRecord, now: Date): IdeaCardData {
  const { idea, stats } = record;
  return {
    number: idea.number,
    title: idea.title,
    description: idea.description,
    ...(idea.location ? { location: idea.location } : {}),
    board: idea.boardId,
    status: idea.status,
    ...(idea.fromSga ? { fromSga: true } : {}),
    updatedDaysAgo: daysBetween(lastActivity(record), now),
    supportCount: stats.supportCount,
    willingCount: stats.willingCount,
  };
}

// Labels for values a past release may not know: a value with no label reads as unset.
function labelled<K extends string>(labels: Record<K, string>, value: string | null): string | undefined {
  return value === null ? undefined : labels[value as K];
}

export function toPage(record: PublicIdeaRecord, now: Date): IdeaPageData {
  const { idea, stats } = record;
  const paragraphs = (idea.fullText ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const page: IdeaPageData = {
    ...toCard(record, now),
    proposedDaysAgo: daysBetween(idea.submittedAt, now),
    about: paragraphs.length > 0 ? paragraphs : [idea.description],
    scale: labelled<IdeaScaleValue>(SCALE_LABELS, idea.scale),
    cost: labelled<CostBandValue>(COST_LABELS, idea.costBand),
    timing: labelled<TimeHorizonValue>(TIME_LABELS, idea.timeHorizon),
    waitingReason: idea.status === "waiting" ? (idea.waitingReason ?? undefined) : undefined,
    updates: (record.updates ?? []).map((u) => ({ daysAgo: daysBetween(u.createdAt, now), text: u.body })),
    rank:
      stats.rankInBoard !== null && record.rankOf !== undefined
        ? { position: stats.rankInBoard, of: record.rankOf, board: BOARDS[idea.boardId].category }
        : undefined,
  };
  // The name is copied only when the shape gave one, so an anonymous post has no key.
  if (idea.authorName) page.author = idea.authorName;
  return page;
}
