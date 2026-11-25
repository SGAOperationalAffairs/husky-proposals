import { BOARD_CODES, type BoardCode } from "./boards";
import type { Roles } from "./positions";

// Who may do what (#52). One function, `can()`, answers whether a viewer may take
// an action, built from the Permissions table in docs/data-model.md (a test pins
// every cell).
//
// This module decides the viewer's side only. Whether the post's state allows the
// action (approved, pending, own post) stays in review.ts (#50) and ideaStatus.ts
// (#51); what is public is #53's `isPublic`; viewer shapes are #53. Leader actions
// failing closed on a stale session is the session module's job (T2.5), not this one.

// Typed structurally so a Session from src/auth/contract.ts passes straight in,
// without core importing @/auth. `null` is a signed-out visitor.
export type Viewer = { user: { id: string }; roles: Roles } | null;

// One entry per table row, commented with the row text.
export const GLOBAL_ACTIONS = [
  "browse", // Browse approved ideas
  "post", // Post an idea (anonymous optional)
  "support", // Support, follow, offer to help
  "promote", // Turn promotion on (admin switch)
] as const;

export const BOARD_ACTIONS = [
  "review", // See pending posts and decide them
  "see_names", // See who posted and who supported
  "see_anonymous_author", // See who posted an anonymous idea
  "manage_status", // Move an idea through statuses, post updates
  "change_board", // Change an idea's board
  "change_cadence", // Change a board's update cadence
  "change_review_due", // Change a board's review due time
  "see_people", // See the People list (volunteers)
] as const;

export type GlobalAction = (typeof GLOBAL_ACTIONS)[number];
export type BoardAction = (typeof BOARD_ACTIONS)[number];
export type Action = GlobalAction | BoardAction;

// In the table's column order.
export const COLUMNS = ["visitor", "student", "boardLead", "vp", "otherLeader"] as const;
export type Column = (typeof COLUMNS)[number];

// "yes" is every board, "own" only a board the viewer leads, "open" is undecided (D16).
export type Cell = "yes" | "no" | "own" | "open";

function row(visitor: Cell, student: Cell, boardLead: Cell, vp: Cell, otherLeader: Cell) {
  return { visitor, student, boardLead, vp, otherLeader } satisfies Record<Column, Cell>;
}

// A Record, so a new action or column fails to compile.
export const PERMISSIONS: Record<Action, Record<Column, Cell>> = {
  browse: row("yes", "yes", "yes", "yes", "yes"),
  post: row("no", "yes", "yes", "yes", "yes"),
  support: row("no", "yes", "yes", "yes", "yes"),
  promote: row("no", "no", "no", "yes", "no"),
  // CLAUDE.md names the reviewers: the board's chair or director and the VP (#100).
  review: row("no", "no", "own", "yes", "no"),
  // D16 option A (chosen Nov 2, 2026): a chair or director sees names only for their
  // own board (#59), and the Executive Board sees them on every board (#100).
  see_names: row("no", "no", "own", "yes", "yes"),
  see_anonymous_author: row("no", "no", "own", "yes", "no"),
  manage_status: row("no", "no", "own", "yes", "no"),
  change_board: row("no", "no", "no", "yes", "no"),
  change_cadence: row("no", "no", "own", "yes", "no"),
  change_review_due: row("no", "no", "own", "yes", "no"),
  see_people: row("no", "no", "own", "yes", "open"),
};

// Every column the viewer holds. Roles combine (#100): someone on the Executive Board
// who also chairs DAB gets what each column allows. Union only grants, since no cell
// says "deny" and the student column is a subset of every leader column.
// Board members and unmapped positions are students (data-model gap 8).
//
// "otherLeader" reads executiveBoard, never isSgaLeader: isSgaLeader includes leads,
// and that would give every chair see_names on all five boards.
export function columnsFor(viewer: Viewer): Column[] {
  if (viewer === null) return ["visitor"];
  const columns: Column[] = ["student"];
  if (viewer.roles.leads.length > 0) columns.push("boardLead");
  if (viewer.roles.vpCampusAffairs) columns.push("vp");
  if (viewer.roles.executiveBoard) columns.push("otherLeader");
  return columns;
}

// The one place that decides what an "Open" cell grants (PRD D16, #52). The People
// list for the Executive Board stays open until #291, so this still answers no.
export function otherLeaderMay(action: Action): boolean {
  void action;
  return false;
}

function cellAllows(cell: Cell, viewer: Viewer, action: Action, board: BoardCode | undefined): boolean {
  switch (cell) {
    case "yes":
      return true;
    case "no":
      return false;
    case "own":
      return viewer !== null && board !== undefined && viewer.roles.leads.includes(board);
    case "open":
      return otherLeaderMay(action);
  }
}

// Returns a boolean, not a result: nothing to write. Callers turn false into their
// own error code. Never throws.
export function can(viewer: Viewer, action: GlobalAction): boolean;
export function can(viewer: Viewer, action: BoardAction, board: BoardCode): boolean;
export function can(viewer: Viewer, action: Action, board?: BoardCode): boolean {
  return columnsFor(viewer).some((column) => cellAllows(PERMISSIONS[action][column], viewer, action, board));
}

// For the queue's board filter and "which boards can I review". Use this, not
// boardsRun, when the question is about an action.
export function boardsFor(viewer: Viewer, action: BoardAction): BoardCode[] {
  return BOARD_CODES.filter((board) => can(viewer, action, board));
}

// Leader access to the author's identity. `can(viewer, "see_names", board)` is for
// supporters: using it alone for the author would show an anonymous author to a
// chair from another board. The author always goes through here. A named author's
// public display name is #53's call (gap 6), not this function's.
export function canSeeWhoPosted(viewer: Viewer, idea: { boardId: BoardCode; isAnonymous: boolean }): boolean {
  return can(viewer, idea.isAnonymous ? "see_anonymous_author" : "see_names", idea.boardId);
}

// A null author (deleted account, D14) never matches. Being the author grants
// nothing in the table; withdraw and resubmit stay in review.ts (#50).
export function isAuthor(viewer: Viewer, idea: { authorId: string | null }): boolean {
  return viewer !== null && idea.authorId !== null && viewer.user.id === idea.authorId;
}
