import { z } from "zod";
import type { IdeaCardData } from "@/components/IdeaCard";
import { BOARD_CODES, type BoardCode } from "@/core/boards";
import { IDEAS } from "@/playground/sample";

// Stand-in for the public ideas query (#60), so the ideas list (#61) can be
// built before the database exists. It reads the playground's invented sample
// ideas, which hold public fields only. #60 replaces this file; the page keeps
// calling listIdeas() and parseIdeasQuery().

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

export function parseIdeasQuery(params: Record<string, string | string[] | undefined>): IdeasQuery {
  const parsed = querySchema.parse(params);
  return Object.fromEntries(Object.entries(parsed).filter(([, v]) => v !== undefined)) as IdeasQuery;
}

const isOpen = (status: IdeaCardData["status"]): status is OpenStatus =>
  (OPEN_STATUSES as readonly string[]).includes(status);

export function listIdeas(query: IdeasQuery): IdeaCardData[] {
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
  return IDEAS.filter(
    (i) =>
      isOpen(i.status) &&
      (!query.board || i.board === query.board) &&
      (!query.status || i.status === query.status) &&
      byText(i),
  ).sort(order[query.sort]);
}
