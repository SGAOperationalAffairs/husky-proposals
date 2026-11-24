import type { BoardCode } from "./boards";

// The weekly follower digest's rules (#212), plain: no Prisma, no clock, no Node. The
// queue pass (src/db/digest.ts) reads, and the email module (src/email/digest.ts) renders.

export const DIGEST_MAX_IDEAS = 10;
export const DIGEST_MAX_UPDATES_PER_IDEA = 3;
// An update longer than this is trimmed in the email, so one long post cannot fill it.
export const DIGEST_BODY_LIMIT = 300;

const DAY_MS = 24 * 60 * 60 * 1000;
// A missed daily run skips a cohort for a week; the next digest then covers both weeks.
// Past this, a student who turned the digest back on after months does not get months of news.
const MAX_WINDOW_DAYS = 14;
const DEFAULT_WINDOW_DAYS = 7;

// The student's weekday, 0 (Sunday) to 6, from a stable hash of their id: FNV-1a 32-bit,
// then the murmur3 fmix32 finalizer. The finalizer is there because SGAuth ids may look
// sequential, and plain FNV mod 7 can cluster them onto a few days. NEVER change this
// function: doing so moves every student to a different day.
export function digestWeekday(userId: string): number {
  let hash = 0x811c9dc5;
  for (const char of userId.toLowerCase()) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return (hash >>> 0) % 7;
}

// UTC on purpose: the run is at 13:00 UTC, where the UTC date is the Boston date. Changing
// this later moves every window edge once.
export function digestDay(now: Date): { weekday: number; dayStart: Date; key: string } {
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return { weekday: dayStart.getUTCDay(), dayStart, key: dayStart.toISOString().slice(0, 10) };
}

export type DigestWindow = { from: Date; to: Date };

// Half-open: `from <= createdAt < to`, where `to` is the start of today. The next digest
// starts at this one's `to` (it is stored as lastDigestAt), so no update is missed or repeated.
export function digestWindow(lastDigestAt: Date | null, dayStart: Date): DigestWindow {
  const earliest = dayStart.getTime() - MAX_WINDOW_DAYS * DAY_MS;
  const wanted = lastDigestAt?.getTime() ?? dayStart.getTime() - DEFAULT_WINDOW_DAYS * DAY_MS;
  return { from: new Date(Math.max(wanted, earliest)), to: dayStart };
}

export type DigestUpdate = {
  ideaId: string;
  ideaNumber: number;
  ideaTitle: string;
  boardId: BoardCode;
  kind: "board" | "check_in" | "system";
  body: string;
  createdAt: Date;
};

export type DigestIdea = {
  ideaNumber: number;
  ideaTitle: string;
  boardId: BoardCode;
  updates: { kind: DigestUpdate["kind"]; body: string; postedAt: Date }[];
  // Updates in the window that the email leaves out, beyond DIGEST_MAX_UPDATES_PER_IDEA.
  moreUpdates: number;
};

export type Digest = {
  ideas: DigestIdea[];
  // Ideas with news that the email leaves out, beyond DIGEST_MAX_IDEAS.
  moreIdeas: number;
  totalUpdates: number;
};

// What a student's digest holds: the updates in the window, grouped by idea, ideas ordered
// by their newest update, updates newest first, with the caps applied and what was left out
// counted. Null when nothing is in the window, which is how "no news, no email" is decided.
export function buildDigest(updates: readonly DigestUpdate[], window: DigestWindow): Digest | null {
  const inWindow = updates
    .filter(({ createdAt }) => createdAt >= window.from && createdAt < window.to)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  if (inWindow.length === 0) return null;

  // Insertion order is newest-first, since the list is sorted: the first update an idea
  // appears with is its newest.
  const byIdea = new Map<string, DigestUpdate[]>();
  for (const update of inWindow) {
    const group = byIdea.get(update.ideaId);
    if (group) group.push(update);
    else byIdea.set(update.ideaId, [update]);
  }

  const groups = [...byIdea.values()];
  const ideas = groups.slice(0, DIGEST_MAX_IDEAS).map((group): DigestIdea => {
    const [first] = group;
    if (!first) throw new Error("empty digest group");
    return {
      ideaNumber: first.ideaNumber,
      ideaTitle: first.ideaTitle,
      boardId: first.boardId,
      updates: group
        .slice(0, DIGEST_MAX_UPDATES_PER_IDEA)
        .map(({ kind, body, createdAt }) => ({ kind, body, postedAt: createdAt })),
      moreUpdates: Math.max(0, group.length - DIGEST_MAX_UPDATES_PER_IDEA),
    };
  });
  return {
    ideas,
    moreIdeas: Math.max(0, groups.length - DIGEST_MAX_IDEAS),
    totalUpdates: inWindow.length,
  };
}
