import { addDays, untilText } from "./days";
import { boardsFor, type Viewer } from "./permissions";
import type { BoardCode } from "./boards";

// The People list (#129). Plain rules, no framework: who may see a row, how a participation's
// contact status reads on the list, and the contact date.

// A few days after signing up, a volunteer is due a first contact. The playground sample used
// "a few days"; 3 is our pick until Luis confirms it.
export const CONTACT_DAYS = 3;

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
  return addDays(signedUpAt, CONTACT_DAYS);
}

// The People row's words, from days.ts's UTC day count (#273).
export function contactText(days: number): string {
  return untilText(days, { today: "Contact today", ahead: "Contact in" }).text;
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
export function filterPeople(rows: PersonRow[], filter: PeopleFilter): PersonRow[] {
  return rows
    .filter((r) => inScope(r, filter))
    .filter((r) => filter.status === "all" || toListStatus(r.contactStatus) === filter.status)
    .sort((a, b) => contactBy(a.signedUpAt).getTime() - contactBy(b.signedUpAt).getTime());
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

// The longest mailto link we hand to a mail app (#243). Some handlers (Outlook on Windows among
// them) cut links near 2,083 characters, so 2,000 leaves room. A guess at the weakest handler,
// not a measured limit.
export const MAILTO_MAX_LENGTH = 2000;

// One student can appear once per idea, so the same address can be picked twice. Case-insensitive,
// keeping the first spelling and the list order.
function uniqueAddresses(emails: string[]): string[] {
  const seen = new Set<string>();
  return emails.filter((e) => {
    const key = e.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export type BccMailto = { ok: true; href: string } | { ok: false; error: { code: "empty" | "too_long" } };

// A mailto link with everyone in BCC (RFC 6068), so volunteers do not see each other. No To,
// subject, or body: the leader's own mail app opens and they write it. Nothing is sent from here.
export function bccMailto(emails: string[]): BccMailto {
  const addresses = uniqueAddresses(emails);
  if (addresses.length === 0) return { ok: false, error: { code: "empty" } };
  const href = `mailto:?bcc=${addresses.map(encodeURIComponent).join(",")}`;
  if (href.length > MAILTO_MAX_LENGTH) return { ok: false, error: { code: "too_long" } };
  return { ok: true, href };
}

// The same list for pasting into a mail app's BCC box. Outlook splits on semicolons by default.
export function addressList(emails: string[]): string {
  return uniqueAddresses(emails).join("; ");
}

// The ideas the idea search offers. Each idea once, in number order. With a board chosen, only
// that board's ideas, so the idea list follows the board list.
export type IdeaChoice = { number: number; title: string; board: BoardCode };
export function ideaChoicesFor(rows: PersonRow[], board: BoardCode | "all"): IdeaChoice[] {
  const seen = new Map<number, IdeaChoice>();
  for (const r of rows) {
    if (board !== "all" && r.board !== board) continue;
    if (!seen.has(r.ideaNumber))
      seen.set(r.ideaNumber, { number: r.ideaNumber, title: r.ideaTitle, board: r.board });
  }
  return [...seen.values()].sort((a, b) => a.number - b.number);
}
