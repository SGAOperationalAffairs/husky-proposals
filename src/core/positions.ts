import { BOARD_CODES, type BoardCode } from "./boards";

// SGAuth position keys to boards and roles (#45, docs/sgauth-integration.md,
// "Positions and permissions"). Keys are SGAuth's canonical slugs and never
// change (SGAuth #54), so matching is exact: no trimming, no case folding.
//
// Positions decide permissions only from the live session, never from the
// copy in users.positions_seen (#8).
export const VP_CAMPUS_AFFAIRS = "vice-president-of-campus-affairs";

// A Record over BoardCode, so a sixth board fails to compile until it has keys.
export const BOARD_POSITIONS: Record<BoardCode, { lead: string; member: string }> = {
  DAB: { lead: "chair-of-dining-advisory-board", member: "dining-advisory-board-member" },
  CPAB: {
    lead: "chair-of-campus-planning-advisory-board",
    member: "campus-planning-advisory-board-member",
  },
  CSC: { lead: "director-of-campus-services", member: "campus-services-committee-member" },
  GIB: { lead: "director-of-green-initiatives", member: "green-initiatives-board-member" },
  SC: { lead: "director-of-sustainability", member: "sustainability-committee-member" },
};

// The ten officers in Constitution Article IV (#100). The VP of Campus Affairs is
// on it too; that key also sets vpCampusAffairs, and the VP column is a superset.
export const EXECUTIVE_BOARD_POSITIONS: readonly string[] = [
  "student-body-president",
  "executive-vice-president",
  "speaker-of-the-senate",
  "vice-president-of-academic-affairs",
  VP_CAMPUS_AFFAIRS,
  "vice-president-of-diversity-equity-and-inclusion",
  "vice-president-of-external-affairs",
  "vice-president-of-operational-affairs",
  "vice-president-of-student-involvement",
  "vice-president-of-student-success",
];

export type Roles = {
  vpCampusAffairs: boolean;
  // On the Executive Board (D16 option A). Independent of leads and vpCampusAffairs.
  executiveBoard: boolean;
  // Boards this person reviews posts for and runs (chair or director).
  leads: BoardCode[];
  memberOf: BoardCode[];
};

// Unknown keys are ignored, so they grant nothing beyond student. Never throws.
// Arrays come out in BOARD_CODES order with no repeats.
export function rolesFromPositions(keys: readonly string[]): Roles {
  const held = new Set(keys);
  return {
    vpCampusAffairs: held.has(VP_CAMPUS_AFFAIRS),
    executiveBoard: EXECUTIVE_BOARD_POSITIONS.some((key) => held.has(key)),
    leads: BOARD_CODES.filter((board) => held.has(BOARD_POSITIONS[board].lead)),
    memberOf: BOARD_CODES.filter((board) => held.has(BOARD_POSITIONS[board].member)),
  };
}

// The boards whose posts this person reviews: all five for the VP, otherwise
// the boards they lead.
export function boardsRun(roles: Roles): BoardCode[] {
  return roles.vpCampusAffairs ? [...BOARD_CODES] : roles.leads;
}

// The one place that decides who counts as an SGA leader (PRD D16 option A, decided
// Nov 2, 2026): the VP of Campus Affairs, anyone who leads a board, or anyone on the
// Executive Board. Board members and unmapped SGA positions are not leaders. This
// says who is a leader, not what they may do: pages and tabs ask can() (#100).
export function isSgaLeader(roles: Roles): boolean {
  return roles.vpCampusAffairs || roles.executiveBoard || roles.leads.length > 0;
}
