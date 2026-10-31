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

export type Roles = {
  vpCampusAffairs: boolean;
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
    leads: BOARD_CODES.filter((board) => held.has(BOARD_POSITIONS[board].lead)),
    memberOf: BOARD_CODES.filter((board) => held.has(BOARD_POSITIONS[board].member)),
  };
}

// The boards whose posts this person reviews: all five for the VP, otherwise
// the boards they lead.
export function boardsRun(roles: Roles): BoardCode[] {
  return roles.vpCampusAffairs ? [...BOARD_CODES] : roles.leads;
}

// The one place that decides who counts as an SGA leader, who may see who
// posted and who supported (PRD D16, still open). For now: the VP or anyone
// who leads a board. Board members and unmapped SGA positions are not leaders.
// If D16 widens this, only this function changes. Callers never re-derive it.
export function isSgaLeader(roles: Roles): boolean {
  return roles.vpCampusAffairs || roles.leads.length > 0;
}
