import { describe, expect, it } from "vitest";
import { IDEAS } from "@/playground/sample";
import { parseIdeasQuery } from "./filter";
import { listIdeas, sampleGetIdea, sampleListWall } from "./sample";

// The stand-in data that local and test use when there is no database (#60).
describe("idea page stand-in (#62)", () => {
  it("finds an idea by its public number, and nothing for an unknown one", () => {
    expect(sampleGetIdea(131)?.title).toBe("A late-night dining option on weeknights");
    expect(sampleGetIdea(9999)).toBeUndefined();
  });

  it("names the author only when the post is not anonymous", () => {
    const named = sampleGetIdea(131)!;
    expect(named.author).toBe("Jordan P.");
    const anonymous = sampleGetIdea(151)!;
    expect("author" in anonymous).toBe(false);
  });

  it("ranks an idea among its board's ideas that are not delivered", () => {
    expect(sampleGetIdea(103)?.rank).toEqual({ position: 1, of: 3, board: "Dining" });
    expect(sampleGetIdea(131)?.rank).toEqual({ position: 2, of: 3, board: "Dining" });
    expect(sampleGetIdea(174)?.rank).toEqual({ position: 3, of: 3, board: "Dining" });
  });

  it("always gives a waiting idea its reason", () => {
    expect(sampleGetIdea(140)?.waitingReason).toBeTruthy();
  });

  // One invented closed idea (#237): off the wall, but its page loads by number.
  it("has a closed idea with its reason, no rank, and no place on the wall", () => {
    const closed = sampleGetIdea(121);
    expect(closed).toMatchObject({
      status: "closed",
      board: "GIB",
      title: "Solar charging benches on the quad",
      supportCount: 34,
      willingCount: 6,
      closedReason: "Facilities is not adding new outdoor power this year",
    });
    expect(closed?.rank).toBeUndefined();
    expect(sampleListWall().map((i) => i.number)).not.toContain(121);
    expect(sampleListWall().map((i) => i.status)).not.toContain("closed");
  });
});

describe("ideas list stand-in (#61)", () => {
  // One list (#55): open and picked-up ideas share it, so a student sees every
  // idea in one place. Picked-up ideas get a mark, not a separate tab.
  it("shows every public idea, open and picked up, most supported first", () => {
    const ideas = listIdeas(parseIdeasQuery({}));
    expect(new Set(ideas.map((i) => i.status))).toEqual(
      new Set(["collecting_support", "in_progress", "waiting", "delivered"]),
    );
    const counts = ideas.map((i) => i.supportCount);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  it("filters by board, status, and search words", () => {
    expect(listIdeas(parseIdeasQuery({ board: "GIB" })).every((i) => i.board === "GIB")).toBe(true);
    expect(listIdeas(parseIdeasQuery({ status: "waiting" })).every((i) => i.status === "waiting")).toBe(true);
    const found = listIdeas(parseIdeasQuery({ q: "  WALK signal " }));
    expect(found.map((i) => i.number)).toEqual([151]);
  });

  it("sorts newest first by proposal number", () => {
    const numbers = listIdeas(parseIdeasQuery({ sort: "newest" })).map((i) => i.number);
    expect(numbers).toEqual([...numbers].sort((a, b) => b - a));
  });

  it("ignores values it does not know instead of failing", () => {
    expect(parseIdeasQuery({ board: "XYZ", status: "nope", sort: "random", q: ["a", "b"] })).toEqual({
      sort: "support",
    });
  });

  it("filters by any status, including in progress and delivered", () => {
    expect(
      listIdeas(parseIdeasQuery({ status: "in_progress" })).every((i) => i.status === "in_progress"),
    ).toBe(true);
    expect(listIdeas(parseIdeasQuery({ status: "delivered" })).length).toBeGreaterThan(0);
  });
});

describe("the wall's stand-in data (#61, #55)", () => {
  it("sends the wall all its public ideas once, for the browser to filter", () => {
    expect(sampleListWall()).toHaveLength(IDEAS.length);
  });

  it("does not put the closed idea in any filtered list either (#237)", () => {
    expect(listIdeas(parseIdeasQuery({})).map((i) => i.number)).not.toContain(121);
  });
});
