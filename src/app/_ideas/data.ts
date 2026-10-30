import { z } from "zod";
import type { IdeaCardData } from "@/components/IdeaCard";
import { BOARD_CODES, BOARDS, type BoardCode } from "@/core/boards";
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

const isOpen = (status: IdeaCardData["status"]): status is OpenStatus =>
  (OPEN_STATUSES as readonly string[]).includes(status);

export function listIdeas(query: IdeasQuery, list: IdeaList = "open"): IdeaCardData[] {
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
      isOpen(i.status) === (list === "open") &&
      (!query.board || i.board === query.board) &&
      (!query.status || i.status === query.status) &&
      byText(i),
  ).sort(order[query.sort]);
}

// The idea page (#62). The fields an idea's own page adds to its poster.
export type IdeaUpdate = { daysAgo: number; text: string };
export type IdeaPageData = IdeaCardData & {
  // Only when the post is not anonymous, and only the display name (docs/data-model.md, gap 6).
  author?: string;
  proposedDaysAgo: number;
  about: string[];
  scale?: string;
  cost?: string;
  timing?: string;
  // Students always see why a waiting idea waits (CLAUDE.md, "Honest status").
  waitingReason?: string;
  updates: IdeaUpdate[];
  rank?: { position: number; of: number; board: string };
};

type Extra = Omit<IdeaPageData, keyof IdeaCardData | "rank"> & { anonymous?: boolean; authorName?: string };

// Invented details for the sample ideas, in the prototype's words. Anything
// missing reads as "Not sure", the post form's default (#12).
const EXTRA: Record<number, Partial<Extra>> = {
  103: {
    authorName: "Avery K.",
    proposedDaysAgo: 62,
    about: [
      "Some students skip meals to stretch their budget. A pantry hosted by an existing campus office would make groceries and essentials easy to pick up, with no questions asked.",
      "The pilot would start with shelf-stable food and a weekly restock.",
    ],
    scale: "Large",
    cost: "$5k+",
    timing: "Within a year",
    updates: [
      { daysAgo: 2, text: "Began drafting a plan for the pilot with Student Life." },
      { daysAgo: 9, text: "The board started work on this idea." },
    ],
  },
  131: {
    authorName: "Jordan P.",
    proposedDaysAgo: 40,
    scale: "Medium",
    cost: "$5k+",
    timing: "Next semester",
  },
  140: {
    anonymous: true,
    proposedDaysAgo: 33,
    scale: "Small",
    cost: "$1k to $5k",
    waitingReason: "Waiting on university partners",
    updates: [{ daysAgo: 14, text: "Waiting on university partners." }],
  },
  151: { anonymous: true, proposedDaysAgo: 18, scale: "Small", cost: "Under $1k", timing: "This semester" },
  156: { authorName: "Sam R.", proposedDaysAgo: 12, scale: "Small", cost: "Under $1k" },
  165: {
    authorName: "Riley S.",
    proposedDaysAgo: 21,
    about: [
      "Takeout containers add up quickly. A reusable container program with a simple return system would reduce waste at dining locations.",
      "It would be a larger project that needs agreement from Dining Services on cleaning and returns.",
    ],
    scale: "Large",
    timing: "Within a year",
  },
};

// How to join each board, from the prototype. Board facts move to the database with #60.
export const JOIN: Record<
  BoardCode,
  { does: string; meets: string; time: string; seats: string; apply: string }
> = {
  DAB: {
    does: "It advises campus dining and takes on food access projects.",
    meets: "Weekly during the semester",
    time: "About 2 hours a week",
    seats: "2 open seats",
    apply: "Applications open about a month before each semester ends.",
  },
  CPAB: {
    does: "It works with campus planning and facilities on how spaces are used and changed.",
    meets: "Weekly during the semester",
    time: "About 2 hours a week",
    seats: "1 open seat",
    apply: "Applications open about a month before each semester ends.",
  },
  CSC: {
    does: "It works on campus services like recreation, transportation, and housing.",
    meets: "Weekly during the semester",
    time: "About 2 hours a week",
    seats: "2 open seats",
    apply: "Apply through SGA. The committee chair reviews applications.",
  },
  GIB: {
    does: "It funds and supports student sustainability projects.",
    meets: "Weekly during the semester",
    time: "About 2 hours a week",
    seats: "3 open seats",
    apply: "Apply through SGA. The board chair reviews applications.",
  },
  SC: {
    does: "It speaks up for sustainability on campus and works with campus offices.",
    meets: "Weekly during the semester",
    time: "About 2 hours a week",
    seats: "1 open seat",
    apply: "Apply through SGA. The committee chair reviews applications.",
  },
};

// Public numbers are positive whole numbers. Anything else is not an idea.
export function parseIdeasNumber(value: string): number | undefined {
  return /^[1-9]\d*$/.test(value) ? Number(value) : undefined;
}

// Rank among the board's ideas that are not delivered (docs/data-model.md,
// "Derived values"). Ties share a rank. #60 reads it from idea_stats.
function rankOf(idea: IdeaCardData): IdeaPageData["rank"] {
  if (idea.status === "delivered") return undefined;
  const peers = IDEAS.filter((i) => i.board === idea.board && i.status !== "delivered");
  const position = 1 + peers.filter((i) => i.supportCount > idea.supportCount).length;
  return { position, of: peers.length, board: BOARDS[idea.board].category };
}

export function getIdea(number: number): IdeaPageData | undefined {
  const idea = IDEAS.find((i) => i.number === number);
  if (!idea) return undefined;
  const { anonymous, authorName, ...extra } = EXTRA[number] ?? {};
  const page: IdeaPageData = {
    ...idea,
    proposedDaysAgo: extra.proposedDaysAgo ?? idea.updatedDaysAgo,
    about: extra.about ?? [idea.description],
    scale: extra.scale,
    cost: extra.cost,
    timing: extra.timing,
    waitingReason: extra.waitingReason,
    updates: extra.updates ?? [],
    rank: rankOf(idea),
  };
  // The name is copied only for a post that is not anonymous, so it cannot leak.
  if (!anonymous && authorName) page.author = authorName;
  return page;
}
