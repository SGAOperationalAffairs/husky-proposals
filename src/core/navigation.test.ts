import { describe, expect, it } from "vitest";
import { navTabsFor } from "./navigation";
import { BOARD_POSITIONS, VP_CAMPUS_AFFAIRS, rolesFromPositions } from "./positions";

// Which tabs each viewer gets (#156).
const viewer = (id: string, positions: string[]) => ({ user: { id }, roles: rolesFromPositions(positions) });
const ids = (v: ReturnType<typeof viewer> | null) => navTabsFor(v).map((t) => t.id);

describe("navTabsFor (#156)", () => {
  it("gives a visitor only Ideas", () => {
    expect(ids(null)).toEqual(["ideas"]);
  });

  it("adds My ideas for a signed-in student, and no leader pages", () => {
    expect(ids(viewer("student", []))).toEqual(["ideas", "me"]);
  });

  it("gives a board chair every leader page", () => {
    expect(ids(viewer("dab-chair", [BOARD_POSITIONS.DAB.lead]))).toEqual([
      "ideas",
      "me",
      "queue",
      "people",
      "updates",
    ]);
  });

  it("gives the VP every leader page", () => {
    expect(ids(viewer("vp", [VP_CAMPUS_AFFAIRS]))).toEqual(["ideas", "me", "queue", "people", "updates"]);
  });
});
