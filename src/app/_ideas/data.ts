import { cacheLife, cacheTag } from "next/cache";
import type { IdeaCardData } from "@/components/IdeaCard";
import { db } from "@/db/runtime";
import { publicIdeaQueries } from "@/db/publicIdeas";
import { env } from "@/env";
import { toCard, toPage } from "./present";
import { sampleGetIdea, sampleListWall } from "./sample";
import { usesSampleIdeas } from "./source";
import { IDEAS_TAG, ideaTag } from "./tags";

// The ideas pages' one entry (#60). The wall, the idea page, the poster, and the flyers
// call listWall() and getIdea(). Public reads are cached with named tags (tags.ts) and
// refreshed by refreshPublicIdea() when a writer changes an idea. Local and test with no
// DATABASE_URL read the sample instead (source.ts). Filtering lives in filter.ts.

// The fields an idea's own page adds to its poster (#62).
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

// The cached reads return plain data with ISO times. `now` is read outside them, after
// the caller's dynamic access, so "updated N days ago" never freezes in the cache.
// The hours backstop covers changes no writer has refreshed yet (support, until E6).
async function cachedList() {
  "use cache";
  cacheTag(IDEAS_TAG);
  cacheLife("hours");
  return publicIdeaQueries(db()).list();
}

async function cachedIdea(number: number) {
  "use cache";
  // Both tags, so an approval that refreshes the list refreshes every page too.
  cacheTag(IDEAS_TAG, ideaTag(number));
  cacheLife("hours");
  return publicIdeaQueries(db()).byNumber(number);
}

// Every public idea, for the wall to filter in the browser (#61, #55).
export async function listWall(): Promise<IdeaCardData[]> {
  if (usesSampleIdeas(env())) return sampleListWall();
  const records = await cachedList();
  const now = new Date();
  return records.map((record) => toCard(record, now));
}

export async function getIdea(number: number): Promise<IdeaPageData | undefined> {
  if (usesSampleIdeas(env())) return sampleGetIdea(number);
  const record = await cachedIdea(number);
  return record ? toPage(record, new Date()) : undefined;
}

// Public numbers are positive whole numbers. Anything else is not an idea.
export function parseIdeasNumber(value: string): number | undefined {
  return /^[1-9]\d*$/.test(value) ? Number(value) : undefined;
}
