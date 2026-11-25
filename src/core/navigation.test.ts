import { describe, expect, it } from "vitest";
import { LEADER_ROUTES, navTabsFor } from "./navigation";
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

  it("gives an Executive Board member only Ideas and My ideas (#100)", () => {
    expect(ids(viewer("exec", ["executive-vice-president"]))).toEqual(["ideas", "me"]);
  });

  it("gives an Executive Board member who chairs DAB the chair's tabs (#100)", () => {
    expect(ids(viewer("dual", ["speaker-of-the-senate", BOARD_POSITIONS.DAB.lead]))).toEqual([
      "ideas",
      "me",
      "queue",
      "people",
      "updates",
    ]);
  });

  it("links the leader tabs to LEADER_ROUTES, the list the proxy guards (#235)", () => {
    const hrefs = navTabsFor(viewer("vp", [VP_CAMPUS_AFFAIRS])).map((t) => t.href);
    expect(hrefs.slice(2)).toEqual([...LEADER_ROUTES]);
  });
});
