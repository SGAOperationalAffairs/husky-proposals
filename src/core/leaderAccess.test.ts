import { describe, expect, it } from "vitest";
import { isLeaderRoute, leaderMayEnter } from "./leaderAccess";
import { BOARD_POSITIONS, VP_CAMPUS_AFFAIRS, rolesFromPositions } from "./positions";

describe("isLeaderRoute (#235)", () => {
  it.each(["/queue", "/people", "/updates", "/queue/"])("matches %s", (path) => {
    expect(isLeaderRoute(path)).toBe(true);
  });

  it.each(["/", "/me", "/queuex", "/queue/x", "/ideas/103", "//"])("does not match %s", (path) => {
    expect(isLeaderRoute(path)).toBe(false);
  });
});

describe("leaderMayEnter (#235)", () => {
  it("turns a signed-out visitor away", () => {
    expect(leaderMayEnter(null)).toBe(false);
  });

  it.each([
    ["a student", []],
    ["a board member", [BOARD_POSITIONS.DAB.member]],
    ["an unrelated position", ["some-other-position"]],
  ])("turns %s away", (_who, positions) => {
    expect(leaderMayEnter(rolesFromPositions(positions))).toBe(false);
  });

  it.each([
    ["a chair", [BOARD_POSITIONS.DAB.lead]],
    ["a director", [BOARD_POSITIONS.CSC.lead]],
    ["the VP", [VP_CAMPUS_AFFAIRS]],
  ])("lets %s in", (_who, positions) => {
    expect(leaderMayEnter(rolesFromPositions(positions))).toBe(true);
  });
});
