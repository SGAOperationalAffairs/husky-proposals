import type { BoardCode } from "./boards";
import { can, type Viewer } from "./permissions";
import type { IdeaStatus } from "./statuses";

// The SGA queue (#124): what a leader sees, what the tabs count, and how the
// list filters and sorts. Plain functions, so the rules are tested without a page.
// Who may see a row is decided by `can()` for the board, never by a row's fields
// alone: a chair sees their board, the VP sees all five.

export type QueueItem = {
  kind: "post" | "idea";
  number: number;
  title: string;
  boardId: BoardCode;
  // A pending post is "pending"; an approved idea has its idea status.
  status: IdeaStatus | "pending";
  supportCount: number;
  updatedDaysAgo: number;
  // Shown on a card (#139). Optional, so a row without one still renders.
  description?: string;
};

export const QUEUE_SORTS = {
  support: "Most supported",
  newest: "Newest",
  updated: "Recently updated",
} as const;
export type QueueSort = keyof typeof QUEUE_SORTS;

export type QueueQuery = { board?: BoardCode; status?: QueueItem["status"]; sort: QueueSort };

// A post is reviewed (`review`); an idea is run by its board (`manage_status`).
export function queueFor(viewer: Viewer, items: QueueItem[]): QueueItem[] {
  return items.filter((item) =>
    item.kind === "post" ? can(viewer, "review", item.boardId) : can(viewer, "manage_status", item.boardId),
  );
}

// The red count on the "To review" tab: pending posts only. Ideas do not badge,
// since a board's work on them is not waiting on a decision the same way.
export function attentionCount(items: QueueItem[]): number {
  return items.filter((item) => item.kind === "post").length;
}

// A pending post's support count is hidden, so the support order must not reveal it
// (#139): posts all rank as zero and fall back to newest, which the card shows.
// The post branch is deliberate defensive handling: pending posts never reach the Ideas tab today.
const visibleSupport = (item: QueueItem) => (item.kind === "post" ? 0 : item.supportCount);

const ORDER: Record<QueueSort, (a: QueueItem, b: QueueItem) => number> = {
  support: (a, b) => visibleSupport(b) - visibleSupport(a) || b.number - a.number,
  newest: (a, b) => b.number - a.number,
  updated: (a, b) => a.updatedDaysAgo - b.updatedDaysAgo,
};

export function filterQueue(items: QueueItem[], query: QueueQuery): QueueItem[] {
  return items
    .filter(
      (item) =>
        (!query.board || item.boardId === query.board) && (!query.status || item.status === query.status),
    )
    .sort(ORDER[query.sort]);
}

// The queue's view, from the URL (#139). The list is the default; cards only when
// asked for. Anything else, including a repeated parameter, falls back to the list.
export type QueueView = "list" | "cards";
export function parseQueueView(value: unknown): QueueView {
  return value === "cards" ? "cards" : "list";
}
