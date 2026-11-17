import type { ContactStore } from "@/app/_people/setContactStatus";
import type { BoardCode } from "@/core/boards";
import type { ContactStatus, PersonRow } from "@/core/people";
import type { Prisma } from "@/generated/prisma/client";
import { isPublic } from "./ideaSelects";

// The People list's data (#129). The only place names and emails are read. Every field is listed
// here explicitly, never a whole row, so a student shape can never pick these up by accident.
type Db = Pick<Prisma.TransactionClient, "participation">;

export const peopleSelect = {
  userId: true,
  ideaId: true,
  contactStatus: true,
  createdAt: true,
  contactedAt: true,
  user: { select: { displayName: true, email: true } },
  idea: { select: { number: true, title: true, boardId: true } },
} as const satisfies Prisma.ParticipationSelect;

type Loaded = Prisma.ParticipationGetPayload<{ select: typeof peopleSelect }>;

function toRow(p: Loaded): PersonRow | null {
  // A participation on an idea with no public number is not on the list yet.
  if (p.idea.number === null) return null;
  return {
    userId: p.userId,
    ideaId: p.ideaId,
    ideaNumber: p.idea.number,
    ideaTitle: p.idea.title,
    board: p.idea.boardId as BoardCode,
    name: p.user.displayName,
    email: p.user.email,
    contactStatus: p.contactStatus as ContactStatus,
    signedUpAt: p.createdAt,
    contactedAt: p.contactedAt,
  };
}

// Only approved ideas, and only the boards the caller is allowed to see. Callers pass the boards
// from peopleForViewer's permission check, so the query never reads other boards.
export async function listPeople(db: Db, boards: BoardCode[]): Promise<PersonRow[]> {
  if (boards.length === 0) return [];
  const found = await db.participation.findMany({
    where: { idea: { ...isPublic, boardId: { in: boards } } },
    select: peopleSelect,
    orderBy: { createdAt: "asc" },
  });
  return found.map(toRow).filter((r): r is PersonRow => r !== null);
}

export function prismaContactStore(db: Db): ContactStore {
  return {
    findParticipation: async (userId, ideaId) => {
      const row = await db.participation.findUnique({
        where: { userId_ideaId: { userId, ideaId } },
        select: { idea: { select: { boardId: true } } },
      });
      return row ? { boardId: row.idea.boardId as BoardCode } : null;
    },
    setStatus: async (userId, ideaId, status) => {
      // Back to To contact clears the contact date, so the row reads as never contacted.
      await db.participation.update({
        where: { userId_ideaId: { userId, ideaId } },
        data: { contactStatus: status, ...(status === "new" ? { contactedAt: null } : {}) },
      });
    },
  };
}
