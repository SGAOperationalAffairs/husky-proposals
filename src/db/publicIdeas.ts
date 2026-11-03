import { BOARD_CODES, type BoardCode } from "@/core/boards";
import type { IdeaStatus } from "@/core/statuses";
import { ideaForViewer, type IdeaRow, type StudentIdea } from "@/core/viewerShapes";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { isPublic, publicStatsSelect, publicUpdateSelect, studentIdeaSelect } from "./ideaSelects";

// The public reads behind the ideas wall and the idea page (#60). Anyone may see these,
// so every idea goes through ideaForViewer(null, row), the one viewer-shape function:
// the student shape decides each idea field, and the stats and update selects carry no
// identity. Counts and rank come from the idea_stats view, never from app code.
//
// Results are plain data with times as ISO strings, so they cross `use cache` cleanly
// (src/app/_ideas/data.ts). A client or a transaction both work, like prismaPostStore.

type Db = Pick<PrismaClient, "idea" | "ideaStats">;

type WithIsoTimes<T> = Omit<T, "submittedAt" | "approvedAt" | "statusChangedAt" | "deliveredAt"> & {
  submittedAt: string;
  approvedAt: string | null;
  statusChangedAt: string | null;
  deliveredAt: string | null;
};

// A public idea always has a number and a status: the query below selects only those.
export type PublicIdea = WithIsoTimes<Omit<StudentIdea, "number" | "status">> & {
  number: number;
  status: IdeaStatus;
};

export type PublicStats = {
  supportCount: number;
  willingCount: number;
  rankInBoard: number | null;
  lastUpdateAt: string | null;
};

export type PublicUpdate = { kind: "board" | "check_in" | "system"; body: string; createdAt: string };

export type PublicIdeaRecord = {
  idea: PublicIdea;
  stats: PublicStats;
  // The idea page only.
  updates?: PublicUpdate[];
  // How many ideas on the board have a rank, for "Ranked 1 of 3".
  rankOf?: number;
};

const iso = (date: Date): string => date.toISOString();
const isoOrNull = (date: Date | null): string | null => (date ? iso(date) : null);

// A board code the app does not know is a data bug: fail loudly, never drop the idea.
function boardCode(value: string): BoardCode {
  const code = BOARD_CODES.find((c) => c === value);
  if (!code) throw new Error(`Unknown board code "${value}" on a public idea (#60).`);
  return code;
}

const publicWhere = { ...isPublic, number: { not: null }, status: { not: null } } as const;

type StatsRow = Prisma.IdeaStatsGetPayload<{ select: typeof publicStatsSelect }>;

function toRecord(row: IdeaRow & { stats: StatsRow | null }): Omit<PublicIdeaRecord, "updates" | "rankOf"> {
  const { stats, ...ideaRow } = row;
  const viewed = ideaForViewer(null, ideaRow);
  // Anonymous viewers must get the student shape. Anything else is a bug, not a result.
  if (viewed?.shape !== "student") throw new Error("A public read produced a non-student shape (#60).");
  const { number, status, submittedAt, approvedAt, statusChangedAt, deliveredAt, ...rest } = viewed.idea;
  // The query selects only ideas with both, so a null here is a bug.
  if (number === null || status === null || !stats) {
    throw new Error("A public idea is missing its number, status, or stats row (#60).");
  }
  return {
    idea: {
      ...rest,
      number,
      status,
      submittedAt: iso(submittedAt),
      approvedAt: isoOrNull(approvedAt),
      statusChangedAt: isoOrNull(statusChangedAt),
      deliveredAt: isoOrNull(deliveredAt),
    },
    stats: {
      supportCount: stats.supportCount,
      willingCount: stats.willingCount,
      rankInBoard: stats.rankInBoard,
      lastUpdateAt: isoOrNull(stats.lastUpdateAt),
    },
  };
}

export function publicIdeaQueries(db: Db) {
  return {
    // Every public idea, once, for the wall to filter in the browser. One query.
    async list(): Promise<PublicIdeaRecord[]> {
      const rows = await db.idea.findMany({
        where: publicWhere,
        select: { ...studentIdeaSelect, stats: { select: publicStatsSelect } },
        orderBy: { number: "asc" },
      });
      return rows.map((row) => toRecord({ ...row, boardId: boardCode(row.boardId) }));
    },

    // One idea with its updates and rank, or null when no public idea has that number.
    async byNumber(number: number): Promise<PublicIdeaRecord | null> {
      const row = await db.idea.findFirst({
        where: { ...publicWhere, number },
        select: {
          ...studentIdeaSelect,
          stats: { select: publicStatsSelect },
          updates: { select: publicUpdateSelect, orderBy: { createdAt: "desc" } },
        },
      });
      if (!row) return null;
      const { updates, ...ideaRow } = row;
      const record = toRecord({ ...ideaRow, boardId: boardCode(ideaRow.boardId) });
      // "Of" is a database count over the same view, not computed here.
      const rankOf =
        record.stats.rankInBoard === null
          ? undefined
          : await db.ideaStats.count({
              where: { boardId: ideaRow.boardId, rankInBoard: { not: null } },
            });
      return {
        ...record,
        updates: updates.map((u) => ({ kind: u.kind, body: u.body, createdAt: iso(u.createdAt) })),
        ...(rankOf === undefined ? {} : { rankOf }),
      };
    },
  };
}
