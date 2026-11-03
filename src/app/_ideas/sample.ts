import type { IdeaCardData } from "@/components/IdeaCard";
import { BOARDS } from "@/core/boards";
import { IDEAS } from "@/playground/sample";
import type { IdeaPageData } from "./data";
import { filterIdeas, type IdeasQuery } from "./filter";

// The ideas pages' stand-in data (#61, #62): the playground's invented sample ideas, which
// hold public fields only. data.ts reads it only where usesSampleIdeas() says so, which
// is local and test with no DATABASE_URL (#60). Browser tests and agent worktrees run on it.

// Every public idea, for the wall to filter in the browser (#61, #55).
export function sampleListWall(): IdeaCardData[] {
  return IDEAS;
}

// The filtered list, for tests and for anything that needs it on the server.
export function listIdeas(query: IdeasQuery): IdeaCardData[] {
  return filterIdeas(IDEAS, query);
}

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

// Rank among the board's ideas that are not delivered (docs/data-model.md,
// "Derived values"). Ties share a rank. The database path reads it from idea_stats.
function rankOf(idea: IdeaCardData): IdeaPageData["rank"] {
  if (idea.status === "delivered") return undefined;
  const peers = IDEAS.filter((i) => i.board === idea.board && i.status !== "delivered");
  const position = 1 + peers.filter((i) => i.supportCount > idea.supportCount).length;
  return { position, of: peers.length, board: BOARDS[idea.board].category };
}

export function sampleGetIdea(number: number): IdeaPageData | undefined {
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
