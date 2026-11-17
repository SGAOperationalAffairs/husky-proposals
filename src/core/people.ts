import { boardsFor, type Viewer } from "./permissions";
import type { BoardCode } from "./boards";

// The People list (#129). Plain rules, no framework: who may see a row, how a participation's
// contact status reads on the list, and the contact date.

// A few days after signing up, a volunteer is due a first contact. The playground sample used
// "a few days"; 3 is our pick until Luis confirms it.
export const CONTACT_DAYS = 3;
const DAY = 24 * 60 * 60 * 1000;

export type ContactStatus = "new" | "contacted" | "joined" | "later";
export type ListStatus = "to_contact" | "contacted" | "joined" | "not_now";

// The leader's view of one volunteer. Built only from an explicit Prisma select (src/db/peopleStore.ts),
// so a student shape can never receive these fields.
export type PersonRow = {
  userId: string;
  ideaId: string;
  ideaNumber: number;
  ideaTitle: string;
  board: BoardCode;
  name: string;
  email: string;
  contactStatus: ContactStatus;
  signedUpAt: Date;
  contactedAt: Date | null;
};

export function toListStatus(status: ContactStatus): ListStatus {
  switch (status) {
    case "new":
      return "to_contact";
    case "contacted":
      return "contacted";
    case "joined":
      return "joined";
    case "later":
      return "not_now";
  }
}

export function contactBy(signedUpAt: Date): Date {
  return new Date(signedUpAt.getTime() + CONTACT_DAYS * DAY);
}

// Days until the contact date. Negative means it has passed.
export function daysUntil(date: Date, now: Date): number {
  return Math.round((date.getTime() - now.getTime()) / DAY);
}

// Only the boards this viewer may see the People list for. A student, a visitor, or a leader with
// no board gets nothing. Rows for another board never leave the server.
export function peopleForViewer(viewer: Viewer, rows: PersonRow[]): PersonRow[] {
  const allowed = new Set<BoardCode>(boardsFor(viewer, "see_people"));
  return rows.filter((r) => allowed.has(r.board));
}

export type PeopleFilter = {
  status: ListStatus | "all";
  idea: string; // "all" or the idea number as text
  board: BoardCode | "all";
};

function inScope(row: PersonRow, filter: Pick<PeopleFilter, "idea" | "board">): boolean {
  return (
    (filter.board === "all" || row.board === filter.board) &&
    (filter.idea === "all" || String(row.ideaNumber) === filter.idea)
  );
}

// Overdue first (a contact date already passed), then the nearest contact date.
export function filterPeople(rows: PersonRow[], filter: PeopleFilter, now: Date): PersonRow[] {
  return rows
    .filter((r) => inScope(r, filter))
    .filter((r) => filter.status === "all" || toListStatus(r.contactStatus) === filter.status)
    .sort((a, b) => daysUntil(contactBy(a.signedUpAt), now) - daysUntil(contactBy(b.signedUpAt), now));
}

// Counts for the filter labels. They follow the idea and board the leader has picked, so the
// numbers match the list they sit beside.
export function countByStatus(
  rows: PersonRow[],
  scope: Pick<PeopleFilter, "idea" | "board">,
): Record<ListStatus | "all", number> {
  const counts: Record<ListStatus | "all", number> = {
    to_contact: 0,
    contacted: 0,
    joined: 0,
    not_now: 0,
    all: 0,
  };
  for (const r of rows) {
    if (!inScope(r, scope)) continue;
    counts[toListStatus(r.contactStatus)] += 1;
    counts.all += 1;
  }
  return counts;
}
