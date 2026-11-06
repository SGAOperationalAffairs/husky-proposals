import type { PosterData } from "@/components/PosterLine";
import { daysAgoText } from "@/components/IdeaCard";
import type { BoardCode } from "@/core/boards";
import {
  COST_LABELS,
  SCALE_LABELS,
  TIME_LABELS,
  type CostBandValue,
  type IdeaScaleValue,
  type TimeHorizonValue,
} from "@/core/ideaFacts";
import { dueText, reviewerLabel } from "@/core/reviewText";
import type { LeaderIdea } from "@/core/viewerShapes";
import type { LeaderIdeaData } from "@/db/leaderIdea";
import type { ApprovedItemData, ReviewQueueItemData } from "@/db/reviewQueue";

// Leader rows as plain data for the client (#59): text and ISO-free strings, no Date.
// A name or email is copied only where the viewer shape carried one, so a hidden
// author never reaches the browser.
const DAY = 24 * 60 * 60 * 1000;
const wholeDaysAgo = (then: Date, now: Date) =>
  Math.max(0, Math.floor((now.getTime() - then.getTime()) / DAY));

export type ReviewRowData = {
  id: string;
  title: string;
  description: string;
  paragraphs: string[];
  boardId: BoardCode;
  facts: { term: string; value: string }[];
  sentText: string;
  due: { text: string; overdue: boolean };
  isAnonymous: boolean;
  poster: PosterData;
};

export type ApprovedRowData = {
  id: string;
  number: number;
  title: string;
  boardId: BoardCode;
  approvedText: string;
};

export type LeaderPanelData = {
  ideaId: string;
  number: number;
  boardId: BoardCode;
  mayTakeDown: boolean;
  reviewerLabel: string | null;
  poster: PosterData;
};

const NOT_SURE = "Not sure";

function posterOf(idea: LeaderIdea): PosterData {
  if (idea.author) {
    const { displayName: name, email } = idea.author;
    return idea.isAnonymous ? { kind: "anonymous_visible", name, email } : { kind: "named", name, email };
  }
  return idea.authorHidden ? { kind: "anonymous_hidden" } : { kind: "deleted" };
}

// Prisma gives these columns as plain strings; an unknown value reads as "Not sure".
function label<T extends string>(labels: Record<T, string>, value: string | null): string {
  return value !== null && value in labels ? labels[value as T] : NOT_SURE;
}

function paragraphsOf(fullText: string | null): string[] {
  return (fullText ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export function toReviewRow({ idea, dueAt }: ReviewQueueItemData, now: Date): ReviewRowData {
  return {
    id: idea.id,
    title: idea.title,
    description: idea.description,
    paragraphs: paragraphsOf(idea.fullText),
    boardId: idea.boardId,
    facts: [
      { term: "Scale", value: label<IdeaScaleValue>(SCALE_LABELS, idea.scale) },
      { term: "Rough cost", value: label<CostBandValue>(COST_LABELS, idea.costBand) },
      { term: "Timing", value: label<TimeHorizonValue>(TIME_LABELS, idea.timeHorizon) },
      { term: "Where", value: idea.location?.trim() || NOT_SURE },
    ],
    sentText: `Sent ${daysAgoText(wholeDaysAgo(idea.submittedAt, now))}`,
    due: dueText(dueAt, now),
    isAnonymous: idea.isAnonymous,
    poster: posterOf(idea),
  };
}

// A public idea always has a number (the isPublic filter and a database check); a row
// without one is a bad row, and failing loudly beats linking to nothing.
function publicNumber(idea: LeaderIdea): number {
  if (idea.number === null) throw new Error(`Approved idea ${idea.id} has no public number`);
  return idea.number;
}

export function toApprovedRow({ idea }: ApprovedItemData, now: Date): ApprovedRowData {
  return {
    id: idea.id,
    number: publicNumber(idea),
    title: idea.title,
    boardId: idea.boardId,
    approvedText: idea.approvedAt
      ? `Approved ${daysAgoText(wholeDaysAgo(idea.approvedAt, now))}`
      : "Approved recently",
  };
}

// `reviewBoards` is boardsFor(viewer, "review"). The badge shows only on a board the
// viewer reviews, which is exactly when they may take the idea down.
export function toLeaderPanel(
  { idea, mayTakeDown }: LeaderIdeaData,
  reviewBoards: BoardCode[],
): LeaderPanelData {
  return {
    ideaId: idea.id,
    number: publicNumber(idea),
    boardId: idea.boardId,
    mayTakeDown,
    reviewerLabel: mayTakeDown ? reviewerLabel(reviewBoards) : null,
    poster: posterOf(idea),
  };
}
