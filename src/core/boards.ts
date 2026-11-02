// The five Campus Affairs boards (CLAUDE.md, "Scope"). Shared by the UI and,
// from E2, the rules module. `color` names the board's color token in
// design/tokens.css (--board-<color> and --on-board-<color>).
export type BoardCode = "DAB" | "CPAB" | "CSC" | "GIB" | "SC";

export type Board = {
  code: BoardCode;
  name: string;
  category: string;
  // What the board does, in one plain line, for the post form's tiles.
  description: string;
  color: "dining" | "planning" | "services" | "green" | "sust";
};

// One plain line per category, for the post form's tiles. Each line is about the
// subject (the category), not the board that handles it. Wording to be confirmed
// by SGA before launch (#55).
export const BOARD_DESCRIPTIONS: Record<BoardCode, string> = {
  DAB: "Meals, dining halls, and food on campus.",
  CPAB: "Buildings, outdoor spaces, and how campus is laid out.",
  CSC: "Everyday services on campus, like facilities, mail, and IT.",
  GIB: "Projects that make campus greener, like energy, water, and waste.",
  SC: "Long-term goals for sustainability and climate on campus.",
};

export const BOARDS: Record<BoardCode, Board> = {
  DAB: {
    code: "DAB",
    name: "Dining Advisory Board",
    category: "Dining",
    description: BOARD_DESCRIPTIONS.DAB,
    color: "dining",
  },
  CPAB: {
    code: "CPAB",
    name: "Campus Planning Advisory Board",
    category: "Campus Planning",
    description: BOARD_DESCRIPTIONS.CPAB,
    color: "planning",
  },
  CSC: {
    code: "CSC",
    name: "Campus Services Committee",
    category: "Campus Services",
    description: BOARD_DESCRIPTIONS.CSC,
    color: "services",
  },
  GIB: {
    code: "GIB",
    name: "Green Initiatives Board",
    category: "Green Initiatives",
    description: BOARD_DESCRIPTIONS.GIB,
    color: "green",
  },
  SC: {
    code: "SC",
    name: "Sustainability Committee",
    category: "Sustainability",
    description: BOARD_DESCRIPTIONS.SC,
    color: "sust",
  },
};

export const BOARD_CODES = Object.keys(BOARDS) as BoardCode[];
