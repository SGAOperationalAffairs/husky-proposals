// The five Campus Affairs boards (CLAUDE.md, "Scope"). Shared by the UI and,
// from E2, the rules module. `color` names the board's color token in
// design/tokens.css (--board-<color> and --on-board-<color>).
export type BoardCode = "DAB" | "CPAB" | "CSC" | "GIB" | "SC";

export type Board = {
  code: BoardCode;
  name: string;
  category: string;
  color: "dining" | "planning" | "services" | "green" | "sust";
};

export const BOARDS: Record<BoardCode, Board> = {
  DAB: { code: "DAB", name: "Dining Advisory Board", category: "Dining", color: "dining" },
  CPAB: {
    code: "CPAB",
    name: "Campus Planning Advisory Board",
    category: "Campus Planning",
    color: "planning",
  },
  CSC: { code: "CSC", name: "Campus Services Committee", category: "Campus Services", color: "services" },
  GIB: { code: "GIB", name: "Green Initiatives Board", category: "Green Initiatives", color: "green" },
  SC: { code: "SC", name: "Sustainability Committee", category: "Sustainability", color: "sust" },
};

export const BOARD_CODES = Object.keys(BOARDS) as BoardCode[];
