import type { BoardCode } from "@/core/boards";
import type { Prisma } from "@/generated/prisma/client";
import { isPublic } from "./ideaSelects";

// The Updates tab's read (#130): the in-progress ideas on the boards the viewer may update,
// each with its updates and its numbers from idea_stats. Never cached. Pair it with
// boardsFor(viewer, "manage_status"): the scope comes from permissions, never from a row.
type Db = Pick<Prisma.TransactionClient, "idea">;

// No `authorId` on an update: the tab shows what students read, not who wrote it. The
// follower count reaches only this leader page.
const updatableSelect = {
  id: true,
  number: true,
  title: true,
  boardId: true,
  statusChangedAt: true,
  board: { select: { updateCadenceDays: true } },
  stats: { select: { supportCount: true, followerCount: true, isStale: true, lastUpdateAt: true } },
  updates: {
    select: { id: true, kind: true, body: true, createdAt: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  },
} as const satisfies Prisma.IdeaSelect;

// Times are ISO strings, so the record crosses to the client as plain data.
export type UpdatableIdea = {
  id: string;
  number: number;
  title: string;
  boardId: BoardCode;
  statusChangedAt: string | null;
  cadenceDays: number;
  supportCount: number;
  followerCount: number;
  // The view's flag: in progress and past the board's cadence. It stays the rule.
  isStale: boolean;
  lastUpdateAt: string | null;
  // Newest first.
  updates: { id: string; kind: "board" | "check_in" | "system"; body: string; createdAt: string }[];
};

export async function listUpdatableIdeas(db: Db, boards: BoardCode[]): Promise<UpdatableIdea[]> {
  // A student or visitor has no board to update: no query at all.
  if (boards.length === 0) return [];

  const rows = await db.idea.findMany({
    where: { ...isPublic, status: "in_progress", boardId: { in: boards }, number: { not: null } },
    select: updatableSelect,
    orderBy: [{ number: "asc" }],
  });

  const ideas: UpdatableIdea[] = [];
  for (const row of rows) {
    // An approved idea has a number (the where clause says so); this narrows the type.
    if (row.number === null) continue;
    ideas.push({
      id: row.id,
      number: row.number,
      title: row.title,
      // Prisma types the board id as a string; boards are seeded with the five codes.
      boardId: row.boardId as BoardCode,
      statusChangedAt: row.statusChangedAt?.toISOString() ?? null,
      cadenceDays: row.board.updateCadenceDays,
      // Every approved idea has a stats row, so the defaults are never read.
      supportCount: row.stats?.supportCount ?? 0,
      followerCount: row.stats?.followerCount ?? 0,
      isStale: row.stats?.isStale ?? false,
      lastUpdateAt: row.stats?.lastUpdateAt?.toISOString() ?? null,
      updates: row.updates.map((u) => ({
        id: u.id,
        kind: u.kind,
        body: u.body,
        createdAt: u.createdAt.toISOString(),
      })),
    });
  }
  return ideas;
}
