import { z } from "zod";
import type { IdeaCardData } from "@/components/IdeaCard";
import { BOARD_CODES, type BoardCode } from "@/core/boards";

// How the student lists filter and sort (#61, #63). Plain functions with no
// server code, so the browser filters the wall in place without asking the
// server again, and the server uses the same rules for the first render.

// The Ideas list shows ideas still open for support. In progress and delivered
// ideas have their own tab (#63), as in the prototype.
export const OPEN_STATUSES = ["collecting_support", "under_review", "waiting"] as const;
export type OpenStatus = (typeof OPEN_STATUSES)[number];

export const SORTS = { support: "Most supported", newest: "Newest", updated: "Recently updated" } as const;
export type Sort = keyof typeof SORTS;

export type IdeasQuery = { q?: string; board?: BoardCode; status?: OpenStatus; sort: Sort };

// Filters come from the URL, so anything can arrive. Unknown values are dropped,
// never an error: a stale or hand-edited link still shows the list.
const lenient = <T extends z.ZodType>(schema: T) => schema.optional().catch(undefined);
const querySchema = z.object({
  q: lenient(z.string().trim().max(100)).transform((q) => q || undefined),
  board: lenient(z.enum(BOARD_CODES as [BoardCode, ...BoardCode[]])),
  status: lenient(z.enum(OPEN_STATUSES)),
  sort: z.enum(Object.keys(SORTS) as [Sort, ...Sort[]]).catch("support"),
});

// The two student lists: ideas open for support, and ideas a board has taken
// on (#63). Only the open list filters by status.
export type IdeaList = "open" | "progress";

export function parseIdeasQuery(
  params: Record<string, string | string[] | undefined>,
  list: IdeaList = "open",
): IdeasQuery {
  const parsed = querySchema.parse(params);
  if (list === "progress") parsed.status = undefined;
  return Object.fromEntries(Object.entries(parsed).filter(([, v]) => v !== undefined)) as IdeasQuery;
}

export const isOpen = (status: IdeaCardData["status"]): status is OpenStatus =>
  (OPEN_STATUSES as readonly string[]).includes(status);

export function filterIdeas(
  ideas: IdeaCardData[],
  query: IdeasQuery,
  list: IdeaList = "open",
): IdeaCardData[] {
  const words = query.q?.toLowerCase().split(/\s+/) ?? [];
  const byText = (i: IdeaCardData) => {
    const text = `${i.title} ${i.description}`.toLowerCase();
    return words.every((w) => text.includes(w));
  };
  const order: Record<Sort, (a: IdeaCardData, b: IdeaCardData) => number> = {
    support: (a, b) => b.supportCount - a.supportCount,
    newest: (a, b) => b.number - a.number,
    updated: (a, b) => a.updatedDaysAgo - b.updatedDaysAgo,
  };
  return ideas
    .filter(
      (i) =>
        isOpen(i.status) === (list === "open") &&
        (!query.board || i.board === query.board) &&
        (!query.status || i.status === query.status) &&
        byText(i),
    )
    .sort(order[query.sort]);
}

// The URL for a list with these filters, so a filtered wall can be shared
// and Back returns to it. Defaults are left out to keep links short.
export function ideasHref(path: string, query: IdeasQuery) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.board) params.set("board", query.board);
  if (query.status) params.set("status", query.status);
  if (query.sort !== "support") params.set("sort", query.sort);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
