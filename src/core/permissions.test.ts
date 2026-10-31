import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BOARD_CODES, type BoardCode } from "./boards";
import {
  BOARD_ACTIONS,
  COLUMNS,
  GLOBAL_ACTIONS,
  PERMISSIONS,
  boardsFor,
  can,
  canSeeWhoPosted,
  isAuthor,
  otherLeaderMay,
  type Action,
  type BoardAction,
  type Cell,
  type Column,
  type GlobalAction,
  type Viewer,
} from "./permissions";
import { BOARD_POSITIONS, VP_CAMPUS_AFFAIRS, rolesFromPositions } from "./positions";

const ALL_ACTIONS: readonly Action[] = [...GLOBAL_ACTIONS, ...BOARD_ACTIONS];

function viewer(id: string, positions: string[]): Viewer {
  return { user: { id }, roles: rolesFromPositions(positions) };
}

const visitor: Viewer = null;
const student = viewer("student", []);
const dabMember = viewer("dab-member", [BOARD_POSITIONS.DAB.member]);
const unmapped = viewer("unmapped", ["vice-president-of-finance"]);
const vp = viewer("vp", [VP_CAMPUS_AFFAIRS]);
const vpWhoChairsDab = viewer("vp-dab", [VP_CAMPUS_AFFAIRS, BOARD_POSITIONS.DAB.lead]);
const leads = Object.fromEntries(
  BOARD_CODES.map((b) => [b, viewer(`lead-${b}`, [BOARD_POSITIONS[b].lead])]),
) as Record<BoardCode, Viewer>;
const dabChair = leads.DAB;
const cscChair = leads.CSC;
const twoBoardLead = viewer("two", [BOARD_POSITIONS.DAB.lead, BOARD_POSITIONS.SC.lead]);

const OWN_ACTIONS: BoardAction[] = [
  "review",
  "see_anonymous_author",
  "manage_status",
  "change_cadence",
  "see_people",
];

// The doc's row labels, one per action. A new doc row fails the pin until it is added here.
const ROW_LABELS: Record<string, Action> = {
  "Browse approved ideas": "browse",
  "Post an idea (anonymous optional)": "post",
  "Support, follow, offer to help": "support",
  "See pending posts and decide them": "review",
  "See who posted and who supported": "see_names",
  "See who posted an anonymous idea": "see_anonymous_author",
  "Move an idea through statuses, post updates": "manage_status",
  "Change an idea's board": "change_board",
  "Change a board's update cadence (SGA Options screen)": "change_cadence",
  "See the People list (volunteers)": "see_people",
  "Turn promotion on (admin switch, off by default; later)": "promote",
};

function cellFromDoc(text: string): Cell {
  if (text.startsWith("Yes") || text.startsWith("All boards")) return "yes";
  if (text.startsWith("Own board")) return "own";
  if (text.startsWith("No")) return "no";
  if (text.startsWith("Open")) return "open";
  throw new Error(`Unreadable permissions cell: ${text}`);
}

describe("permissions (#52)", () => {
  describe("the matrix matches the Permissions table in docs/data-model.md", () => {
    const doc = readFileSync("docs/data-model.md", "utf8");
    const section = /\n## Permissions\n([\s\S]*?)\n## /.exec(doc);
    const rows = (section?.[1] ?? "")
      .split("\n")
      .filter((line) => line.startsWith("|"))
      .map((line) =>
        line
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim()),
      );
    const [header, , ...body] = rows;

    it("finds the table", () => {
      expect(section, "Permissions section not found").not.toBeNull();
      expect(header).toHaveLength(6);
    });

    it("has the five viewer columns in order", () => {
      expect(header!.slice(1).map((h) => h.toLowerCase())).toEqual([
        "signed-out visitor",
        "student",
        "chair or director (own board)",
        "vp of campus affairs",
        "other sga leader",
      ]);
      expect([...COLUMNS]).toEqual(["visitor", "student", "boardLead", "vp", "otherLeader"]);
    });

    it("has exactly the rows the module knows", () => {
      expect(body.map((r) => r[0]).sort()).toEqual(Object.keys(ROW_LABELS).sort());
      expect(Object.values(ROW_LABELS).sort()).toEqual([...ALL_ACTIONS].sort());
    });

    it("agrees with every cell", () => {
      for (const row of body) {
        const action = ROW_LABELS[row[0]!]!;
        COLUMNS.forEach((column: Column, i) => {
          expect(PERMISSIONS[action][column], `${row[0]} / ${column}`).toBe(cellFromDoc(row[i + 1]!));
        });
      }
    });

    it("has no own-board cell on a global action", () => {
      for (const action of GLOBAL_ACTIONS) {
        for (const column of COLUMNS) {
          expect(PERMISSIONS[action][column], `${action} / ${column}`).not.toBe("own");
        }
      }
    });

    it("lets a chair see names on every board but the People list only on their own (operator decision)", () => {
      expect(PERMISSIONS.see_names.boardLead, "see_names, chair column, must be Yes (every board)").toBe(
        "yes",
      );
      expect(PERMISSIONS.see_people.boardLead, "see_people, chair column, must be Own board").toBe("own");
    });
  });

  describe("visitors and students", () => {
    it("lets a visitor browse and nothing else", () => {
      for (const action of GLOBAL_ACTIONS) {
        expect(can(visitor, action), action).toBe(action === "browse");
      }
      for (const action of BOARD_ACTIONS) {
        for (const board of BOARD_CODES) expect(can(visitor, action, board), action).toBe(false);
      }
    });

    it("lets a student, a member, and an unmapped position browse, post, and support only", () => {
      for (const v of [student, dabMember, unmapped]) {
        for (const action of GLOBAL_ACTIONS) {
          expect(can(v, action), action).toBe(action !== "promote");
        }
        for (const action of BOARD_ACTIONS) {
          for (const board of BOARD_CODES) expect(can(v, action, board), action).toBe(false);
        }
      }
    });
  });

  describe("a chair or director", () => {
    it("acts on their own board for every board action except changing the board", () => {
      for (const board of BOARD_CODES) {
        for (const action of BOARD_ACTIONS) {
          expect(can(leads[board], action, board), `${board} ${action}`).toBe(action !== "change_board");
        }
      }
    });

    it("browses, posts, and supports but cannot turn promotion on", () => {
      for (const board of BOARD_CODES) {
        expect(can(leads[board], "browse")).toBe(true);
        expect(can(leads[board], "post")).toBe(true);
        expect(can(leads[board], "support")).toBe(true);
        expect(can(leads[board], "promote")).toBe(false);
      }
    });

    it("sees names on another board but changes nothing there (DAB chair on CSC)", () => {
      expect(can(dabChair, "see_names", "CSC")).toBe(true);
      for (const action of [...OWN_ACTIONS, "change_board" as const]) {
        expect(can(dabChair, action, "CSC"), action).toBe(false);
      }
    });

    it("gets exactly their own board from boardsFor, or all five for see_names", () => {
      for (const board of BOARD_CODES) {
        for (const action of OWN_ACTIONS) expect(boardsFor(leads[board], action), action).toEqual([board]);
        expect(boardsFor(leads[board], "change_board")).toEqual([]);
        expect(boardsFor(leads[board], "see_names")).toEqual(BOARD_CODES);
      }
    });

    it("gets both boards when they lead two", () => {
      for (const action of OWN_ACTIONS)
        expect(boardsFor(twoBoardLead, action), action).toEqual(["DAB", "SC"]);
    });
  });

  describe("the VP", () => {
    it("acts on all five boards for every board action and every global action", () => {
      for (const v of [vp, vpWhoChairsDab]) {
        for (const action of GLOBAL_ACTIONS) expect(can(v, action), action).toBe(true);
        for (const action of BOARD_ACTIONS) {
          expect(boardsFor(v, action), action).toEqual(BOARD_CODES);
          for (const board of BOARD_CODES) expect(can(v, action, board), `${board} ${action}`).toBe(true);
        }
      }
    });
  });

  describe("other leaders (D16, Open)", () => {
    it("answers no for every action through one function", () => {
      for (const action of ALL_ACTIONS) expect(otherLeaderMay(action), action).toBe(false);
    });

    it("pins the Open cells in the matrix", () => {
      for (const action of ["review", "see_names", "see_people"] as const) {
        expect(PERMISSIONS[action].otherLeader, action).toBe("open");
      }
    });
  });

  describe("who may see who posted", () => {
    const anonymousDab = { boardId: "DAB" as const, isAnonymous: true };
    const openDab = { boardId: "DAB" as const, isAnonymous: false };

    it("shows an anonymous author only to the board's chair and the VP", () => {
      expect(canSeeWhoPosted(dabChair, anonymousDab)).toBe(true);
      expect(canSeeWhoPosted(vp, anonymousDab)).toBe(true);
      expect(canSeeWhoPosted(vpWhoChairsDab, anonymousDab)).toBe(true);
      for (const v of [cscChair, student, dabMember, unmapped, visitor]) {
        expect(canSeeWhoPosted(v, anonymousDab)).toBe(false);
      }
    });

    it("does not show an anonymous author to the author, who is a student", () => {
      const author = viewer("author", []);
      expect(isAuthor(author, { authorId: "author" })).toBe(true);
      expect(canSeeWhoPosted(author, anonymousDab)).toBe(false);
    });

    it("shows a named author to any chair and the VP", () => {
      for (const v of [dabChair, cscChair, vp]) expect(canSeeWhoPosted(v, openDab)).toBe(true);
      for (const v of [student, dabMember, unmapped, visitor]) {
        expect(canSeeWhoPosted(v, openDab)).toBe(false);
      }
    });

    it("keeps supporter access from leaking an anonymous author", () => {
      expect(can(cscChair, "see_names", "DAB")).toBe(true);
      expect(canSeeWhoPosted(cscChair, anonymousDab)).toBe(false);
    });
  });

  describe("author", () => {
    const author = viewer("author", []);

    it("matches only the same user id", () => {
      expect(isAuthor(author, { authorId: "author" })).toBe(true);
      expect(isAuthor(student, { authorId: "author" })).toBe(false);
      expect(isAuthor(visitor, { authorId: "author" })).toBe(false);
    });

    it("never matches a deleted account", () => {
      expect(isAuthor(author, { authorId: null })).toBe(false);
    });

    it("grants nothing in the table", () => {
      for (const action of ["review", "see_names", "manage_status"] as const) {
        expect(can(author, action, "DAB"), action).toBe(false);
      }
    });
  });

  it("types actions as global or board", () => {
    const global: GlobalAction = "browse";
    expect(can(visitor, global)).toBe(true);
  });
});
