import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BOARD_CODES, type BoardCode } from "./boards";
import {
  BOARD_POSITIONS,
  EXECUTIVE_BOARD_POSITIONS,
  VP_CAMPUS_AFFAIRS,
  boardsRun,
  isSgaLeader,
  rolesFromPositions,
} from "./positions";

const NONE = { vpCampusAffairs: false, executiveBoard: false, leads: [], memberOf: [] };

describe("position-to-role mapping (#45)", () => {
  it("maps each board's lead key to leading that board only", () => {
    for (const board of BOARD_CODES) {
      const roles = rolesFromPositions([BOARD_POSITIONS[board].lead]);
      expect(roles, board).toEqual({
        vpCampusAffairs: false,
        executiveBoard: false,
        leads: [board],
        memberOf: [],
      });
      expect(boardsRun(roles), board).toEqual([board]);
    }
  });

  it("maps each board's member key to membership only, which runs nothing", () => {
    for (const board of BOARD_CODES) {
      const roles = rolesFromPositions([BOARD_POSITIONS[board].member]);
      expect(roles, board).toEqual({
        vpCampusAffairs: false,
        executiveBoard: false,
        leads: [],
        memberOf: [board],
      });
      expect(boardsRun(roles), board).toEqual([]);
    }
  });

  it("maps the VP to all five boards", () => {
    const roles = rolesFromPositions([VP_CAMPUS_AFFAIRS]);
    expect(roles).toEqual({ vpCampusAffairs: true, executiveBoard: true, leads: [], memberOf: [] });
    expect(boardsRun(roles)).toEqual(BOARD_CODES);
  });

  it("maps each Executive Board key to executiveBoard, which runs nothing by itself (#100)", () => {
    for (const key of EXECUTIVE_BOARD_POSITIONS) {
      const roles = rolesFromPositions([key]);
      expect(roles.executiveBoard, key).toBe(true);
      expect(roles.vpCampusAffairs, key).toBe(key === VP_CAMPUS_AFFAIRS);
      expect(roles.leads, key).toEqual([]);
      if (key !== VP_CAMPUS_AFFAIRS) expect(boardsRun(roles), key).toEqual([]);
    }
  });

  it("does not put a board member, another VP, or the parliamentarian on the Executive Board", () => {
    for (const key of [BOARD_POSITIONS.DAB.member, "vice-president-of-finance", "parliamentarian"]) {
      expect(rolesFromPositions([key]).executiveBoard, key).toBe(false);
    }
  });

  it("keeps both roles for a person on the Executive Board who chairs a board", () => {
    const roles = rolesFromPositions(["speaker-of-the-senate", BOARD_POSITIONS.DAB.lead]);
    expect(roles.executiveBoard).toBe(true);
    expect(roles.leads).toEqual(["DAB"]);
    expect(boardsRun(roles)).toEqual(["DAB"]);
  });

  it("grants nothing beyond student for an unknown key, an empty list, different case, or whitespace", () => {
    expect(rolesFromPositions(["vice-president-of-finance"])).toEqual(NONE);
    expect(rolesFromPositions([])).toEqual(NONE);
    expect(rolesFromPositions(["Chair-Of-Dining-Advisory-Board"])).toEqual(NONE);
    expect(rolesFromPositions([" chair-of-dining-advisory-board"])).toEqual(NONE);
    expect(rolesFromPositions(["chair-of-dining-advisory-board "])).toEqual(NONE);
  });

  it("lets a user holding two board leads run both, in board order", () => {
    const roles = rolesFromPositions([
      BOARD_POSITIONS.SC.lead,
      BOARD_POSITIONS.DAB.lead,
      BOARD_POSITIONS.DAB.member,
    ]);
    expect(roles.leads).toEqual(["DAB", "SC"]);
    expect(roles.memberOf).toEqual(["DAB"]);
    expect(boardsRun(roles)).toEqual(["DAB", "SC"]);
  });

  it("does not repeat a board when a key is listed twice", () => {
    const roles = rolesFromPositions([BOARD_POSITIONS.GIB.lead, BOARD_POSITIONS.GIB.lead]);
    expect(roles.leads).toEqual(["GIB"]);
  });

  it("ignores unknown keys beside real ones", () => {
    const roles = rolesFromPositions(["something-else", BOARD_POSITIONS.CSC.lead]);
    expect(roles.leads).toEqual(["CSC"]);
  });
});

describe("who counts as an SGA leader, the one D16 function (#45)", () => {
  it("is true for every Executive Board key (D16 option A, #100)", () => {
    for (const key of EXECUTIVE_BOARD_POSITIONS)
      expect(isSgaLeader(rolesFromPositions([key])), key).toBe(true);
  });

  it("is true for the VP and for a board lead", () => {
    expect(isSgaLeader(rolesFromPositions([VP_CAMPUS_AFFAIRS]))).toBe(true);
    for (const board of BOARD_CODES) {
      expect(isSgaLeader(rolesFromPositions([BOARD_POSITIONS[board].lead])), board).toBe(true);
    }
  });

  it("is false for a student, a board member, and an unmapped position", () => {
    expect(isSgaLeader(rolesFromPositions([]))).toBe(false);
    expect(isSgaLeader(rolesFromPositions([BOARD_POSITIONS.DAB.member]))).toBe(false);
    expect(isSgaLeader(rolesFromPositions(["vice-president-of-finance"]))).toBe(false);
  });
});

describe("the key table matches docs/sgauth-integration.md (#45)", () => {
  it("has exactly the backticked keys in the Positions and permissions table", () => {
    const doc = readFileSync("docs/sgauth-integration.md", "utf8");
    const section = /## Positions and permissions([\s\S]*?)\n## /.exec(doc);
    expect(section, "Positions and permissions section not found").not.toBeNull();
    const rows = section![1]!.split("\n").filter((line) => line.startsWith("|"));
    const documented = rows.flatMap((row) => Array.from(row.matchAll(/`([a-z-]+)`/g), (m) => m[1]!));
    // Sets, since EXECUTIVE_BOARD_POSITIONS repeats the VP key (#100).
    const inCode = new Set([
      VP_CAMPUS_AFFAIRS,
      ...EXECUTIVE_BOARD_POSITIONS,
      ...BOARD_CODES.flatMap((b: BoardCode) => [BOARD_POSITIONS[b].lead, BOARD_POSITIONS[b].member]),
    ]);
    expect(new Set(documented)).toEqual(inCode);
  });
});
